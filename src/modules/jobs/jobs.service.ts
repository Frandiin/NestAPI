import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { CreateJobDto, JobResponseDto } from './dto/create-job.dto';
import { TASKS_QUEUE_NAME } from './jobs.processor';
import { Job } from './entities/job.entity';
import { JobStatus } from '../../common/enums/job-status.enum';

export const QUEUE_PROVIDER_TOKEN = 'QUEUE_PROVIDER_TOKEN';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Optional()
    @InjectQueue(TASKS_QUEUE_NAME)
    private readonly tasksQueue?: Queue,
    @InjectRepository(Job)
    private readonly jobsRepo?: Repository<Job>,
  ) {}

  async addJob(createJobDto: CreateJobDto, userId: string): Promise<JobResponseDto> {
    const payload = {
      ...createJobDto.payload,
      requestedBy: userId,
      createdAt: new Date(),
    };

    let status = JobStatus.QUEUED;
    let queueId: string | undefined;

    if (this.tasksQueue && typeof this.tasksQueue.add === 'function') {
      try {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const job = await this.tasksQueue.add(createJobDto.type, payload, { jobId });
        queueId = String(job.id || jobId);
        this.logger.log(`Job enfileirado no BullMQ com sucesso: ID ${queueId}`);
      } catch (err) {
        this.logger.warn(`Erro ao conectar ao Redis/BullMQ. Fallback ativado: ${err.message}`);
        status = JobStatus.QUEUED;
      }
    }

    if (this.jobsRepo) {
      const jobRecord = this.jobsRepo.create({
        queueName: TASKS_QUEUE_NAME,
        type: createJobDto.type,
        status,
        payload,
        requestedById: userId,
      });
      const saved = await this.jobsRepo.save(jobRecord);

      return {
        id: saved.id,
        queueName: saved.queueName,
        type: saved.type,
        status: saved.status,
        createdAt: saved.createdAt,
      };
    }

    return {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      queueName: TASKS_QUEUE_NAME,
      type: createJobDto.type,
      status,
      createdAt: new Date(),
    };
  }
}
