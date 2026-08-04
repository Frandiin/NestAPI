import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Category } from './entities/category.entity';
import { Transaction } from './entities/transaction.entity';
import { Budget } from './entities/budget.entity';
import { Goal } from './entities/goal.entity';
import { GoalStatus, TransactionType } from '../../common/enums/finance.enums';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(Goal)
    private readonly goalRepo: Repository<Goal>,
  ) {}

  // ========== CATEGORIES ==========

  async createCategory(dto: CreateCategoryDto, userId: string): Promise<Category> {
    const category = this.categoryRepo.create({ ...dto, userId });
    return this.categoryRepo.save(category);
  }

  async getCategories(userId: string): Promise<Category[]> {
    return this.categoryRepo.find({ where: { userId }, order: { name: 'ASC' } });
  }

  async updateCategory(id: string, dto: Partial<CreateCategoryDto>, userId: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException('Categoria nao encontrada');
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async deleteCategory(id: string, userId: string): Promise<void> {
    const category = await this.categoryRepo.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException('Categoria nao encontrada');
    await this.categoryRepo.remove(category);
  }

  // ========== TRANSACTIONS ==========

  async createTransaction(dto: CreateTransactionDto, userId: string): Promise<Transaction> {
    const transaction = this.transactionRepo.create({ ...dto, userId });
    const saved = await this.transactionRepo.save(transaction);

    if (dto.type === TransactionType.EXPENSE) {
      await this.updateBudgetSpent(dto.categoryId, dto.date, dto.amount);
    }

    return saved;
  }

  async getTransactions(userId: string, query: QueryTransactionsDto): Promise<Transaction[]> {
    const where: any = { userId };

    if (query.startDate && query.endDate) {
      where.date = Between(new Date(query.startDate), new Date(query.endDate));
    } else if (query.startDate) {
      where.date = MoreThanOrEqual(new Date(query.startDate));
    } else if (query.endDate) {
      where.date = LessThanOrEqual(new Date(query.endDate));
    }

    if (query.type) where.type = query.type;
    if (query.categoryId) where.categoryId = query.categoryId;

    return this.transactionRepo.find({
      where,
      relations: { category: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async getTransactionById(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id, userId },
      relations: { category: true },
    });
    if (!transaction) throw new NotFoundException('Transacao nao encontrada');
    return transaction;
  }

  async updateTransaction(id: string, dto: Partial<CreateTransactionDto>, userId: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({ where: { id, userId } });
    if (!transaction) throw new NotFoundException('Transacao nao encontrada');
    Object.assign(transaction, dto);
    return this.transactionRepo.save(transaction);
  }

  async deleteTransaction(id: string, userId: string): Promise<void> {
    const transaction = await this.transactionRepo.findOne({ where: { id, userId } });
    if (!transaction) throw new NotFoundException('Transacao nao encontrada');
    await this.transactionRepo.remove(transaction);
  }

  // ========== BUDGETS ==========

  async createBudget(dto: CreateBudgetDto, userId: string): Promise<Budget> {
    const existing = await this.budgetRepo.findOne({
      where: { userId, categoryId: dto.categoryId, month: dto.month, year: dto.year },
    });
    if (existing) throw new NotFoundException('Orcamento ja existe para esta categoria e periodo');

    const budget = this.budgetRepo.create({ ...dto, userId });
    return this.budgetRepo.save(budget);
  }

  async getBudgets(userId: string, month: number, year: number): Promise<Budget[]> {
    return this.budgetRepo.find({
      where: { userId, month, year },
      relations: { category: true },
    });
  }

  async getBudgetStatus(userId: string, month: number, year: number): Promise<any[]> {
    const budgets = await this.getBudgets(userId, month, year);
    return budgets.map((b) => ({
      id: b.id,
      category: b.category,
      amount: Number(b.amount),
      spent: Number(b.spent),
      remaining: Number(b.amount) - Number(b.spent),
      percentage: b.amount > 0 ? Math.round((Number(b.spent) / Number(b.amount)) * 100) : 0,
    }));
  }

  async updateBudget(id: string, dto: Partial<CreateBudgetDto>, userId: string): Promise<Budget> {
    const budget = await this.budgetRepo.findOne({ where: { id, userId } });
    if (!budget) throw new NotFoundException('Orcamento nao encontrado');
    Object.assign(budget, dto);
    return this.budgetRepo.save(budget);
  }

  private async updateBudgetSpent(categoryId: string, date: string | Date, amount: number): Promise<void> {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const budget = await this.budgetRepo.findOne({
      where: { categoryId, month, year },
    });
    if (budget) {
      budget.spent = Number(budget.spent) + amount;
      await this.budgetRepo.save(budget);
    }
  }

  // ========== GOALS ==========

  async createGoal(dto: CreateGoalDto, userId: string): Promise<Goal> {
    const goal = this.goalRepo.create({ ...dto, userId });
    return this.goalRepo.save(goal);
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return this.goalRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async addGoalAmount(id: string, amount: number, userId: string): Promise<Goal> {
    const goal = await this.goalRepo.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Meta nao encontrada');

    goal.currentAmount = Number(goal.currentAmount) + amount;
    if (goal.currentAmount >= Number(goal.targetAmount)) {
      goal.status = GoalStatus.COMPLETED;
    }
    return this.goalRepo.save(goal);
  }

  async deleteGoal(id: string, userId: string): Promise<void> {
    const goal = await this.goalRepo.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Meta nao encontrada');
    await this.goalRepo.remove(goal);
  }

  // ========== DASHBOARD ==========

  async getDashboard(userId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const transactions = await this.transactionRepo.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      relations: { category: true },
    });

    const totalIncome = transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalIncome - totalExpense;

    const byCategory: Record<string, number> = {};
    transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .forEach((t) => {
        const catName = t.category?.name || 'Sem categoria';
        byCategory[catName] = (byCategory[catName] || 0) + Number(t.amount);
      });

    const recentTransactions = transactions.slice(0, 10);

    return {
      period: { month, year },
      totalIncome,
      totalExpense,
      balance,
      transactionCount: transactions.length,
      byCategory,
      recentTransactions,
    };
  }

  async comparePeriods(userId: string, period1: { month: number; year: number }, period2: { month: number; year: number }) {
    const data1 = await this.getDashboard(userId, period1.month, period1.year);
    const data2 = await this.getDashboard(userId, period2.month, period2.year);

    return {
      period1,
      period2,
      incomeDifference: data1.totalIncome - data2.totalIncome,
      expenseDifference: data1.totalExpense - data2.totalExpense,
      balanceDifference: data1.balance - data2.balance,
      data1,
      data2,
    };
  }

  async getMonthlyHistory(userId: string, months: number = 6) {
    const history: any[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const dashboard = await this.getDashboard(userId, month, year);
      history.push(dashboard);
    }

    return history.reverse();
  }
}
