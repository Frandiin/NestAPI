import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneratedReport } from '../finance/entities/generated-report.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { Budget } from '../finance/entities/budget.entity';
import { AiAnalysis } from '../finance/entities/ai-analysis.entity';

export const TASKS_QUEUE_NAME = 'tasks-queue';

@Processor(TASKS_QUEUE_NAME)
@Injectable()
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    @InjectRepository(GeneratedReport)
    private readonly reportRepo: Repository<GeneratedReport>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(AiAnalysis)
    private readonly analysisRepo: Repository<AiAnalysis>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`[Processando Job] ID: ${job.id} | Nome: ${job.name}`);

    switch (job.name) {
      case 'ai_monthly_summary':
        return this.processAiMonthlySummary(job);
      case 'ai_forecast':
        return this.processAiForecast(job);
      case 'ai_tips':
        return this.processAiTips(job);
      case 'ai_detection':
        return this.processAiDetection(job);
      case 'ai_comparison':
        return this.processAiComparison(job);
      case 'report_monthly':
        return this.processReportMonthly(job);
      case 'report_annual':
        return this.processReportAnnual(job);
      case 'report_extract':
        return this.processReportExtract(job);
      case 'report_receipt':
        return this.processReportReceipt(job);
      default:
        this.logger.warn(`Job type unknown: ${job.name}`);
        return { success: true, processedAt: new Date() };
    }
  }

  private async processAiMonthlySummary(job: Job): Promise<any> {
    const { userId, month, year } = job.data;

    const { Between } = require('typeorm');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const transactions = await this.transactionRepo.find({
      where: { userId, date: Between(startDate, endDate) },
      relations: { category: true },
    });

    const income = transactions.filter((t) => t.type === 'income');
    const expenses = transactions.filter((t) => t.type === 'expense');

    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

    const byCategory = expenses.reduce((acc, t) => {
      const cat = t.category?.name || 'Outros';
      acc[cat] = (acc[cat] || 0) + Number(t.amount);
      return acc;
    }, {});

    const result = {
      summary: `Mes ${month}/${year}: Receitas R$${totalIncome.toFixed(2)}, Despesas R$${totalExpense.toFixed(2)}, Saldo R$${(totalIncome - totalExpense).toFixed(2)}`,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactions.length,
      byCategory,
    };

    const analysis = this.analysisRepo.create({
      userId,
      type: 'monthly_summary' as any,
      period: `${month}/${year}`,
      result,
    });
    await this.analysisRepo.save(analysis);

    this.logger.log(`[Job Concluido] ID: ${job.id}`);
    return result;
  }

  private async processAiForecast(job: Job): Promise<any> {
    const { userId, months } = job.data;
    const { MoreThanOrEqual } = require('typeorm');

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const transactions = await this.transactionRepo.find({
      where: { userId, date: MoreThanOrEqual(startDate) },
      relations: { category: true },
    });

    const monthlyData = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
      if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 };
      if (t.type === 'income') monthlyData[key].income += Number(t.amount);
      else monthlyData[key].expense += Number(t.amount);
    });

    const values = Object.values(monthlyData) as any[];
    const avgIncome = values.length > 0 ? values.reduce((s, v) => s + v.income, 0) / values.length : 0;
    const avgExpense = values.length > 0 ? values.reduce((s, v) => s + v.expense, 0) / values.length : 0;

    const forecast: Array<{ month: string; predictedIncome: number; predictedExpense: number; confidence: number }> = [];
    for (let i = 1; i <= months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      forecast.push({
        month: `${d.getMonth() + 1}/${d.getFullYear()}`,
        predictedIncome: Math.round(avgIncome * 100) / 100,
        predictedExpense: Math.round(avgExpense * 100) / 100,
        confidence: 70,
      });
    }

    const result = { forecast, trend: 'estavel', suggestion: 'Manter padrao de gastos atual' };

    const analysis = this.analysisRepo.create({
      userId,
      type: 'forecast' as any,
      period: `${months} meses`,
      result,
    });
    await this.analysisRepo.save(analysis);

    this.logger.log(`[Job Concluido] ID: ${job.id}`);
    return result;
  }

  private async processAiTips(job: Job): Promise<any> {
    const { userId } = job.data;
    const { MoreThanOrEqual } = require('typeorm');

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const transactions = await this.transactionRepo.find({
      where: { userId, date: MoreThanOrEqual(startDate), type: 'expense' as any },
      relations: { category: true },
    });

    const byCategory = {};
    transactions.forEach((t) => {
      const cat = t.category?.name || 'Outros';
      byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
    });

    const sorted = Object.entries(byCategory).sort((a, b) => (b[1] as number) - (a[1] as number));
    const tips = sorted.slice(0, 5).map(([cat, amount]) => ({
      category: cat,
      tip: `Considere reduzir gastos em ${cat}`,
      potentialSavings: Math.round((amount as number) * 0.1 * 100) / 100,
    }));

    const totalSavings = tips.reduce((sum, t) => sum + t.potentialSavings, 0);
    const result = { tips, totalPotentialSavings: totalSavings, priority: 'media' };

    const analysis = this.analysisRepo.create({
      userId,
      type: 'tips' as any,
      period: 'ultimos 3 meses',
      result,
    });
    await this.analysisRepo.save(analysis);

    this.logger.log(`[Job Concluido] ID: ${job.id}`);
    return result;
  }

  private async processAiDetection(job: Job): Promise<any> {
    const { userId } = job.data;
    const { MoreThanOrEqual } = require('typeorm');

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const transactions = await this.transactionRepo.find({
      where: { userId, date: MoreThanOrEqual(startDate), type: 'expense' as any },
      relations: { category: true },
    });

    const byCategory = {};
    transactions.forEach((t) => {
      const cat = t.category?.name || 'Outros';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(Number(t.amount));
    });

    const unusual: Array<{ description: string; amount: number; expectedAverage: number; deviation: number; reason: string }> = [];
    transactions.forEach((t) => {
      const cat = t.category?.name || 'Outros';
      const amounts = byCategory[cat];
      const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
      const amount = Number(t.amount);
      if (amount > avg * 2) {
        unusual.push({
          description: t.description,
          amount,
          expectedAverage: Math.round(avg * 100) / 100,
          deviation: Math.round(((amount - avg) / avg) * 100),
          reason: `Gasto ${Math.round(((amount - avg) / avg) * 100)}% acima da media`,
        });
      }
    });

    const result = {
      unusualExpenses: unusual,
      totalUnusualAmount: unusual.reduce((s, u) => s + u.amount, 0),
      alerts: unusual.length > 0 ? [`${unusual.length} gastos incomuns detectados`] : [],
    };

    const analysis = this.analysisRepo.create({
      userId,
      type: 'detection' as any,
      period: 'ultimos 3 meses',
      result,
    });
    await this.analysisRepo.save(analysis);

    this.logger.log(`[Job Concluido] ID: ${job.id}`);
    return result;
  }

  private async processAiComparison(job: Job): Promise<any> {
    const { userId, period1, period2 } = job.data;
    const { Between } = require('typeorm');

    const getPeriodData = async (m: number, y: number) => {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      const trans = await this.transactionRepo.find({
        where: { userId, date: Between(start, end) },
        relations: { category: true },
      });
      const income = trans.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = trans.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return { income, expense, balance: income - expense, count: trans.length };
    };

    const data1 = await getPeriodData(period1.month, period1.year);
    const data2 = await getPeriodData(period2.month, period2.year);

    const result = {
      comparison: `Periodo 1: Receitas R$${data1.income}, Despesas R$${data1.expense}. Periodo 2: Receitas R$${data2.income}, Despesas R$${data2.expense}.`,
      incomeChange: { value: data1.income - data2.income, percentage: data2.income > 0 ? Math.round(((data1.income - data2.income) / data2.income) * 100) : 0 },
      expenseChange: { value: data1.expense - data2.expense, percentage: data2.expense > 0 ? Math.round(((data1.expense - data2.expense) / data2.expense) * 100) : 0 },
      significantChanges: [],
      insight: data1.balance > data2.balance ? 'Saldo melhorou' : 'Saldo piorou',
    };

    const analysis = this.analysisRepo.create({
      userId,
      type: 'comparison' as any,
      period: `${period1.month}/${period1.year} vs ${period2.month}/${period2.year}`,
      result,
    });
    await this.analysisRepo.save(analysis);

    this.logger.log(`[Job Concluido] ID: ${job.id}`);
    return result;
  }

  private async processReportMonthly(job: Job): Promise<any> {
    const { userId, month, year } = job.data;
    const { Between } = require('typeorm');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const transactions = await this.transactionRepo.find({
      where: { userId, date: Between(startDate, endDate) },
      relations: { category: true },
      order: { date: 'ASC' },
    });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(20).text('Relatorio Mensal', { align: 'center' });
    doc.fontSize(14).text(`${month}/${year}`, { align: 'center' });
    doc.moveDown(2);

    const income = transactions.filter((t) => t.type === 'income');
    const expenses = transactions.filter((t) => t.type === 'expense');
    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

    doc.fontSize(16).text('Resumo');
    doc.fontSize(12);
    doc.text(`Receitas: R$ ${totalIncome.toFixed(2)}`);
    doc.text(`Despesas: R$ ${totalExpense.toFixed(2)}`);
    doc.text(`Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}`);
    doc.moveDown();

    if (expenses.length > 0) {
      doc.fontSize(14).text('Despesas');
      doc.fontSize(10);
      expenses.forEach((t) => {
        doc.text(`${t.date.toLocaleDateString('pt-BR')} | ${t.description} | R$ ${Number(t.amount).toFixed(2)}`);
      });
    }

    doc.end();

    const buffer = await new Promise<Buffer>((resolve) => {
      const bufs: Buffer[] = [];
      doc.on('data', (d: Buffer) => bufs.push(d));
      doc.on('end', () => resolve(Buffer.concat(bufs)));
    });

    const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const report = this.reportRepo.create({
      userId,
      type: 'monthly' as any,
      period: `${month}/${year}`,
      fileUrl: base64,
    });
    await this.reportRepo.save(report);

    this.logger.log(`[Job Concluido] ID: ${job.id}`);
    return { success: true, reportId: report.id };
  }

  private async processReportAnnual(job: Job): Promise<any> {
    const { userId, year } = job.data;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(20).text('Relatorio Anual', { align: 'center' });
    doc.fontSize(14).text(`${year}`, { align: 'center' });
    doc.moveDown(2);

    let totalIncome = 0;
    let totalExpense = 0;

    for (let month = 1; month <= 12; month++) {
      const { Between } = require('typeorm');
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      const trans = await this.transactionRepo.find({
        where: { userId, date: Between(start, end) },
      });
      const mIncome = trans.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const mExpense = trans.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      totalIncome += mIncome;
      totalExpense += mExpense;

      if (trans.length > 0) {
        doc.fontSize(10).text(`${month}/${year}: R$${mIncome.toFixed(2)} / R$${mExpense.toFixed(2)}`);
      }
    }

    doc.moveDown();
    doc.fontSize(12).text(`Total Receitas: R$ ${totalIncome.toFixed(2)}`);
    doc.text(`Total Despesas: R$ ${totalExpense.toFixed(2)}`);
    doc.text(`Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}`);

    doc.end();

    const buffer = await new Promise<Buffer>((resolve) => {
      const bufs: Buffer[] = [];
      doc.on('data', (d: Buffer) => bufs.push(d));
      doc.on('end', () => resolve(Buffer.concat(bufs)));
    });

    const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const report = this.reportRepo.create({
      userId,
      type: 'annual' as any,
      period: `${year}`,
      fileUrl: base64,
    });
    await this.reportRepo.save(report);

    this.logger.log(`[Job Concluido] ID: ${job.id}`);
    return { success: true, reportId: report.id };
  }

  private async processReportExtract(job: Job): Promise<any> {
    const { userId, startDate, endDate } = job.data;
    const { Between } = require('typeorm');

    const start = new Date(startDate);
    const end = new Date(endDate);
    const transactions = await this.transactionRepo.find({
      where: { userId, date: Between(start, end) },
      relations: { category: true },
      order: { date: 'ASC' },
    });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(20).text('Extrato', { align: 'center' });
    doc.fontSize(12).text(`${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(10);
    transactions.forEach((t) => {
      const sign = t.type === 'income' ? '+' : '-';
      doc.text(`${t.date.toLocaleDateString('pt-BR')} | ${sign} R$ ${Number(t.amount).toFixed(2)} | ${t.description}`);
    });

    const total = transactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
    }, 0);

    doc.moveDown();
    doc.fontSize(12).text(`Saldo: R$ ${total.toFixed(2)}`);
    doc.end();

    const buffer = await new Promise<Buffer>((resolve) => {
      const bufs: Buffer[] = [];
      doc.on('data', (d: Buffer) => bufs.push(d));
      doc.on('end', () => resolve(Buffer.concat(bufs)));
    });

    const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const report = this.reportRepo.create({
      userId,
      type: 'extract' as any,
      period: `${startDate} a ${endDate}`,
      fileUrl: base64,
    });
    await this.reportRepo.save(report);

    this.logger.log(`[Job Concluido] ID: ${job.id}`);
    return { success: true, reportId: report.id };
  }

  private async processReportReceipt(job: Job): Promise<any> {
    const { userId, transactionId } = job.data;

    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId, userId },
      relations: { category: true },
    });
    if (!transaction) throw new Error('Transacao nao encontrada');

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(20).text('Comprovante', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12);
    doc.text(`Data: ${transaction.date.toLocaleDateString('pt-BR')}`);
    doc.text(`Descricao: ${transaction.description}`);
    doc.text(`Categoria: ${transaction.category?.name || 'N/A'}`);
    doc.text(`Tipo: ${transaction.type === 'income' ? 'Receita' : 'Despesa'}`);
    doc.text(`Valor: R$ ${Number(transaction.amount).toFixed(2)}`);
    if (transaction.notes) doc.text(`Obs: ${transaction.notes}`);
    doc.end();

    const buffer = await new Promise<Buffer>((resolve) => {
      const bufs: Buffer[] = [];
      doc.on('data', (d: Buffer) => bufs.push(d));
      doc.on('end', () => resolve(Buffer.concat(bufs)));
    });

    const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const report = this.reportRepo.create({
      userId,
      type: 'receipt' as any,
      period: transaction.date.toISOString(),
      fileUrl: base64,
    });
    await this.reportRepo.save(report);

    this.logger.log(`[Job Concluido] ID: ${job.id}`);
    return { success: true, reportId: report.id };
  }
}
