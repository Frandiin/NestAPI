import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // Prefixo Global
  app.setGlobalPrefix('api/v1');

  // Security Headers
  app.use(helmet());

  // Compression
  app.use(compression());

  // CORS
  app.enableCors();

  // Pipe Global de Validação de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Interceptors Globais
  app.useGlobalInterceptors(new CorrelationIdInterceptor());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Filtro Global de Exceções
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configuração da Documentação Swagger OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Production API')
    .setDescription(
      'API RESTful desenvolvida em NestJS com Autenticação JWT, Controle RBAC (Roles), Upload de Arquivos, Filas e Testes E2E Mockados.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Insira o token JWT gerado na rota /api/v1/auth/login',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`🚀 Aplicação rodando em: http://localhost:${port}/api/v1`);
  logger.log(`📚 Documentação Swagger disponível em: http://localhost:${port}/api/docs`);
}

bootstrap();
