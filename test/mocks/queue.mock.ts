import { getQueueToken } from '@nestjs/bullmq';
import { TASKS_QUEUE_NAME, JobsProcessor } from '../../src/modules/jobs/jobs.processor';

export const mockQueue = {
  add: jest.fn().mockImplementation((name, data, opts) => {
    return Promise.resolve({
      id: opts?.jobId || `mock_job_${Date.now()}`,
      name,
      data,
    });
  }),
  getJob: jest.fn(),
};

export const MockQueueProvider = {
  provide: getQueueToken(TASKS_QUEUE_NAME),
  useValue: mockQueue,
};

export const MockJobsProcessorProvider = {
  provide: JobsProcessor,
  useValue: {
    process: jest.fn(),
  },
};
