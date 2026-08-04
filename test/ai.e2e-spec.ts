import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './app.test-module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('AiModule (E2E - Mocked)', () => {
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

  describe('POST /api/v1/ai/analyze/monthly', () => {
    it('deve gerar resumo mensal via IA', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/analyze/monthly')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ month: 8, year: 2026 })
        .expect(201);

      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.type).toBe('monthly_summary');
    });
  });

  describe('POST /api/v1/ai/analyze/forecast', () => {
    it('deve gerar previsao de gastos via IA', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/analyze/forecast')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ months: 3 })
        .expect(201);

      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.type).toBe('forecast');
    });
  });

  describe('POST /api/v1/ai/analyze/tips', () => {
    it('deve gerar dicas de economia via IA', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/analyze/tips')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.type).toBe('tips');
    });
  });

  describe('POST /api/v1/ai/analyze/detection', () => {
    it('deve detectar gastos incomuns via IA', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/analyze/detection')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.type).toBe('detection');
    });
  });

  describe('POST /api/v1/ai/analyze/comparison', () => {
    it('deve comparar periodos via IA', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/analyze/comparison')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ period1: { month: 8, year: 2026 }, period2: { month: 7, year: 2026 } })
        .expect(201);

      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.type).toBe('comparison');
    });
  });

  describe('GET /api/v1/ai/analyses', () => {
    it('deve listar historico de analises', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/analyses')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('deve retornar 401 sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/ai/analyses')
        .expect(401);
    });
  });

  describe('GET /api/v1/ai/analyses/:id', () => {
    it('deve buscar analise por ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/analyses/ai_mock_1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.id).toBe('ai_mock_1');
    });
  });
});
