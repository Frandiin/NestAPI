import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiAnalysis } from '../finance/entities/ai-analysis.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { TASKS_QUEUE_NAME } from '../jobs/jobs.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiAnalysis, Transaction]),
    BullModule.registerQueue({ name: TASKS_QUEUE_NAME }),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
