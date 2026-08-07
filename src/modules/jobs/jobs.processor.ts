import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { GeneratedReport } from '../finance/entities/generated-report.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { Budget } from '../finance/entities/budget.entity';
import { AiAnalysis } from '../finance/entities/ai-analysis.entity';

export const TASKS_QUEUE_NAME = 'tasks-queue';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const COLORS = {
  primary: '#1e3a5f',
  primaryLight: '#e8eef6',
  income: '#16a34a',
  incomeBg: '#f0fdf4',
  expense: '#dc2626',
  expenseBg: '#fef2f2',
  neutral: '#64748b',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  white: '#ffffff',
  rowAlt: '#f8fafc',
};

function drawHeader(doc: any, title: string, subtitle: string) {
  doc.rect(0, 0, 595.28, 90).fill(COLORS.primary);
  doc.fontSize(24).font('Helvetica-Bold').fillColor(COLORS.white).text(title, 50, 28, { align: 'center', width: 495.28 });
  doc.fontSize(12).font('Helvetica').fillColor('#94a3b8').text(subtitle, 50, 58, { align: 'center', width: 495.28 });
  doc.fillColor(COLORS.text);
  doc.y = 110;
}

function drawSectionTitle(doc: any, title: string) {
  if (doc.y > 700) doc.addPage();
  doc.moveDown(0.8);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.primary).text(title, 50);
  doc.moveDown(0.2);
  doc.moveTo(50, doc.y).lineTo(545.28, doc.y).strokeColor(COLORS.primary).lineWidth(1.5).stroke();
  doc.lineLineWidth(1);
  doc.moveDown(0.5);
}

function drawSummaryBox(doc: any, items: { label: string; value: string; color: string; bgColor: string }[], y?: number) {
  const startY = y || doc.y;
  const boxWidth = 155;
  const gap = 10;
  const boxX = 50;

  items.forEach((item, i) => {
    const x = boxX + i * (boxWidth + gap);
    doc.roundedRect(x, startY, boxWidth, 52, 4).fill(item.bgColor);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.textMuted).text(item.label, x + 10, startY + 10, { width: boxWidth - 20 });
    doc.fontSize(13).font('Helvetica-Bold').fillColor(item.color).text(item.value, x + 10, startY + 26, { width: boxWidth - 20 });
  });

  doc.y = startY + 62;
  doc.fillColor(COLORS.text);
}

function drawTableHeader(doc: any, cols: { label: string; x: number; w: number; align?: string }[]) {
  const y = doc.y;
  doc.rect(50, y, 495.28, 20).fill(COLORS.primary);
  cols.forEach((col) => {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.white)
      .text(col.label, col.x, y + 6, { width: col.w, align: (col.align as any) || 'left' });
  });
  doc.y = y + 22;
  doc.fillColor(COLORS.text);
}

function drawTableRow(doc: any, cols: { text: string; x: number; w: number; color?: string; align?: string; bold?: boolean }[], isAlt: boolean) {
  if (doc.y > 770) doc.addPage();
  const y = doc.y;
  if (isAlt) doc.rect(50, y - 1, 495.28, 18).fill(COLORS.rowAlt);
  cols.forEach((col) => {
    const sanitized = (col.text || '').replace(/[^\x00-\xFF]/g, '?');
    doc.fontSize(8).font(col.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(col.color || COLORS.text)
      .text(sanitized, col.x, y + 3, { width: col.w, align: (col.align as any) || 'left' });
  });
  doc.y = y + 17;
  doc.fillColor(COLORS.text);
}

function drawFooter(doc: any) {
  const pageHeight = doc.page.height;
  doc.fontSize(7).font('Helvetica').fillColor(COLORS.textMuted)
    .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 50, pageHeight - 30, { align: 'center', width: 495.28 });
}

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

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t."userId" = :userId', { userId })
      .andWhere('t.date >= :startDate', { startDate: startDateStr })
      .andWhere('t.date <= :endDate', { endDate: endDateStr })
      .getMany();

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

    const getPeriodData = async (m: number, y: number) => {
      const startDateStr = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDateStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const trans = await this.transactionRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.category', 'category')
        .where('t."userId" = :userId', { userId })
        .andWhere('t.date >= :startDate', { startDate: startDateStr })
        .andWhere('t.date <= :endDate', { endDate: endDateStr })
        .getMany();
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

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t."userId" = :userId', { userId })
      .andWhere("t.date >= :startDate AND t.date <= :endDate", { startDate, endDate })
      .orderBy('t.date', 'ASC')
      .getMany();

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const income = transactions.filter((t) => t.type === 'income');
    const expenses = transactions.filter((t) => t.type === 'expense');
    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const tmpFile = path.join('/tmp', `report_monthly_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    const writeStream = fs.createWriteStream(tmpFile);
    doc.pipe(writeStream);

    drawHeader(doc, 'Relatório Mensal', `${monthNames[month - 1]} ${year}`);

    drawSummaryBox(doc, [
      { label: 'Receitas', value: formatBRL(totalIncome), color: COLORS.income, bgColor: COLORS.incomeBg },
      { label: 'Despesas', value: formatBRL(totalExpense), color: COLORS.expense, bgColor: COLORS.expenseBg },
      { label: 'Saldo', value: formatBRL(balance), color: balance >= 0 ? COLORS.income : COLORS.expense, bgColor: balance >= 0 ? COLORS.incomeBg : COLORS.expenseBg },
    ]);

    if (expenses.length > 0) {
      drawSectionTitle(doc, `Despesas (${expenses.length})`);
      drawTableHeader(doc, [
        { label: 'DATA', x: 55, w: 70 },
        { label: 'DESCRIÇÃO', x: 130, w: 250 },
        { label: 'CATEGORIA', x: 385, w: 80 },
        { label: 'VALOR', x: 470, w: 70, align: 'right' },
      ]);
      expenses.forEach((t, i) => {
        const dateStr = t.date instanceof Date ? t.date.toLocaleDateString('pt-BR') : String(t.date);
        drawTableRow(doc, [
          { text: dateStr, x: 55, w: 70 },
          { text: t.description, x: 130, w: 250 },
          { text: t.category?.name || '—', x: 385, w: 80, color: COLORS.textMuted },
          { text: formatBRL(Number(t.amount)), x: 470, w: 70, color: COLORS.expense, align: 'right', bold: true },
        ], i % 2 === 0);
      });
      doc.moveDown(0.3);
      doc.moveTo(385, doc.y).lineTo(545.28, doc.y).strokeColor(COLORS.border).stroke();
      doc.moveDown(0.3);
      drawTableRow(doc, [
        { text: '', x: 55, w: 70 },
        { text: 'Total Despesas', x: 130, w: 250, bold: true },
        { text: '', x: 385, w: 80 },
        { text: formatBRL(totalExpense), x: 470, w: 70, color: COLORS.expense, align: 'right', bold: true },
      ], false);
    }

    if (income.length > 0) {
      drawSectionTitle(doc, `Receitas (${income.length})`);
      drawTableHeader(doc, [
        { label: 'DATA', x: 55, w: 70 },
        { label: 'DESCRIÇÃO', x: 130, w: 250 },
        { label: 'CATEGORIA', x: 385, w: 80 },
        { label: 'VALOR', x: 470, w: 70, align: 'right' },
      ]);
      income.forEach((t, i) => {
        const dateStr = t.date instanceof Date ? t.date.toLocaleDateString('pt-BR') : String(t.date);
        drawTableRow(doc, [
          { text: dateStr, x: 55, w: 70 },
          { text: t.description, x: 130, w: 250 },
          { text: t.category?.name || '—', x: 385, w: 80, color: COLORS.textMuted },
          { text: formatBRL(Number(t.amount)), x: 470, w: 70, color: COLORS.income, align: 'right', bold: true },
        ], i % 2 === 0);
      });
      doc.moveDown(0.3);
      doc.moveTo(385, doc.y).lineTo(545.28, doc.y).strokeColor(COLORS.border).stroke();
      doc.moveDown(0.3);
      drawTableRow(doc, [
        { text: '', x: 55, w: 70 },
        { text: 'Total Receitas', x: 130, w: 250, bold: true },
        { text: '', x: 385, w: 80 },
        { text: formatBRL(totalIncome), x: 470, w: 70, color: COLORS.income, align: 'right', bold: true },
      ], false);
    }

    drawFooter(doc);

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    const pdfBuffer = fs.readFileSync(tmpFile);
    fs.unlinkSync(tmpFile);

    this.logger.log(`[ReportMonthly] PDF gerado, ${pdfBuffer.length} bytes`);

    const base64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
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

    let totalIncome = 0;
    let totalExpense = 0;
    const monthlyData: { month: string; income: number; expense: number; balance: number }[] = [];

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let month = 1; month <= 12; month++) {
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const trans = await this.transactionRepo
        .createQueryBuilder('t')
        .where('t."userId" = :userId', { userId })
        .andWhere('t.date >= :startDate', { startDate: startDateStr })
        .andWhere('t.date <= :endDate', { endDate: endDateStr })
        .getMany();
      const mIncome = trans.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const mExpense = trans.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      totalIncome += mIncome;
      totalExpense += mExpense;

      if (trans.length > 0) {
        monthlyData.push({ month: `${monthNames[month - 1]}`, income: mIncome, expense: mExpense, balance: mIncome - mExpense });
      }
    }

    const balance = totalIncome - totalExpense;
    const avgMonthly = monthlyData.length > 0 ? totalIncome / monthlyData.length : 0;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const tmpFile = path.join('/tmp', `report_annual_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    const writeStream = fs.createWriteStream(tmpFile);
    doc.pipe(writeStream);

    drawHeader(doc, 'Relatório Anual', `Exercício ${year}`);

    drawSummaryBox(doc, [
      { label: 'Total Receitas', value: formatBRL(totalIncome), color: COLORS.income, bgColor: COLORS.incomeBg },
      { label: 'Total Despesas', value: formatBRL(totalExpense), color: COLORS.expense, bgColor: COLORS.expenseBg },
      { label: 'Saldo Anual', value: formatBRL(balance), color: balance >= 0 ? COLORS.income : COLORS.expense, bgColor: balance >= 0 ? COLORS.incomeBg : COLORS.expenseBg },
    ]);

    drawSummaryBox(doc, [
      { label: 'Média Mensal Receita', value: formatBRL(avgMonthly), color: COLORS.income, bgColor: COLORS.incomeBg },
      { label: 'Meses com Movimento', value: `${monthlyData.length}`, color: COLORS.primary, bgColor: COLORS.primaryLight },
      { label: 'Economia Potencial (10%)', value: formatBRL(totalExpense * 0.1), color: COLORS.income, bgColor: COLORS.incomeBg },
    ]);

    if (monthlyData.length > 0) {
      drawSectionTitle(doc, 'Evolução Mensal');
      drawTableHeader(doc, [
        { label: 'MÊS', x: 55, w: 60 },
        { label: 'RECEITAS', x: 160, w: 120, align: 'right' },
        { label: 'DESPESAS', x: 290, w: 120, align: 'right' },
        { label: 'SALDO', x: 420, w: 120, align: 'right' },
      ]);
      monthlyData.forEach((m, i) => {
        drawTableRow(doc, [
          { text: `${m.month}/${year}`, x: 55, w: 60, bold: true },
          { text: formatBRL(m.income), x: 160, w: 120, color: COLORS.income, align: 'right' },
          { text: formatBRL(m.expense), x: 290, w: 120, color: COLORS.expense, align: 'right' },
          { text: formatBRL(m.balance), x: 420, w: 120, color: m.balance >= 0 ? COLORS.income : COLORS.expense, align: 'right', bold: true },
        ], i % 2 === 0);
      });
      doc.moveDown(0.3);
      doc.moveTo(160, doc.y).lineTo(540, doc.y).strokeColor(COLORS.border).stroke();
      doc.moveDown(0.3);
      drawTableRow(doc, [
        { text: 'TOTAL', x: 55, w: 60, bold: true },
        { text: formatBRL(totalIncome), x: 160, w: 120, color: COLORS.income, align: 'right', bold: true },
        { text: formatBRL(totalExpense), x: 290, w: 120, color: COLORS.expense, align: 'right', bold: true },
        { text: formatBRL(balance), x: 420, w: 120, color: balance >= 0 ? COLORS.income : COLORS.expense, align: 'right', bold: true },
      ], false);
    }

    drawFooter(doc);

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    const pdfBuffer = fs.readFileSync(tmpFile);
    fs.unlinkSync(tmpFile);

    this.logger.log(`[ReportAnnual] PDF gerado, ${pdfBuffer.length} bytes`);

    const base64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
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

    const startDateStr = startDate.includes('T') ? startDate.split('T')[0] : startDate;
    const endDateStr = endDate.includes('T') ? endDate.split('T')[0] : endDate;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t."userId" = :userId', { userId })
      .andWhere('t.date >= :startDate', { startDate: startDateStr })
      .andWhere('t.date <= :endDate', { endDate: endDateStr })
      .orderBy('t.date', 'ASC')
      .getMany();

    const income = transactions.filter((t) => t.type === 'income');
    const expenses = transactions.filter((t) => t.type === 'expense');
    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const tmpFile = path.join('/tmp', `report_extract_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    const writeStream = fs.createWriteStream(tmpFile);
    doc.pipe(writeStream);

    drawHeader(doc, 'Extrato Financeiro', `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`);

    drawSummaryBox(doc, [
      { label: 'Receitas', value: formatBRL(totalIncome), color: COLORS.income, bgColor: COLORS.incomeBg },
      { label: 'Despesas', value: formatBRL(totalExpense), color: COLORS.expense, bgColor: COLORS.expenseBg },
      { label: 'Saldo', value: formatBRL(balance), color: balance >= 0 ? COLORS.income : COLORS.expense, bgColor: balance >= 0 ? COLORS.incomeBg : COLORS.expenseBg },
    ]);

    if (transactions.length > 0) {
      drawSectionTitle(doc, `Lançamentos (${transactions.length})`);
      drawTableHeader(doc, [
        { label: 'DATA', x: 55, w: 70 },
        { label: 'TIPO', x: 130, w: 50 },
        { label: 'DESCRIÇÃO', x: 185, w: 220 },
        { label: 'CATEGORIA', x: 410, w: 60 },
        { label: 'VALOR', x: 475, w: 65, align: 'right' },
      ]);
      transactions.forEach((t, i) => {
        const dateStr = t.date instanceof Date ? t.date.toLocaleDateString('pt-BR') : String(t.date);
        const sign = t.type === 'income' ? '+' : '−';
        const color = t.type === 'income' ? COLORS.income : COLORS.expense;
        drawTableRow(doc, [
          { text: dateStr, x: 55, w: 70 },
          { text: sign, x: 130, w: 50, color, bold: true },
          { text: t.description, x: 185, w: 220 },
          { text: t.category?.name || '—', x: 410, w: 60, color: COLORS.textMuted },
          { text: formatBRL(Number(t.amount)), x: 475, w: 65, color, align: 'right', bold: true },
        ], i % 2 === 0);
      });
      doc.moveDown(0.3);
      doc.moveTo(410, doc.y).lineTo(540, doc.y).strokeColor(COLORS.border).stroke();
      doc.moveDown(0.3);
      drawTableRow(doc, [
        { text: '', x: 55, w: 70 },
        { text: '', x: 130, w: 50 },
        { text: 'SALDO FINAL', x: 185, w: 220, bold: true },
        { text: '', x: 410, w: 60 },
        { text: formatBRL(balance), x: 475, w: 65, color: balance >= 0 ? COLORS.income : COLORS.expense, align: 'right', bold: true },
      ], false);
    }

    drawFooter(doc);

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    const pdfBuffer = fs.readFileSync(tmpFile);
    fs.unlinkSync(tmpFile);

    this.logger.log(`[ReportExtract] PDF gerado, ${pdfBuffer.length} bytes`);

    const base64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
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

    const isIncome = transaction.type === 'income';
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const tmpFile = path.join('/tmp', `report_receipt_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    const writeStream = fs.createWriteStream(tmpFile);
    doc.pipe(writeStream);

    drawHeader(doc, 'Comprovante', transaction.date.toLocaleDateString('pt-BR'));

    const fields = [
      { label: 'Data', value: transaction.date.toLocaleDateString('pt-BR') },
      { label: 'Descrição', value: transaction.description },
      { label: 'Categoria', value: transaction.category?.name || 'Sem categoria' },
      { label: 'Tipo', value: isIncome ? 'Receita' : 'Despesa' },
      { label: 'Valor', value: formatBRL(Number(transaction.amount)) },
    ];
    if (transaction.notes) fields.push({ label: 'Observação', value: transaction.notes });

    fields.forEach((f) => {
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.textMuted).text(f.label, 50, doc.y, { width: 120 });
      doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.text).text(f.value, 170, doc.y - 12, { width: 375 });
      doc.moveDown(0.8);
    });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545.28, doc.y).strokeColor(COLORS.border).stroke();
    doc.moveDown(0.5);

    drawSummaryBox(doc, [
      {
        label: isIncome ? 'Receita' : 'Despesa',
        value: formatBRL(Number(transaction.amount)),
        color: isIncome ? COLORS.income : COLORS.expense,
        bgColor: isIncome ? COLORS.incomeBg : COLORS.expenseBg,
      },
    ]);

    drawFooter(doc);

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    const pdfBuffer = fs.readFileSync(tmpFile);
    fs.unlinkSync(tmpFile);

    this.logger.log(`[ReportReceipt] PDF gerado, ${pdfBuffer.length} bytes`);

    const base64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
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
