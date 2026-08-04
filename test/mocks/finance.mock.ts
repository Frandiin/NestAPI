import { TransactionType, GoalStatus, AnalysisType } from '../../src/common/enums/finance.enums';
import { FinanceService } from '../../src/modules/finance/finance.service';

export const MockFinanceServiceProvider = {
  provide: FinanceService,
  useValue: {
    createCategory: jest.fn().mockImplementation((dto: any, userId: string) => {
      return Promise.resolve({
        id: 'cat_mock_1',
        name: dto.name,
        icon: dto.icon || null,
        color: dto.color || null,
        type: dto.type,
        userId,
      });
    }),
    getCategories: jest.fn().mockResolvedValue([
      { id: 'cat_mock_1', name: 'Alimentacao', icon: '🍔', color: '#FF5733', type: TransactionType.EXPENSE, userId: '1' },
      { id: 'cat_mock_2', name: 'Salario', icon: '💰', color: '#33FF57', type: TransactionType.INCOME, userId: '1' },
    ]),
    updateCategory: jest.fn().mockImplementation((id: string, dto: any) => {
      return Promise.resolve({ id, ...dto });
    }),
    deleteCategory: jest.fn().mockResolvedValue(undefined),

    createTransaction: jest.fn().mockImplementation((dto: any, userId: string) => {
      return Promise.resolve({
        id: 'tx_mock_1',
        description: dto.description,
        amount: dto.amount,
        type: dto.type,
        date: new Date(dto.date),
        categoryId: dto.categoryId,
        userId,
        notes: dto.notes || null,
        recurring: dto.recurring || false,
        createdAt: new Date(),
      });
    }),
    getTransactions: jest.fn().mockResolvedValue([
      {
        id: 'tx_mock_1',
        description: 'Supermercado',
        amount: 150.5,
        type: TransactionType.EXPENSE,
        date: new Date('2026-08-01'),
        categoryId: 'cat_mock_1',
        userId: '1',
        category: { id: 'cat_mock_1', name: 'Alimentacao' },
        createdAt: new Date(),
      },
    ]),
    getTransactionById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve({
        id,
        description: 'Supermercado',
        amount: 150.5,
        type: TransactionType.EXPENSE,
        date: new Date('2026-08-01'),
        categoryId: 'cat_mock_1',
        userId: '1',
        category: { id: 'cat_mock_1', name: 'Alimentacao' },
        createdAt: new Date(),
      });
    }),
    updateTransaction: jest.fn().mockImplementation((id: string, dto: any) => {
      return Promise.resolve({ id, ...dto });
    }),
    deleteTransaction: jest.fn().mockResolvedValue(undefined),

    createBudget: jest.fn().mockImplementation((dto: any, userId: string) => {
      return Promise.resolve({
        id: 'budget_mock_1',
        categoryId: dto.categoryId,
        userId,
        amount: dto.amount,
        month: dto.month,
        year: dto.year,
        spent: 0,
      });
    }),
    getBudgets: jest.fn().mockResolvedValue([
      {
        id: 'budget_mock_1',
        categoryId: 'cat_mock_1',
        userId: '1',
        amount: 800,
        month: 8,
        year: 2026,
        spent: 150.5,
        category: { id: 'cat_mock_1', name: 'Alimentacao' },
      },
    ]),
    getBudgetStatus: jest.fn().mockResolvedValue([
      {
        id: 'budget_mock_1',
        category: { id: 'cat_mock_1', name: 'Alimentacao' },
        amount: 800,
        spent: 150.5,
        remaining: 649.5,
        percentage: 19,
      },
    ]),
    updateBudget: jest.fn().mockImplementation((id: string, dto: any) => {
      return Promise.resolve({ id, ...dto });
    }),

    createGoal: jest.fn().mockImplementation((dto: any, userId: string) => {
      return Promise.resolve({
        id: 'goal_mock_1',
        name: dto.name,
        targetAmount: dto.targetAmount,
        currentAmount: 0,
        deadline: new Date(dto.deadline),
        userId,
        status: GoalStatus.ACTIVE,
        createdAt: new Date(),
      });
    }),
    getGoals: jest.fn().mockResolvedValue([
      {
        id: 'goal_mock_1',
        name: 'Viagem Europa',
        targetAmount: 15000,
        currentAmount: 5000,
        deadline: new Date('2027-06-01'),
        userId: '1',
        status: GoalStatus.ACTIVE,
        createdAt: new Date(),
      },
    ]),
    addGoalAmount: jest.fn().mockImplementation((id: string, amount: number) => {
      return Promise.resolve({
        id,
        name: 'Viagem Europa',
        targetAmount: 15000,
        currentAmount: 5000 + amount,
        deadline: new Date('2027-06-01'),
        userId: '1',
        status: GoalStatus.ACTIVE,
      });
    }),
    deleteGoal: jest.fn().mockResolvedValue(undefined),

    getDashboard: jest.fn().mockImplementation((userId: string, month: number, year: number) => {
      return Promise.resolve({
        period: { month, year },
        totalIncome: 5000,
        totalExpense: 2500,
        balance: 2500,
        transactionCount: 15,
        byCategory: { Alimentacao: 800, Transporte: 400, Lazer: 300 },
        recentTransactions: [],
      });
    }),
    comparePeriods: jest.fn().mockResolvedValue({
      period1: { month: 8, year: 2026 },
      period2: { month: 7, year: 2026 },
      incomeDifference: 500,
      expenseDifference: -200,
      balanceDifference: 700,
    }),
    getMonthlyHistory: jest.fn().mockResolvedValue([
      { period: { month: 6, year: 2026 }, totalIncome: 4500, totalExpense: 2200, balance: 2300 },
      { period: { month: 7, year: 2026 }, totalIncome: 4800, totalExpense: 2400, balance: 2400 },
      { period: { month: 8, year: 2026 }, totalIncome: 5000, totalExpense: 2500, balance: 2500 },
    ]),
  },
};
