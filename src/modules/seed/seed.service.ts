import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Category } from '../finance/entities/category.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { Budget } from '../finance/entities/budget.entity';
import { Goal } from '../finance/entities/goal.entity';
import { Job } from '../jobs/entities/job.entity';
import { File } from '../files/entities/file.entity';
import { AiAnalysis } from '../finance/entities/ai-analysis.entity';
import { GeneratedReport } from '../finance/entities/generated-report.entity';
import { Role } from '../../common/enums/role.enum';
import { TransactionType, GoalStatus, AnalysisType, ReportType } from '../../common/enums/finance.enums';
import { JobStatus } from '../../common/enums/job-status.enum';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Category) private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(Transaction) private readonly transactionsRepo: Repository<Transaction>,
    @InjectRepository(Budget) private readonly budgetsRepo: Repository<Budget>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(Job) private readonly jobsRepo: Repository<Job>,
    @InjectRepository(File) private readonly filesRepo: Repository<File>,
    @InjectRepository(AiAnalysis) private readonly aiAnalysesRepo: Repository<AiAnalysis>,
    @InjectRepository(GeneratedReport) private readonly reportsRepo: Repository<GeneratedReport>,
  ) {}

  async onModuleInit() {
    const userCount = await this.usersRepo.count();
    if (userCount > 0) {
      this.logger.log('Seed: dados existentes encontrados, limpando para re-seed...');
      await this.reportsRepo.createQueryBuilder().delete().execute();
      await this.aiAnalysesRepo.createQueryBuilder().delete().execute();
      await this.filesRepo.createQueryBuilder().delete().execute();
      await this.jobsRepo.createQueryBuilder().delete().execute();
      await this.goalsRepo.createQueryBuilder().delete().execute();
      await this.budgetsRepo.createQueryBuilder().delete().execute();
      await this.transactionsRepo.createQueryBuilder().delete().execute();
      await this.categoriesRepo.createQueryBuilder().delete().execute();
      await this.usersRepo.createQueryBuilder().delete().execute();
      this.logger.log('Seed: dados antigos removidos');
    }

    this.logger.log('Seed: iniciando seed do banco de dados...');

    const passwordHash = await bcrypt.hash('Password123!', 10);

    const admin = await this.usersRepo.save({
      name: 'Admin System',
      email: 'admin@example.com',
      passwordHash,
      role: Role.ADMIN,
    });

    const user = await this.usersRepo.save({
      name: 'João Silva',
      email: 'joao@example.com',
      passwordHash,
      role: Role.USER,
    });

    const user2 = await this.usersRepo.save({
      name: 'Maria Santos',
      email: 'maria@example.com',
      passwordHash,
      role: Role.USER,
    });

    this.logger.log('Seed: usuários criados');

    const categories = await this.categoriesRepo.save([
      { name: 'Salário', icon: '💰', color: '#22c55e', type: TransactionType.INCOME, userId: user.id },
      { name: 'Freelance', icon: '💻', color: '#3b82f6', type: TransactionType.INCOME, userId: user.id },
      { name: 'Investimentos', icon: '📈', color: '#8b5cf6', type: TransactionType.INCOME, userId: user.id },
      { name: 'Alimentação', icon: '🍔', color: '#f97316', type: TransactionType.EXPENSE, userId: user.id },
      { name: 'Moradia', icon: '🏠', color: '#ef4444', type: TransactionType.EXPENSE, userId: user.id },
      { name: 'Transporte', icon: '🚗', color: '#eab308', type: TransactionType.EXPENSE, userId: user.id },
      { name: 'Lazer', icon: '🎮', color: '#ec4899', type: TransactionType.EXPENSE, userId: user.id },
      { name: 'Saúde', icon: '🏥', color: '#14b8a6', type: TransactionType.EXPENSE, userId: user.id },
      { name: 'Educação', icon: '📚', color: '#6366f1', type: TransactionType.EXPENSE, userId: user.id },
      { name: 'Assinaturas', icon: '📱', color: '#a855f7', type: TransactionType.EXPENSE, userId: user.id },
      { name: 'Salário', icon: '💰', color: '#22c55e', type: TransactionType.INCOME, userId: user2.id },
      { name: 'Alimentação', icon: '🍔', color: '#f97316', type: TransactionType.EXPENSE, userId: user2.id },
      { name: 'Moradia', icon: '🏠', color: '#ef4444', type: TransactionType.EXPENSE, userId: user2.id },
    ]);

    this.logger.log('Seed: categorias criadas');

    const salario = categories[0];
    const freelance = categories[1];
    const investimentos = categories[2];
    const alimentacao = categories[3];
    const moradia = categories[4];
    const transporte = categories[5];
    const lazer = categories[6];
    const saude = categories[7];
    const educacao = categories[8];
    const assinaturas = categories[9];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const vary = (base: number, pct: number = 0.2): number => {
      const min = base * (1 - pct);
      const max = base * (1 + pct);
      return Math.round((min + Math.random() * (max - min)) * 100) / 100;
    };

    const varyFixed = (base: number, min: number, max: number): number => {
      return Math.round((min + Math.random() * (max - min)) * 100) / 100;
    };

    const transactions: Partial<Transaction>[] = [];

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const dayBetween = (min: number, max: number): number => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    for (let i = 0; i < 6; i++) {
      const month = currentMonth - i;
      const year = month < 0 ? currentYear - 1 : currentYear;
      const actualMonth = month < 0 ? month + 12 : month;
      const monthName = monthNames[actualMonth];

      const salarioBase = 8500;
      const temBonus = i === 0 || i === 3;
      const salarioFinal = temBonus ? salarioBase + varyFixed(1200, 800, 2000) : salarioBase;

      transactions.push(
        { description: 'Salário mensal', amount: salarioFinal, type: TransactionType.INCOME, date: new Date(year, actualMonth, dayBetween(3, 7)), categoryId: salario.id, userId: user.id, notes: temBonus ? 'Salário + bônus' : 'Salário líquido', recurring: true },
        { description: 'Projeto freelance web', amount: varyFixed(2200, 1200, 3800), type: TransactionType.INCOME, date: new Date(year, actualMonth, dayBetween(12, 18)), categoryId: freelance.id, userId: user.id, notes: pick(['Site para loja', 'Landing page', 'E-commerce', 'App web']), recurring: false },
        { description: 'Dividendos FIIs', amount: varyFixed(350, 150, 550), type: TransactionType.INCOME, date: new Date(year, actualMonth, dayBetween(18, 24)), categoryId: investimentos.id, userId: user.id, notes: 'Rendimento mensal', recurring: true },
        { description: 'Supermercado', amount: varyFixed(890, 550, 1200), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(2, 5)), categoryId: alimentacao.id, userId: user.id, recurring: true },
        { description: 'Padaria', amount: varyFixed(45, 15, 80), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(5, 10)), categoryId: alimentacao.id, userId: user.id, recurring: false },
        { description: pick(['iFood', 'Rappi', 'Uber Eats']), amount: varyFixed(127, 40, 280), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(10, 16)), categoryId: alimentacao.id, userId: user.id, notes: pick(['Jantar', 'Almoço', 'Lanche']), recurring: false },
        { description: 'Aluguel', amount: i === 0 ? 2163 : 2100, type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(1, 3)), categoryId: moradia.id, userId: user.id, notes: 'Apartamento 2 quartos', recurring: true },
        { description: 'Condomínio', amount: varyFixed(450, 400, 520), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(3, 7)), categoryId: moradia.id, userId: user.id, recurring: true },
        { description: 'Conta de luz', amount: varyFixed(180, 80, 350), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(8, 14)), categoryId: moradia.id, userId: user.id, notes: pick(['CPFL', 'Enel']), recurring: true },
        { description: 'Gasolina', amount: varyFixed(320, 150, 500), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(6, 12)), categoryId: transporte.id, userId: user.id, recurring: true },
        { description: 'Uber', amount: varyFixed(90, 20, 200), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(12, 20)), categoryId: transporte.id, userId: user.id, recurring: false },
        { description: pick(['Cinema', 'Teatro', 'Show']), amount: varyFixed(60, 30, 120), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(15, 22)), categoryId: lazer.id, userId: user.id, recurring: false },
        { description: 'PlayStation Plus', amount: 39.9, type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(18, 22)), categoryId: lazer.id, userId: user.id, recurring: true },
        { description: 'Consulta médica', amount: varyFixed(250, 120, 450), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(18, 26)), categoryId: saude.id, userId: user.id, notes: pick(['Clínico geral', 'Oftalmologista', 'Dermatologista']), recurring: false },
        { description: 'Farmácia', amount: varyFixed(87, 20, 180), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(22, 28)), categoryId: saude.id, userId: user.id, recurring: false },
        { description: 'Curso online', amount: varyFixed(197, 30, 400), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(14, 20)), categoryId: educacao.id, userId: user.id, notes: pick(['Udemy', 'Alura', 'Coursera']), recurring: false },
        { description: 'Netflix', amount: pick([39.9, 39.9, 55.9]), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(1, 4)), categoryId: assinaturas.id, userId: user.id, recurring: true },
        { description: 'Spotify', amount: 21.9, type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(1, 4)), categoryId: assinaturas.id, userId: user.id, recurring: true },
        { description: 'Academia', amount: varyFixed(99, 70, 150), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(3, 8)), categoryId: assinaturas.id, userId: user.id, recurring: true },
      );

      if (i === 0) {
        transactions.push(
          { description: 'Rendimento poupança', amount: varyFixed(120, 60, 200), type: TransactionType.INCOME, date: new Date(year, actualMonth, dayBetween(8, 14)), categoryId: investimentos.id, userId: user.id, notes: 'Poupança', recurring: false },
          { description: 'Plano odontológico', amount: varyFixed(85, 60, 120), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(12, 18)), categoryId: saude.id, userId: user.id, recurring: true },
        );
      }

      if (i === 1) {
        transactions.push(
          { description: 'Conta de água', amount: varyFixed(95, 50, 160), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(10, 15)), categoryId: moradia.id, userId: user.id, notes: 'SANEAGO', recurring: false },
          { description: 'Internet', amount: varyFixed(129, 100, 150), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(5, 10)), categoryId: assinaturas.id, userId: user.id, notes: pick(['Vivo Fibra', 'Claro']), recurring: true },
        );
      }

      if (i === 2) {
        transactions.push(
          { description: 'Manutenção carro', amount: varyFixed(380, 150, 600), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(20, 27)), categoryId: transporte.id, userId: user.id, notes: pick(['Troca de óleo', 'Revisão geral', 'Pneus']), recurring: false },
          { description: 'Seguro auto', amount: varyFixed(420, 350, 500), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(8, 12)), categoryId: transporte.id, userId: user.id, notes: 'Seguro anual (parcela)', recurring: false },
        );
      }

      if (i === 3) {
        transactions.push(
          { description: 'Conta de água', amount: varyFixed(95, 45, 170), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(8, 14)), categoryId: moradia.id, userId: user.id, notes: 'SANEAGO', recurring: false },
          { description: 'Manutenção carro', amount: varyFixed(350, 120, 550), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(18, 25)), categoryId: transporte.id, userId: user.id, recurring: false },
        );
      }

      if (i === 4) {
        transactions.push(
          { description: 'Conta de água', amount: varyFixed(95, 40, 155), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(6, 12)), categoryId: moradia.id, userId: user.id, notes: 'SANEAGO', recurring: false },
          { description: 'Manutenção carro', amount: varyFixed(350, 100, 500), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(22, 28)), categoryId: transporte.id, userId: user.id, recurring: false },
          { description: 'Curso online', amount: varyFixed(297, 150, 450), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(10, 16)), categoryId: educacao.id, userId: user.id, notes: 'Workshop presencial', recurring: false },
        );
      }

      if (i === 5) {
        transactions.push(
          { description: 'Conta de água', amount: varyFixed(95, 50, 165), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(10, 16)), categoryId: moradia.id, userId: user.id, notes: 'SANEAGO', recurring: false },
          { description: 'Internet', amount: varyFixed(129, 100, 150), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(5, 10)), categoryId: assinaturas.id, userId: user.id, notes: 'Vivo Fibra', recurring: true },
        );
      }

      if (i % 2 === 0) {
        transactions.push(
          { description: 'Compra online', amount: varyFixed(250, 60, 700), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(18, 26)), categoryId: lazer.id, userId: user.id, notes: pick(['Amazon', 'Mercado Livre', 'Shopee']), recurring: false },
        );
      }

      if (i % 3 === 0) {
        transactions.push(
          { description: 'Freela extra', amount: varyFixed(1800, 800, 3200), type: TransactionType.INCOME, date: new Date(year, actualMonth, dayBetween(16, 22)), categoryId: freelance.id, userId: user.id, notes: pick(['App mobile', 'Sistema web', 'API backend']), recurring: false },
        );
      }

      if (i === 0) {
        transactions.push(
          { description: 'Restaurante especial', amount: varyFixed(150, 80, 250), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(18, 24)), categoryId: alimentacao.id, userId: user.id, notes: 'Jantar especial', recurring: false },
          { description: 'Presente', amount: varyFixed(120, 50, 200), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(22, 28)), categoryId: lazer.id, userId: user.id, notes: 'Presente aniversário', recurring: false },
        );
      }

      if (i === 1) {
        transactions.push(
          { description: 'Freela extra app mobile', amount: varyFixed(2000, 1200, 3000), type: TransactionType.INCOME, date: new Date(year, actualMonth, dayBetween(14, 20)), categoryId: freelance.id, userId: user.id, notes: 'App para startup', recurring: false },
          { description: 'Restaurante', amount: varyFixed(140, 60, 220), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(20, 26)), categoryId: alimentacao.id, userId: user.id, notes: 'Comemoração projeto', recurring: false },
        );
      }

      if (i === 2) {
        transactions.push(
          { description: 'Compra online', amount: varyFixed(350, 100, 600), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(24, 28)), categoryId: lazer.id, userId: user.id, notes: 'Black Friday', recurring: false },
        );
      }

      if (i === 3) {
        transactions.push(
          { description: 'Restaurante', amount: varyFixed(130, 55, 210), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(22, 27)), categoryId: alimentacao.id, userId: user.id, notes: 'Natal', recurring: false },
          { description: 'Presentes Natal', amount: varyFixed(450, 200, 700), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(18, 24)), categoryId: lazer.id, userId: user.id, notes: 'Presentes de Natal', recurring: false },
          { description: 'Freela extra', amount: varyFixed(1500, 800, 2500), type: TransactionType.INCOME, date: new Date(year, actualMonth, dayBetween(10, 16)), categoryId: freelance.id, userId: user.id, notes: 'Projeto fim de ano', recurring: false },
        );
      }

      if (i === 4) {
        transactions.push(
          { description: 'Freela extra app mobile', amount: varyFixed(1600, 900, 2600), type: TransactionType.INCOME, date: new Date(year, actualMonth, dayBetween(16, 22)), categoryId: freelance.id, userId: user.id, notes: 'App para startup', recurring: false },
          { description: 'Restaurante', amount: varyFixed(115, 50, 190), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(18, 24)), categoryId: alimentacao.id, userId: user.id, recurring: false },
        );
      }

      if (i === 5) {
        transactions.push(
          { description: 'Conta de luz (verão)', amount: varyFixed(280, 180, 400), type: TransactionType.EXPENSE, date: new Date(year, actualMonth, dayBetween(8, 14)), categoryId: moradia.id, userId: user.id, notes: 'Conta mais alta (verão)', recurring: false },
          { description: 'Freela extra', amount: varyFixed(1400, 700, 2200), type: TransactionType.INCOME, date: new Date(year, actualMonth, dayBetween(14, 20)), categoryId: freelance.id, userId: user.id, notes: 'Projeto freelance', recurring: false },
        );
      }
    }

    await this.transactionsRepo.save(transactions);
    this.logger.log('Seed: transações criadas');

    const budgets: Partial<Budget>[] = [];
    for (let i = 0; i < 3; i++) {
      const month = currentMonth - i;
      const year = month < 0 ? currentYear - 1 : currentYear;
      const actualMonth = month < 0 ? month + 12 : month;

      budgets.push(
        { categoryId: alimentacao.id, userId: user.id, amount: 1200, month: actualMonth + 1, year, spent: varyFixed(1063, 700, 1300) },
        { categoryId: moradia.id, userId: user.id, amount: 2800, month: actualMonth + 1, year, spent: varyFixed(2730, 2500, 2900) },
        { categoryId: transporte.id, userId: user.id, amount: 500, month: actualMonth + 1, year, spent: varyFixed(410, 200, 550) },
        { categoryId: lazer.id, userId: user.id, amount: 200, month: actualMonth + 1, year, spent: varyFixed(100, 40, 250) },
        { categoryId: saude.id, userId: user.id, amount: 400, month: actualMonth + 1, year, spent: varyFixed(337, 100, 450) },
        { categoryId: educacao.id, userId: user.id, amount: 300, month: actualMonth + 1, year, spent: varyFixed(197, 0, 350) },
        { categoryId: assinaturas.id, userId: user.id, amount: 200, month: actualMonth + 1, year, spent: varyFixed(161, 80, 200) },
      );
    }

    await this.budgetsRepo.save(budgets);
    this.logger.log('Seed: orçamentos criados');

    await this.goalsRepo.save([
      { name: 'Reserva de emergência', targetAmount: 30000, currentAmount: 18500, deadline: new Date(currentYear + 1, 5, 1), userId: user.id, status: GoalStatus.ACTIVE },
      { name: 'Viagem Europa', targetAmount: 15000, currentAmount: 4200, deadline: new Date(currentYear + 1, 11, 1), userId: user.id, status: GoalStatus.ACTIVE },
      { name: 'Novo notebook', targetAmount: 8000, currentAmount: 8000, deadline: new Date(currentYear, 2, 1), userId: user.id, status: GoalStatus.COMPLETED },
      { name: 'Curso de inglês', targetAmount: 5000, currentAmount: 2100, deadline: new Date(currentYear + 1, 8, 1), userId: user.id, status: GoalStatus.ACTIVE },
    ]);

    this.logger.log('Seed: metas criadas');

    await this.jobsRepo.save([
      { queueName: 'reports', type: 'generate_monthly_report', status: JobStatus.COMPLETED, payload: { month: currentMonth + 1, year: currentYear }, requestedById: user.id },
      { queueName: 'reports', type: 'generate_annual_report', status: JobStatus.QUEUED, payload: { year: currentYear }, requestedById: user.id },
      { queueName: 'ai', type: 'financial_analysis', status: JobStatus.COMPLETED, payload: { type: 'monthly_summary', period: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}` }, requestedById: user.id },
      { queueName: 'exports', type: 'export_csv', status: JobStatus.FAILED, payload: { table: 'transactions', format: 'csv' }, requestedById: user.id },
    ]);

    this.logger.log('Seed: jobs criados');

    await this.filesRepo.save([
      { filename: 'relatorio-janeiro-2025.pdf', originalName: 'Relatório Janeiro 2025.pdf', mimetype: 'application/pdf', size: 245760, path: '/uploads/relatorio-janeiro-2025.pdf', uploadedById: user.id },
      { filename: 'comprovante-pagamento.pdf', originalName: 'Comprovante Pagamento.pdf', mimetype: 'application/pdf', size: 102400, path: '/uploads/comprovante-pagamento.pdf', uploadedById: user.id },
      { filename: 'extrato-banco.csv', originalName: 'Extrato Banco.csv', mimetype: 'text/csv', size: 51200, path: '/uploads/extrato-banco.csv', uploadedById: user.id },
    ]);

    this.logger.log('Seed: arquivos criados');

    await this.aiAnalysesRepo.save([
      {
        userId: user.id,
        type: AnalysisType.MONTHLY_SUMMARY,
        period: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        result: {
          totalIncome: 11050,
          totalExpenses: 4742.25,
          balance: 6307.75,
          topCategories: [{ name: 'Moradia', amount: 2730.5 }, { name: 'Alimentação', amount: 1063.65 }],
          savingsRate: '57.1%',
        },
      },
      {
        userId: user.id,
        type: AnalysisType.TIPS,
        period: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        result: {
          tips: [
            'Considere reduzir gastos com delivery, representam 12% do orçamento de alimentação.',
            'O gasto com transporte está dentro do orçamento, mas pode ser otimizado com transporte público.',
            'Excelente taxa de poupança! Continue assim para atingir a meta de reserva de emergência.',
          ],
        },
      },
      {
        userId: user.id,
        type: AnalysisType.FORECAST,
        period: `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}`,
        result: {
          projectedExpenses: 4800,
          projectedIncome: 11050,
          projectedBalance: 6250,
          alert: 'Gastos com assinaturas podem aumentar com renovações anuais.',
        },
      },
    ]);

    this.logger.log('Seed: análises de IA criadas');

    const PDFDocument = require('pdfkit');

    const generateSeedPdf = (title: string, content: string): string => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.fontSize(18).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).text(content);
      doc.end();
      const buffer = Buffer.concat(chunks);
      return `data:application/pdf;base64,${buffer.toString('base64')}`;
    };

    await this.reportsRepo.save([
      { userId: user.id, type: ReportType.MONTHLY, period: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`, fileUrl: generateSeedPdf(`Relatório Mensal - ${monthNames[currentMonth]} ${currentYear}`, `Receitas e despesas do mês de ${monthNames[currentMonth]} de ${currentYear}.\n\nEste relatório foi gerado automaticamente pelo sistema de seed.`) },
      { userId: user.id, type: ReportType.ANNUAL, period: `${currentYear}`, fileUrl: generateSeedPdf(`Relatório Anual - ${currentYear}`, `Resumo financeiro do ano de ${currentYear}.\n\nEste relatório foi gerado automaticamente pelo sistema de seed.`) },
      { userId: user.id, type: ReportType.EXTRACT, period: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`, fileUrl: generateSeedPdf(`Extrato - ${monthNames[currentMonth]} ${currentYear}`, `Extrato de transações do mês de ${monthNames[currentMonth]} de ${currentYear}.\n\nEste relatório foi gerado automaticamente pelo sistema de seed.`) },
    ]);

    this.logger.log('Seed: relatórios criados');
    this.logger.log('Seed: conclusão! Todos os dados foram inseridos com sucesso.');
  }
}
