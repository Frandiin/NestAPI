import { AnalysisType } from '../../src/common/enums/finance.enums';
import { AiService } from '../../src/modules/ai/ai.service';

export const MockAiServiceProvider = {
  provide: AiService,
  useValue: {
    generateMonthlySummary: jest.fn().mockImplementation((userId: string, month: number, year: number) => {
      return Promise.resolve({
        id: 'ai_mock_1',
        userId,
        type: AnalysisType.MONTHLY_SUMMARY,
        period: `${month}/${year}`,
        result: {
          summary: `Mes ${month}/${year}: Receitas R$5000, Despesas R$2500, Saldo R$2500`,
          healthScore: 85,
          highlights: ['Gastos com alimentacao dentro do esperado', 'Saldo positivo'],
          recommendations: ['Manter padrao de gastos'],
        },
        createdAt: new Date(),
      });
    }),
    generateForecast: jest.fn().mockImplementation((userId: string, months: number) => {
      return Promise.resolve({
        id: 'ai_mock_2',
        userId,
        type: AnalysisType.FORECAST,
        period: `${months} meses`,
        result: {
          forecast: [
            { month: '9/2026', predictedIncome: 5000, predictedExpense: 2500, confidence: 75 },
            { month: '10/2026', predictedIncome: 5000, predictedExpense: 2400, confidence: 70 },
          ],
          trend: 'estavel',
          suggestion: 'Manter padrao de gastos atual',
        },
        createdAt: new Date(),
      });
    }),
    generateTips: jest.fn().mockImplementation((userId: string) => {
      return Promise.resolve({
        id: 'ai_mock_3',
        userId,
        type: AnalysisType.TIPS,
        period: 'ultimos 3 meses',
        result: {
          tips: [
            { category: 'Alimentacao', tip: 'Considere reduzir delivery', potentialSavings: 200 },
            { category: 'Lazer', tip: 'Procure alternativas gratuitas', potentialSavings: 150 },
          ],
          totalPotentialSavings: 350,
          priority: 'media',
        },
        createdAt: new Date(),
      });
    }),
    detectUnusualExpenses: jest.fn().mockImplementation((userId: string) => {
      return Promise.resolve({
        id: 'ai_mock_4',
        userId,
        type: AnalysisType.DETECTION,
        period: 'ultimos 3 meses',
        result: {
          unusualExpenses: [
            { description: 'Compra eletronica', amount: 2500, expectedAverage: 500, deviation: 400, reason: 'Gasto 400% acima da media' },
          ],
          totalUnusualAmount: 2500,
          alerts: ['1 gastos incomuns detectados'],
        },
        createdAt: new Date(),
      });
    }),
    comparePeriods: jest.fn().mockImplementation((userId: string, period1: any, period2: any) => {
      return Promise.resolve({
        id: 'ai_mock_5',
        userId,
        type: AnalysisType.COMPARISON,
        period: `${period1.month}/${period1.year} vs ${period2.month}/${period2.year}`,
        result: {
          comparison: 'Periodo 1 teve receitas maiores',
          incomeChange: { value: 500, percentage: 10 },
          expenseChange: { value: -200, percentage: -8 },
          significantChanges: ['Aumento de receita'],
          insight: 'Saldo melhorou',
        },
        createdAt: new Date(),
      });
    }),
    getAnalyses: jest.fn().mockResolvedValue([
      {
        id: 'ai_mock_1',
        userId: '1',
        type: AnalysisType.MONTHLY_SUMMARY,
        period: '8/2026',
        result: { summary: 'Resumo do mes' },
        createdAt: new Date(),
      },
    ]),
    getAnalysisById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve({
        id,
        userId: '1',
        type: AnalysisType.MONTHLY_SUMMARY,
        period: '8/2026',
        result: { summary: 'Resumo do mes' },
        createdAt: new Date(),
      });
    }),
  },
};

export const MockAiAnalysisRepoProvider = {
  provide: 'Repository<AiAnalysis>',
  useValue: {
    create: jest.fn().mockImplementation((data: any) => data),
    save: jest.fn().mockImplementation((data: any) => Promise.resolve({ id: 'ai_mock_1', ...data })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  },
};
