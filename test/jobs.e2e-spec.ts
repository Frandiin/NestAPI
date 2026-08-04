import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './app.test-module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('JobsModule & Queue (E2E - Mocked)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'Password123!' });
    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/jobs', () => {
    it('deve enfileirar um novo job com sucesso usando o mock da fila (201 Created)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'generate_pdf_report',
          payload: { reportId: 'rep_987654' },
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('queueName', 'tasks-queue');
      expect(response.body.data).toHaveProperty('type', 'generate_pdf_report');
    });

    it('deve recusar criação de job sem estar autenticado (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .send({ type: 'task_unauthorized' })
        .expect(401);
    });
  });
});
