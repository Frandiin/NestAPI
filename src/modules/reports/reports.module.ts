import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GeneratedReport } from '../finance/entities/generated-report.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { Budget } from '../finance/entities/budget.entity';
import { TASKS_QUEUE_NAME } from '../jobs/jobs.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([GeneratedReport, Transaction, Budget]),
    BullModule.registerQueue({ name: TASKS_QUEUE_NAME }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
