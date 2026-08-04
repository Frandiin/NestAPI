import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { FilesModule } from '../src/modules/files/files.module';
import { JobsModule } from '../src/modules/jobs/jobs.module';
import { HealthModule } from '../src/modules/health/health.module';
import { User } from '../src/modules/users/entities/user.entity';
import { File as FileEntity } from '../src/modules/files/entities/file.entity';
import { Job } from '../src/modules/jobs/entities/job.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({
        DB_HOST: 'localhost',
        DB_PORT: 5433,
        DB_USERNAME: 'postgres',
        DB_PASSWORD: 'postgres',
        DB_DATABASE: 'nest_api_test',
        JWT_SECRET: 'test-secret-key-for-e2e-tests',
        JWT_EXPIRATION: '3600',
        PORT: 3000,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
      })],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true,
        dropSchema: true,
      }),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    AuthModule,
    UsersModule,
    FilesModule,
    JobsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class TestAppModule {}
