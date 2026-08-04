import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { File } from '../../src/modules/files/entities/file.entity';

const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    password: '$2b$10$hashedPassword',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Regular User',
    email: 'user@example.com',
    password: '$2b$10$hashedPassword',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const createMockRepository = () => ({
  find: jest.fn().mockResolvedValue(mockUsers),
  findOne: jest.fn().mockImplementation(({ where }) => {
    if (where?.email) {
      return Promise.resolve(mockUsers.find((u) => u.email === where.email) || null);
    }
    if (where?.id) {
      return Promise.resolve(mockUsers.find((u) => u.id === where.id) || null);
    }
    return Promise.resolve(null);
  }),
  create: jest.fn().mockImplementation((data) => ({
    id: `mock_${Date.now()}`,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  count: jest.fn().mockResolvedValue(mockUsers.length),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([mockUsers, mockUsers.length]),
  })),
});

export const MockUserRepositoryProvider = {
  provide: getRepositoryToken(User),
  useValue: createMockRepository(),
};

export const MockFileRepositoryProvider = {
  provide: getRepositoryToken(File),
  useValue: createMockRepository(),
};

export const MockDataSource = {
  provide: DataSource,
  useValue: {
    isInitialized: true,
    getRepository: jest.fn().mockReturnValue(createMockRepository()),
    query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn().mockImplementation((cb) => cb({})),
  },
};
