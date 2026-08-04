import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { RefreshTokenStrategy } from '../src/modules/auth/strategies/jwt-refresh.strategy';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';
import { UsersService } from '../src/modules/users/users.service';
import { UsersController } from '../src/modules/users/users.controller';
import { FilesService } from '../src/modules/files/files.service';
import { FilesController } from '../src/modules/files/files.controller';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { JobsController } from '../src/modules/jobs/jobs.controller';
import { HealthModule } from '../src/modules/health/health.module';
import { Role } from '../src/common/enums/role.enum';
import { JobStatus } from '../src/common/enums/job-status.enum';
import { TASKS_QUEUE_NAME } from '../src/modules/jobs/jobs.processor';

import * as bcrypt from 'bcrypt';

const defaultPassword = bcrypt.hashSync('Password123!', 10);

const mockUsers = [
  {
    id: '1',
    name: 'Admin System',
    email: 'admin@example.com',
    passwordHash: defaultPassword,
    role: Role.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Normal User',
    email: 'user@example.com',
    passwordHash: defaultPassword,
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const MockUsersServiceProvider = {
  provide: UsersService,
  useValue: {
    onModuleInit: jest.fn(),
    findByEmail: jest.fn().mockImplementation((email: string) => {
      const found = mockUsers.find((u) => u.email === email.toLowerCase());
      return Promise.resolve(found ? { ...found } : null);
    }),
    findByEmailWithPassword: jest.fn().mockImplementation((email: string) => {
      const user = mockUsers.find((u) => u.email === email.toLowerCase());
      if (user) {
        return Promise.resolve({ ...user, passwordHash: user.passwordHash });
      }
      return Promise.resolve(null);
    }),
    findById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve(mockUsers.find((u) => u.id === id) || null);
    }),
    create: jest.fn().mockImplementation((data: any) => {
      const existing = mockUsers.find((u) => u.email === data.email?.toLowerCase());
      if (existing) {
        return Promise.resolve(null);
      }
      const newUser = {
        id: `mock_${Date.now()}`,
        ...data,
        email: data.email?.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsers.push(newUser);
      return Promise.resolve(newUser);
    }),
    findAll: jest.fn().mockResolvedValue(mockUsers),
    findPaginated: jest.fn().mockImplementation((page: number, limit: number) => {
      return Promise.resolve({ data: mockUsers, total: mockUsers.length });
    }),
  },
};

const MockFilesServiceProvider = {
  provide: FilesService,
  useValue: {
    saveFile: jest.fn().mockImplementation((file: any, userId: string) => {
      return Promise.resolve({
        filename: `mock_${file.originalname}`,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: 'https://res.cloudinary.com/demo/image/upload/v12345/mock_file.png',
        uploadedAt: new Date(),
      });
    }),
  },
};

const MockJobsServiceProvider = {
  provide: JobsService,
  useValue: {
    addJob: jest.fn().mockImplementation((createJobDto: any, userId: string) => {
      return Promise.resolve({
        id: `job_${Date.now()}`,
        queueName: TASKS_QUEUE_NAME,
        type: createJobDto.type,
        status: JobStatus.QUEUED,
        createdAt: new Date(),
      });
    }),
  },
};

const MockRefreshTokenServiceProvider = {
  provide: getRepositoryToken(RefreshToken),
  useValue: {
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((data) => Promise.resolve({ id: '1', ...data })),
    update: jest.fn().mockResolvedValue(undefined),
  },
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({
        JWT_SECRET: 'test-secret-key-for-e2e-tests',
        JWT_EXPIRATION: '1d',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-e2e',
        JWT_REFRESH_EXPIRATION_DAYS: 7,
        PORT: 3000,
      })],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'test-secret-key-for-e2e-tests',
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION') || '1d' as any },
      }),
    }),
    HealthModule,
  ],
  controllers: [AuthController, UsersController, FilesController, JobsController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    MockUsersServiceProvider,
    MockFilesServiceProvider,
    MockJobsServiceProvider,
    MockRefreshTokenServiceProvider,
  ],
})
export class TestAppModule {}
