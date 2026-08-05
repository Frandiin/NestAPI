import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../users/entities/user.entity';
import { Category } from '../finance/entities/category.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { Budget } from '../finance/entities/budget.entity';
import { Goal } from '../finance/entities/goal.entity';
import { Job } from '../jobs/entities/job.entity';
import { File } from '../files/entities/file.entity';
import { AiAnalysis } from '../finance/entities/ai-analysis.entity';
import { GeneratedReport } from '../finance/entities/generated-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Category,
      Transaction,
      Budget,
      Goal,
      Job,
      File,
      AiAnalysis,
      GeneratedReport,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
