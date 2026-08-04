import { Controller, Get, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obter o perfil do usuário logado' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getProfile(@CurrentUser() user: any): Promise<UserResponseDto> {
    const found = await this.usersService.findById(user.sub);
    if (!found) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
      createdAt: found.createdAt,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos os usuários (Apenas Admin)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async findAll(@Query() paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const { data, total } = await this.usersService.findPaginated(page, limit);

    return {
      users: data.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
