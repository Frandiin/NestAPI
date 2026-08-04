import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobsProcessor, TASKS_QUEUE_NAME } from './jobs.processor';
import { Job } from './entities/job.entity';
import { GeneratedReport } from '../finance/entities/generated-report.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { Budget } from '../finance/entities/budget.entity';
import { AiAnalysis } from '../finance/entities/ai-analysis.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, GeneratedReport, Transaction, Budget, AiAnalysis]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
        },
      }),
    }),
    BullModule.registerQueue({
      name: TASKS_QUEUE_NAME,
    }),
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule {}
