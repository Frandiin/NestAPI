import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export const TASKS_QUEUE_NAME = 'tasks-queue';

@Processor(TASKS_QUEUE_NAME)
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`[Processando Job] ID: ${job.id} | Nome: ${job.name} | Dados: ${JSON.stringify(job.data)}`);

    // Simulação do processamento assíncrono do job
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.log(`[Job Concluído] ID: ${job.id}`);
    return { success: true, processedAt: new Date() };
  }
}
