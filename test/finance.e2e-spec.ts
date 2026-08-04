import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './app.test-module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('FinanceModule (E2E - Mocked)', () => {
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

  describe('Categories', () => {
    it('deve criar uma categoria', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/finance/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Alimentacao', icon: '🍔', color: '#FF5733', type: 'expense' })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Alimentacao');
      expect(response.body.data.type).toBe('expense');
    });

    it('deve listar categorias', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('deve retornar 401 sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/categories')
        .expect(401);
    });
  });

  describe('Transactions', () => {
    it('deve criar uma transacao', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'Supermercado Extra',
          amount: 150.5,
          type: 'expense',
          date: '2026-08-04',
          categoryId: '550e8400-e29b-41d4-a716-446655440001',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.description).toBe('Supermercado Extra');
      expect(response.body.data.amount).toBe(150.5);
    });

    it('deve listar transacoes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('deve buscar transacao por ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/transactions/tx_mock_1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.id).toBe('tx_mock_1');
    });
  });

  describe('Budgets', () => {
    it('deve criar um orcamento', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/finance/budgets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ categoryId: '550e8400-e29b-41d4-a716-446655440001', amount: 800, month: 8, year: 2026 })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.amount).toBe(800);
    });

    it('deve listar orcamentos do mes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/budgets?month=8&year=2026')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('deve retornar status dos orcamentos', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/budgets/status?month=8&year=2026')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('percentage');
    });
  });

  describe('Goals', () => {
    it('deve criar uma meta', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/finance/goals')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Viagem Europa', targetAmount: 15000, deadline: '2027-06-01' })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Viagem Europa');
    });

    it('deve listar metas', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/goals')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('deve adicionar valor a meta', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/finance/goals/goal_mock_1/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 500 })
        .expect(200);

      expect(response.body.data.currentAmount).toBe(5500);
    });
  });

  describe('Dashboard', () => {
    it('deve retornar dashboard do mes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/dashboard?month=8&year=2026')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('totalIncome');
      expect(response.body.data).toHaveProperty('totalExpense');
      expect(response.body.data).toHaveProperty('balance');
    });

    it('deve comparar periodos', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/dashboard/compare?month1=8&year1=2026&month2=7&year2=2026')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('incomeDifference');
    });

    it('deve retornar historico', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/finance/dashboard/history?months=3')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
