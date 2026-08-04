import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './app.test-module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('ReportsModule (E2E - Mocked)', () => {
  let app: INestApplication;
  let userToken: string;

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

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'Password123!' });
    userToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/reports/monthly', () => {
    it('deve gerar relatorio mensal', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/monthly')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ month: 8, year: 2026 })
        .expect(201);

      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.type).toBe('monthly');
    });
  });

  describe('POST /api/v1/reports/annual', () => {
    it('deve gerar relatorio anual', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/annual')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ year: 2026 })
        .expect(201);

      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.type).toBe('annual');
    });
  });

  describe('POST /api/v1/reports/extract', () => {
    it('deve gerar extrato de transacoes', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/extract')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ startDate: '2026-08-01', endDate: '2026-08-31' })
        .expect(201);

      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.type).toBe('extract');
    });
  });

  describe('POST /api/v1/reports/receipt/:transactionId', () => {
    it('deve gerar comprovante de transacao', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reports/receipt/tx_mock_1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.type).toBe('receipt');
    });
  });

  describe('GET /api/v1/reports', () => {
    it('deve listar relatorios gerados', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('deve retornar 401 sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports')
        .expect(401);
    });
  });

  describe('GET /api/v1/reports/:id/download', () => {
    it('deve baixar PDF do relatorio', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/report_mock_1/download')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
    });
  });
});
