import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async create(user: { name: string; email: string; passwordHash: string; role?: Role }): Promise<User> {
    const newUser = this.usersRepo.create({
      name: user.name,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      role: user.role || Role.USER,
    });
    return this.usersRepo.save(newUser);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find();
  }

  async findPaginated(page: number, limit: number): Promise<{ data: User[]; total: number }> {
    const [data, total] = await this.usersRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }
}
