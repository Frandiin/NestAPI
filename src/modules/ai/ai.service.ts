import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import { AiAnalysis } from '../finance/entities/ai-analysis.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { AnalysisType, TransactionType } from '../../common/enums/finance.enums';

interface MonthlyHistoryItem {
  month: number;
  year: number;
  income: number;
  expense: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenAI;

  constructor(
    private configService: ConfigService,
    @InjectRepository(AiAnalysis)
    private readonly analysisRepo: Repository<AiAnalysis>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {
    this.genAI = new GoogleGenAI({
      apiKey: this.configService.get('GEMINI_API_KEY'),
    });
  }

  async generateMonthlySummary(userId: string, month: number, year: number): Promise<AiAnalysis> {
    const transactions = await this.getTransactionData(userId, month, year);
    const dataSummary = this.buildDataSummary(transactions);

    const prompt = `Analise os dados financeiros do mes ${month}/${year} e gere um resumo inteligente em portugues.\n\nDados:\n${dataSummary}\n\nRetorne um JSON com:\n{\n  "summary": "Texto com o resumo geral do mes",\n  "highlights": ["destaque1", "destaque2"],\n  "healthScore": 0-100,\n  "topCategories": [{"name": "categoria", "amount": valor, "percentage": "%"}],\n  "recommendations": ["recomendacao1", "recomendacao2"]\n}`;

    const result = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse(result);

    return this.saveAnalysis(userId, AnalysisType.MONTHLY_SUMMARY, `${month}/${year}`, parsed);
  }

  async generateForecast(userId: string, months: number): Promise<AiAnalysis> {
    const history = await this.getMonthlyHistory(userId, 6);
    const historyText = history
      .map((h) => `${h.month}/${h.year}: Receitas R$${h.income}, Despesas R$${h.expense}`)
      .join('\n');

    const prompt = `Com base no historico financeiro dos ultimos 6 meses, preveja os gastos e receitas dos proximos ${months} meses.\n\nHistorico:\n${historyText}\n\nRetorne um JSON com:\n{\n  "forecast": [{"month": "MM/YYYY", "predictedIncome": valor, "predictedExpense": valor, "confidence": 0-100}],\n  "trend": "crescendo|estavel|diminuindo",\n  "alert": "mensagem de alerta se necessario",\n  "suggestion": "sugestao baseada na tendencia"\n}`;

    const result = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse(result);

    return this.saveAnalysis(userId, AnalysisType.FORECAST, `${months} meses`, parsed);
  }

  async generateTips(userId: string): Promise<AiAnalysis> {
    const transactions = await this.getRecentTransactions(userId, 3);
    const dataSummary = this.buildDataSummary(transactions);

    const prompt = `Analise os gastos recentes e fornecca dicas personalizadas de economia em portugues.\n\nDados dos ultimos 3 meses:\n${dataSummary}\n\nRetorne um JSON com:\n{\n  "tips": [\n    {"category": "categoria", "tip": "dica", "potentialSavings": valor},\n    {"category": "categoria", "tip": "dica", "potentialSavings": valor}\n  ],\n  "totalPotentialSavings": valor,\n  "priority": "alta|media|baixa"\n}`;

    const result = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse(result);

    return this.saveAnalysis(userId, AnalysisType.TIPS, 'ultimos 3 meses', parsed);
  }

  async detectUnusualExpenses(userId: string): Promise<AiAnalysis> {
    const recentTransactions = await this.getRecentTransactions(userId, 3);
    const dataSummary = this.buildDataSummary(recentTransactions);

    const prompt = `Analise as transacoes e identifique gastos incomuns ou atipicos em portugues.\n\nDados:\n${dataSummary}\n\nRetorne um JSON com:\n{\n  "unusualExpenses": [\n    {"description": "descricao", "amount": valor, "expectedAverage": valor, "deviation": "porcentagem", "reason": "motivo"}\n  ],\n  "totalUnusualAmount": valor,\n  "alerts": ["alerta1"]\n}`;

    const result = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse(result);

    return this.saveAnalysis(userId, AnalysisType.DETECTION, 'ultimos 3 meses', parsed);
  }

  async comparePeriods(userId: string, period1: { month: number; year: number }, period2: { month: number; year: number }): Promise<AiAnalysis> {
    const trans1 = await this.getTransactionData(userId, period1.month, period1.year);
    const trans2 = await this.getTransactionData(userId, period2.month, period2.year);

    const summary1 = this.buildDataSummary(trans1);
    const summary2 = this.buildDataSummary(trans2);

    const prompt = `Compare os dois periodos financeiros e destaque as diferencas em portugues.\n\nPeriodo 1 (${period1.month}/${period1.year}):\n${summary1}\n\nPeriodo 2 (${period2.month}/${period2.year}):\n${summary2}\n\nRetorne um JSON com:\n{\n  "comparison": "Analise comparativa detalhada",\n  "incomeChange": {"value": valor, "percentage": "%"},\n  "expenseChange": {"value": valor, "percentage": "%"},\n  "significantChanges": ["mudanca1", "mudanca2"],\n  "insight": "Insight principal"\n}`;

    const result = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse(result);

    return this.saveAnalysis(userId, AnalysisType.COMPARISON, `${period1.month}/${period1.year} vs ${period2.month}/${period2.year}`, parsed);
  }

  async getAnalyses(userId: string): Promise<AiAnalysis[]> {
    return this.analysisRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAnalysisById(id: string, userId: string): Promise<AiAnalysis | null> {
    return this.analysisRepo.findOne({ where: { id, userId } });
  }

  // ========== PRIVATE HELPERS ==========

  private async callGemini(prompt: string): Promise<string> {
    const response = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  }

  private parseJsonResponse(text: string): Record<string, any> {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { raw: text };
    } catch {
      return { raw: text };
    }
  }

  private async getTransactionData(userId: string, month: number, year: number): Promise<Transaction[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.transactionRepo.find({
      where: { userId, date: Between(startDate, endDate) },
      relations: { category: true },
    });
  }

  private async getRecentTransactions(userId: string, months: number): Promise<Transaction[]> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    return this.transactionRepo.find({
      where: { userId, date: MoreThanOrEqual(startDate) },
      relations: { category: true },
      order: { date: 'DESC' },
    });
  }

  private async getMonthlyHistory(userId: string, months: number): Promise<MonthlyHistoryItem[]> {
    const history: MonthlyHistoryItem[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const transactions = await this.getTransactionData(userId, month, year);

      const income = transactions
        .filter((t) => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = transactions
        .filter((t) => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      history.push({ month, year, income, expense });
    }

    return history.reverse();
  }

  private buildDataSummary(transactions: Transaction[]): string {
    const income = transactions.filter((t) => t.type === TransactionType.INCOME);
    const expenses = transactions.filter((t) => t.type === TransactionType.EXPENSE);

    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

    const byCategory: Record<string, number> = {};
    expenses.forEach((t) => {
      const cat = t.category?.name || 'Outros';
      byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
    });

    const topExpenses = expenses
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)
      .map((t) => `  - ${t.description}: R$${t.amount} (${t.category?.name || 'N/A'})`)
      .join('\n');

    return `Total Receitas: R$${totalIncome}\nTotal Despesas: R$${totalExpense}\nSaldo: R$${totalIncome - totalExpense}\nTotal Transacoes: ${transactions.length}\n\nDespesas por Categoria:\n${Object.entries(byCategory).map(([cat, val]) => `  - ${cat}: R$${val}`).join('\n')}\n\nMaiores Gastos:\n${topExpenses}`;
  }

  private async saveAnalysis(userId: string, type: AnalysisType, period: string, result: Record<string, any>): Promise<AiAnalysis> {
    const analysis = this.analysisRepo.create({
      userId,
      type,
      period,
      result,
    });
    return this.analysisRepo.save(analysis);
  }
}
