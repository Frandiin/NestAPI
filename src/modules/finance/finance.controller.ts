import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinanceService } from './finance.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { AddGoalAmountDto } from './dto/add-goal-amount.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ========== CATEGORIES ==========

  @Post('categories')
  @ApiOperation({ summary: 'Criar categoria' })
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.createCategory(dto, userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias' })
  async getCategories(@CurrentUser('sub') userId: string) {
    return this.financeService.getCategories(userId);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Atualizar categoria' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCategoryDto>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.updateCategory(id, dto, userId);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Deletar categoria' })
  async deleteCategory(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.deleteCategory(id, userId);
  }

  // ========== TRANSACTIONS ==========

  @Post('transactions')
  @ApiOperation({ summary: 'Criar transacao' })
  async createTransaction(
    @Body() dto: CreateTransactionDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.createTransaction(dto, userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Listar transacoes com filtros' })
  async getTransactions(
    @Query() query: QueryTransactionsDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.getTransactions(userId, query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Buscar transacao por ID' })
  async getTransactionById(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.getTransactionById(id, userId);
  }

  @Put('transactions/:id')
  @ApiOperation({ summary: 'Atualizar transacao' })
  async updateTransaction(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTransactionDto>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.updateTransaction(id, dto, userId);
  }

  @Delete('transactions/:id')
  @ApiOperation({ summary: 'Deletar transacao' })
  async deleteTransaction(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.deleteTransaction(id, userId);
  }

  // ========== BUDGETS ==========

  @Post('budgets')
  @ApiOperation({ summary: 'Criar orcamento' })
  async createBudget(
    @Body() dto: CreateBudgetDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.createBudget(dto, userId);
  }

  @Get('budgets')
  @ApiOperation({ summary: 'Listar orcamentos do mes' })
  async getBudgets(
    @Query('month') month: number,
    @Query('year') year: number,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.getBudgets(userId, month, year);
  }

  @Get('budgets/status')
  @ApiOperation({ summary: 'Status dos orcamentos (gasto vs limite)' })
  async getBudgetStatus(
    @Query('month') month: number,
    @Query('year') year: number,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.getBudgetStatus(userId, month, year);
  }

  @Put('budgets/:id')
  @ApiOperation({ summary: 'Atualizar orcamento' })
  async updateBudget(
    @Param('id') id: string,
    @Body() dto: Partial<CreateBudgetDto>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.updateBudget(id, dto, userId);
  }

  // ========== GOALS ==========

  @Post('goals')
  @ApiOperation({ summary: 'Criar meta financeira' })
  async createGoal(
    @Body() dto: CreateGoalDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.createGoal(dto, userId);
  }

  @Get('goals')
  @ApiOperation({ summary: 'Listar metas' })
  async getGoals(@CurrentUser('sub') userId: string) {
    return this.financeService.getGoals(userId);
  }

  @Put('goals/:id/add')
  @ApiOperation({ summary: 'Adicionar valor a meta' })
  async addGoalAmount(
    @Param('id') id: string,
    @Body() dto: AddGoalAmountDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.addGoalAmount(id, dto.amount, userId);
  }

  @Delete('goals/:id')
  @ApiOperation({ summary: 'Deletar meta' })
  async deleteGoal(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.deleteGoal(id, userId);
  }

  // ========== DASHBOARD ==========

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard financeiro do mes' })
  async getDashboard(
    @Query('month') month: number,
    @Query('year') year: number,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.getDashboard(userId, month, year);
  }

  @Get('dashboard/compare')
  @ApiOperation({ summary: 'Comparar dois periodos' })
  async comparePeriods(
    @Query('month1') month1: number,
    @Query('year1') year1: number,
    @Query('month2') month2: number,
    @Query('year2') year2: number,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.comparePeriods(
      userId,
      { month: month1, year: year1 },
      { month: month2, year: year2 },
    );
  }

  @Get('dashboard/history')
  @ApiOperation({ summary: 'Historico dos ultimos meses' })
  async getMonthlyHistory(
    @Query('months') months: number,
    @CurrentUser('sub') userId: string,
  ) {
    return this.financeService.getMonthlyHistory(userId, months || 6);
  }
}
