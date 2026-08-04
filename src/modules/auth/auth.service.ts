import { ConflictException, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Role } from '../../common/enums/role.enum';
import { RefreshToken } from './entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new ConflictException('E-mail já está em uso');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      passwordHash: hashedPassword,
      role: Role.USER,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenDto.refreshToken },
      relations: { user: true },
    });

    if (!refreshToken || refreshToken.isRevoked) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const user = refreshToken.user;
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    await this.revokeRefreshToken(refreshToken.id);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return tokens;
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenDto.refreshToken },
    });

    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken.id);
    }

    return { message: 'Logout realizado com sucesso' };
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const accessToken = this.generateAccessToken(userId, email, role);
    const refreshToken = await this.generateRefreshToken(userId, email);

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(userId: string, email: string, role: Role): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }

  private async generateRefreshToken(userId: string, email: string): Promise<string> {
    const token = uuidv4();
    const expiresInDays = this.configService.get<number>('JWT_REFRESH_EXPIRATION_DAYS') || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const payload = { sub: userId, email, type: 'refresh' as const };
    const signedToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'super-secret-refresh-key-antigravity-nest-api',
      expiresIn: `${expiresInDays}d`,
    });

    await this.refreshTokenRepository.save({
      token: signedToken,
      userId,
      expiresAt,
      isRevoked: false,
    });

    return signedToken;
  }

  private async revokeRefreshToken(id: string): Promise<void> {
    await this.refreshTokenRepository.update(id, { isRevoked: true });
  }
}
