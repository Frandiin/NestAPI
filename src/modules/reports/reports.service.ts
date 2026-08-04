import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import { GeneratedReport } from '../finance/entities/generated-report.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { Budget } from '../finance/entities/budget.entity';
import { ReportType, TransactionType } from '../../common/enums/finance.enums';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(GeneratedReport)
    private readonly reportRepo: Repository<GeneratedReport>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
  ) {}

  async generateMonthlyReport(userId: string, month: number, year: number): Promise<Buffer> {
    const transactions = await this.getTransactions(userId, month, year);
    const budgets = await this.budgetRepo.find({ where: { userId, month, year }, relations: { category: true } });

    const income = transactions.filter((t) => t.type === TransactionType.INCOME);
    const expenses = transactions.filter((t) => t.type === TransactionType.EXPENSE);

    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Header
    doc.fontSize(20).text('Relatorio Mensal', { align: 'center' });
    doc.fontSize(14).text(`${month}/${year}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(16).text('Resumo');
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Receitas: R$ ${totalIncome.toFixed(2)}`);
    doc.text(`Total Despesas: R$ ${totalExpense.toFixed(2)}`);
    doc.text(`Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}`);
    doc.moveDown();

    // Income table
    if (income.length > 0) {
      doc.fontSize(14).text('Receitas');
      doc.moveDown(0.5);
      doc.fontSize(10);
      income.forEach((t) => {
        doc.text(`${t.date.toLocaleDateString('pt-BR')} | ${t.description} | ${t.category?.name || 'N/A'} | R$ ${Number(t.amount).toFixed(2)}`);
      });
      doc.moveDown();
    }

    // Expenses table
    if (expenses.length > 0) {
      doc.fontSize(14).text('Despesas');
      doc.moveDown(0.5);
      doc.fontSize(10);
      expenses.forEach((t) => {
        doc.text(`${t.date.toLocaleDateString('pt-BR')} | ${t.description} | ${t.category?.name || 'N/A'} | R$ ${Number(t.amount).toFixed(2)}`);
      });
      doc.moveDown();
    }

    // Budget status
    if (budgets.length > 0) {
      doc.fontSize(14).text('Orcamentos');
      doc.moveDown(0.5);
      doc.fontSize(10);
      budgets.forEach((b) => {
        const pct = b.amount > 0 ? ((Number(b.spent) / Number(b.amount)) * 100).toFixed(0) : '0';
        doc.text(`${b.category?.name || 'N/A'}: R$ ${Number(b.spent).toFixed(2)} / R$ ${Number(b.amount).toFixed(2)} (${pct}%)`);
      });
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async generateAnnualReport(userId: string, year: number): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(20).text('Relatorio Anual', { align: 'center' });
    doc.fontSize(14).text(`${year}`, { align: 'center' });
    doc.moveDown(2);

    let totalIncome = 0;
    let totalExpense = 0;

    for (let month = 1; month <= 12; month++) {
      const transactions = await this.getTransactions(userId, month, year);
      const monthIncome = transactions
        .filter((t) => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const monthExpense = transactions
        .filter((t) => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      totalIncome += monthIncome;
      totalExpense += monthExpense;

      if (transactions.length > 0) {
        doc.fontSize(12).text(`${month}/${year}: Receitas R$${monthIncome.toFixed(2)} | Despesas R$${monthExpense.toFixed(2)} | Saldo R$${(monthIncome - monthExpense).toFixed(2)}`);
      }
    }

    doc.moveDown();
    doc.fontSize(16).text('Totais Anuais');
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Receitas: R$ ${totalIncome.toFixed(2)}`);
    doc.text(`Total Despesas: R$ ${totalExpense.toFixed(2)}`);
    doc.text(`Saldo Anual: R$ ${(totalIncome - totalExpense).toFixed(2)}`);

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async generateExtract(userId: string, startDate: string, endDate: string): Promise<Buffer> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const transactions = await this.transactionRepo.find({
      where: { userId, date: Between(start, end) },
      relations: { category: true },
      order: { date: 'ASC' },
    });

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(20).text('Extrato de Transacoes', { align: 'center' });
    doc.fontSize(12).text(`${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(10);
    transactions.forEach((t) => {
      const type = t.type === TransactionType.INCOME ? '+' : '-';
      doc.text(`${t.date.toLocaleDateString('pt-BR')} | ${type} R$ ${Number(t.amount).toFixed(2)} | ${t.description} | ${t.category?.name || 'N/A'}`);
    });

    const total = transactions.reduce((sum, t) => {
      return sum + (t.type === TransactionType.INCOME ? Number(t.amount) : -Number(t.amount));
    }, 0);

    doc.moveDown();
    doc.fontSize(12).text(`Saldo do periodo: R$ ${total.toFixed(2)}`);

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async generateReceipt(transactionId: string, userId: string): Promise<Buffer> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId, userId },
      relations: { category: true },
    });
    if (!transaction) throw new NotFoundException('Transacao nao encontrada');

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(20).text('Comprovante', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12);
    doc.text(`Data: ${transaction.date.toLocaleDateString('pt-BR')}`);
    doc.text(`Descricao: ${transaction.description}`);
    doc.text(`Categoria: ${transaction.category?.name || 'N/A'}`);
    doc.text(`Tipo: ${transaction.type === TransactionType.INCOME ? 'Receita' : 'Despesa'}`);
    doc.text(`Valor: R$ ${Number(transaction.amount).toFixed(2)}`);
    if (transaction.notes) {
      doc.text(`Observacoes: ${transaction.notes}`);
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async saveReport(userId: string, type: ReportType, period: string, fileUrl: string): Promise<GeneratedReport> {
    const report = this.reportRepo.create({ userId, type, period, fileUrl });
    return this.reportRepo.save(report);
  }

  async getReports(userId: string): Promise<GeneratedReport[]> {
    return this.reportRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getReportById(id: string, userId: string): Promise<GeneratedReport> {
    const report = await this.reportRepo.findOne({ where: { id, userId } });
    if (!report) throw new NotFoundException('Relatorio nao encontrado');
    return report;
  }

  private async getTransactions(userId: string, month: number, year: number): Promise<Transaction[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.transactionRepo.find({
      where: { userId, date: Between(startDate, endDate) },
      relations: { category: true },
      order: { date: 'ASC' },
    });
  }
}
