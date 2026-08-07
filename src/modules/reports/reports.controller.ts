import { Body, Controller, Get, Param, Post, Res, StreamableFile, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { MonthlyReportDto, AnnualReportDto, ExtractReportDto, ReceiptReportDto } from '../finance/dto/report-request.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
  ) {}

  @Post('monthly')
  @ApiOperation({ summary: 'Gerar relatorio mensal (PDF)' })
  async generateMonthlyReport(
    @Body() dto: MonthlyReportDto,
    @CurrentUser('sub') userId: string,
  ) {
    const buffer = await this.reportsService.generateMonthlyReport(userId, dto.month, dto.year);
    const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const report = await this.reportsService.saveReport(userId, 'monthly' as any, `${dto.month}/${dto.year}`, base64);
    return { reportId: report.id, status: 'completed', type: 'monthly' };
  }

  @Post('annual')
  @ApiOperation({ summary: 'Gerar relatorio anual (PDF)' })
  async generateAnnualReport(
    @Body() dto: AnnualReportDto,
    @CurrentUser('sub') userId: string,
  ) {
    const buffer = await this.reportsService.generateAnnualReport(userId, dto.year);
    const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const report = await this.reportsService.saveReport(userId, 'annual' as any, `${dto.year}`, base64);
    return { reportId: report.id, status: 'completed', type: 'annual' };
  }

  @Post('extract')
  @ApiOperation({ summary: 'Gerar extrato de transacoes (PDF)' })
  async generateExtract(
    @Body() dto: ExtractReportDto,
    @CurrentUser('sub') userId: string,
  ) {
    const buffer = await this.reportsService.generateExtract(userId, dto.startDate, dto.endDate);
    const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const report = await this.reportsService.saveReport(userId, 'extract' as any, `${dto.startDate} a ${dto.endDate}`, base64);
    return { reportId: report.id, status: 'completed', type: 'extract' };
  }

  @Post('receipt/:transactionId')
  @ApiOperation({ summary: 'Gerar comprovante de transacao (PDF)' })
  async generateReceipt(
    @Param('transactionId') transactionId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const buffer = await this.reportsService.generateReceipt(transactionId, userId);
    const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const report = await this.reportsService.saveReport(userId, 'receipt' as any, transactionId, base64);
    return { reportId: report.id, status: 'completed', type: 'receipt' };
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
    const report = await this.reportsService.getReportById(id, userId);

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
