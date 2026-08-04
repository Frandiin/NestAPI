import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { MockQueueProvider, MockJobsProcessorProvider } from './mocks/queue.mock';
import { MockCloudinaryProvider } from './mocks/cloudinary.mock';

describe('FilesModule (E2E - Upload Mocked com Cloudinary)', () => {
  let app: INestApplication;
  let authToken: string;

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

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'Password123!' });
    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/files/upload', () => {
    it('deve realizar upload de arquivo para o Cloudinary (mock) com sucesso (201 Created)', async () => {
      const buffer = Buffer.from('Conteudo de teste do arquivo');

      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, { filename: 'documento_teste.txt', contentType: 'text/plain' })
        .expect(201);

      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('originalName', 'documento_teste.txt');
      expect(response.body.data).toHaveProperty('mimetype', 'text/plain');
      expect(response.body.data.path).toContain('res.cloudinary.com');
    });

    it('deve recusar upload sem cabeçalho JWT (401 Unauthorized)', async () => {
      const buffer = Buffer.from('Conteudo');
      await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .attach('file', buffer, 'documento.txt')
        .expect(401);
    });

    it('deve recusar arquivo com extensão não permitida (400 Bad Request)', async () => {
      const buffer = Buffer.from('console.log("malicious executable");');

      await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'script.exe')
        .expect(400);
    });
  });
});
