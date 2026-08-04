import { ReportsService } from '../../src/modules/reports/reports.service';

export const MockReportsServiceProvider = {
  provide: ReportsService,
  useValue: {
    generateMonthlyReport: jest.fn().mockImplementation((userId: string, month: number, year: number) => {
      return Promise.resolve(Buffer.from('PDF mock content'));
    }),
    generateAnnualReport: jest.fn().mockImplementation((userId: string, year: number) => {
      return Promise.resolve(Buffer.from('PDF mock content'));
    }),
    generateExtract: jest.fn().mockImplementation((userId: string, startDate: string, endDate: string) => {
      return Promise.resolve(Buffer.from('PDF mock content'));
    }),
    generateReceipt: jest.fn().mockImplementation((transactionId: string, userId: string) => {
      return Promise.resolve(Buffer.from('PDF mock content'));
    }),
    saveReport: jest.fn().mockImplementation((userId: string, type: any, period: string, fileUrl: string) => {
      return Promise.resolve({
        id: 'report_mock_1',
        userId,
        type,
        period,
        fileUrl,
        createdAt: new Date(),
      });
    }),
    getReports: jest.fn().mockResolvedValue([
      {
        id: 'report_mock_1',
        userId: '1',
        type: 'monthly',
        period: '8/2026',
        fileUrl: 'data:application/pdf;base64,mock',
        createdAt: new Date(),
      },
    ]),
    getReportById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve({
        id,
        userId: '1',
        type: 'monthly',
        period: '8/2026',
        fileUrl: 'data:application/pdf;base64,mock',
        createdAt: new Date(),
      });
    }),
  },
};

import { getQueueToken } from '@nestjs/bullmq';
import { TASKS_QUEUE_NAME } from '../../src/modules/jobs/jobs.processor';

export const MockQueueProvider = {
  provide: getQueueToken(TASKS_QUEUE_NAME),
  useValue: {
    add: jest.fn().mockImplementation((name: string, data: any) => {
      return Promise.resolve({
        id: `job_mock_${Date.now()}`,
        name,
        data,
      });
    }),
  },
};
