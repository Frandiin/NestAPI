import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './app.test-module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { MockQueueProvider, MockJobsProcessorProvider } from './mocks/queue.mock';
import { MockCloudinaryProvider } from './mocks/cloudinary.mock';

describe('UsersModule & Roles (E2E - Mocked)', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    })
      .overrideProvider(MockQueueProvider.provide)
      .useValue(MockQueueProvider.useValue)
      .overrideProvider(MockJobsProcessorProvider.provide)
      .useValue(MockJobsProcessorProvider.useValue)
      .overrideProvider(MockCloudinaryProvider.provide)
      .useValue(MockCloudinaryProvider.useValue)
      .compile();

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

    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123!' });
    adminToken = adminRes.body.data.accessToken;

    const userRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'Password123!' });
    userToken = userRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/users/me', () => {
    it('deve retornar o perfil do usuário autenticado (200 OK)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('email', 'user@example.com');
      expect(response.body.data).toHaveProperty('role', 'user');
    });

    it('deve recusar acesso sem token JWT (401 Unauthorized)', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  describe('GET /api/v1/users (Autorização RBAC)', () => {
    it('deve permitir acesso para usuário com perfil ADMIN (200 OK)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('meta');
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.meta).toHaveProperty('total');
      expect(response.body.data.meta).toHaveProperty('page', 1);
      expect(response.body.data.meta).toHaveProperty('limit', 10);
      expect(response.body.data.meta).toHaveProperty('totalPages');
    });

    it('deve proibir acesso para usuário com perfil USER comum (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
