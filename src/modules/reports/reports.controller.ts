import { Body, Controller, Get, Param, Post, Res, StreamableFile, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { MonthlyReportDto, AnnualReportDto, ExtractReportDto, ReceiptReportDto } from '../finance/dto/report-request.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TASKS_QUEUE_NAME } from '../jobs/jobs.processor';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    @InjectQueue(TASKS_QUEUE_NAME) private readonly tasksQueue: Queue,
  ) {}

  @Post('monthly')
  @ApiOperation({ summary: 'Gerar relatorio mensal (PDF)' })
  async generateMonthlyReport(
    @Body() dto: MonthlyReportDto,
    @CurrentUser('sub') userId: string,
  ) {
    const job = await this.tasksQueue.add('report_monthly', {
      userId,
      month: dto.month,
      year: dto.year,
    });
    return { jobId: job.id, status: 'queued', type: 'monthly' };
  }

  @Post('annual')
  @ApiOperation({ summary: 'Gerar relatorio anual (PDF)' })
  async generateAnnualReport(
    @Body() dto: AnnualReportDto,
    @CurrentUser('sub') userId: string,
  ) {
    const job = await this.tasksQueue.add('report_annual', {
      userId,
      year: dto.year,
    });
    return { jobId: job.id, status: 'queued', type: 'annual' };
  }

  @Post('extract')
  @ApiOperation({ summary: 'Gerar extrato de transacoes (PDF)' })
  async generateExtract(
    @Body() dto: ExtractReportDto,
    @CurrentUser('sub') userId: string,
  ) {
    const job = await this.tasksQueue.add('report_extract', {
      userId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
    return { jobId: job.id, status: 'queued', type: 'extract' };
  }

  @Post('receipt/:transactionId')
  @ApiOperation({ summary: 'Gerar comprovante de transacao (PDF)' })
  async generateReceipt(
    @Param('transactionId') transactionId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const job = await this.tasksQueue.add('report_receipt', {
      userId,
      transactionId,
    });
    return { jobId: job.id, status: 'queued', type: 'receipt' };
  }

  @Get()
  @ApiOperation({ summary: 'Listar relatorios gerados' })
  async getReports(@CurrentUser('sub') userId: string) {
    return this.reportsService.getReports(userId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Baixar PDF do relatorio' })
  async downloadReport(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Res() res: Response,
  ) {
    let report: any = null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      report = await this.reportsService.getReportById(id, userId);
    } else {
      const job = await this.tasksQueue.getJob(id);
      if (job && job.returnvalue?.reportId) {
        report = await this.reportsService.getReportById(job.returnvalue.reportId, userId);
      }
    }

    if (!report) {
      throw new NotFoundException('Relatorio nao encontrado');
    }

    if (report.fileUrl.startsWith('data:')) {
      const base64Data = report.fileUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.type}-${report.period}.pdf"`,
      });
      res.send(buffer);
    } else {
      res.redirect(report.fileUrl);
    }
  }
}
