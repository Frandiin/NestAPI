import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { MockQueueProvider, MockJobsProcessorProvider } from './mocks/queue.mock';
import { MockCloudinaryProvider } from './mocks/cloudinary.mock';

describe('AuthModule (E2E - Mocked)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Carlos Santos',
          email: 'carlos@exemplo.com',
          password: 'Password123!',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user).toMatchObject({
        name: 'Carlos Santos',
        email: 'carlos@exemplo.com',
        role: 'user',
      });
    });

    it('deve rejeitar registro com e-mail duplicado (409 Conflict)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Carlos Duplicado',
          email: 'carlos@exemplo.com',
          password: 'Password123!',
        })
        .expect(409);
    });

    it('deve validar campos obrigatórios (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalido',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('deve realizar login dos usuários pré-cadastrados (admin@example.com)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user.role).toBe('admin');
    });

    it('deve retornar 401 Unauthorized para senha incorreta', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'SenhaErrada123',
        })
        .expect(401);
    });
  });
});
