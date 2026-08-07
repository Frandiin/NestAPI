import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GeneratedReport } from '../finance/entities/generated-report.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { Budget } from '../finance/entities/budget.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GeneratedReport, Transaction, Budget]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
