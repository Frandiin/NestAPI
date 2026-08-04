import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { MonthlyAnalysisDto, ForecastDto, ComparisonDto } from '../finance/dto/analysis-request.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TASKS_QUEUE_NAME } from '../jobs/jobs.processor';

@ApiTags('AI Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @InjectQueue(TASKS_QUEUE_NAME) private readonly tasksQueue: Queue,
  ) {}

  @Post('analyze/monthly')
  @ApiOperation({ summary: 'Resumo mensal inteligente via IA' })
  async analyzeMonthly(
    @Body() dto: MonthlyAnalysisDto,
    @CurrentUser('sub') userId: string,
  ) {
    const job = await this.tasksQueue.add('ai_monthly_summary', {
      userId,
      month: dto.month,
      year: dto.year,
    });
    return { jobId: job.id, status: 'queued', type: 'monthly_summary' };
  }

  @Post('analyze/forecast')
  @ApiOperation({ summary: 'Previsao de gastos via IA' })
  async analyzeForecast(
    @Body() dto: ForecastDto,
    @CurrentUser('sub') userId: string,
  ) {
    const job = await this.tasksQueue.add('ai_forecast', {
      userId,
      months: dto.months,
    });
    return { jobId: job.id, status: 'queued', type: 'forecast' };
  }

  @Post('analyze/tips')
  @ApiOperation({ summary: 'Dicas de economia via IA' })
  async analyzeTips(@CurrentUser('sub') userId: string) {
    const job = await this.tasksQueue.add('ai_tips', { userId });
    return { jobId: job.id, status: 'queued', type: 'tips' };
  }

  @Post('analyze/detection')
  @ApiOperation({ summary: 'Deteccao de gastos incomuns via IA' })
  async analyzeDetection(@CurrentUser('sub') userId: string) {
    const job = await this.tasksQueue.add('ai_detection', { userId });
    return { jobId: job.id, status: 'queued', type: 'detection' };
  }

  @Post('analyze/comparison')
  @ApiOperation({ summary: 'Comparativo de periodos via IA' })
  async analyzeComparison(
    @Body() dto: ComparisonDto,
    @CurrentUser('sub') userId: string,
  ) {
    const job = await this.tasksQueue.add('ai_comparison', {
      userId,
      period1: dto.period1,
      period2: dto.period2,
    });
    return { jobId: job.id, status: 'queued', type: 'comparison' };
  }

  @Get('analyses')
  @ApiOperation({ summary: 'Historico de analises' })
  async getAnalyses(@CurrentUser('sub') userId: string) {
    return this.aiService.getAnalyses(userId);
  }

  @Get('analyses/:id')
  @ApiOperation({ summary: 'Resultado de uma analise' })
  async getAnalysisById(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.aiService.getAnalysisById(id, userId);
  }
}
