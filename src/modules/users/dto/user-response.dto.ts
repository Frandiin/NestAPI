import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class UserResponseDto {
  @ApiProperty({ example: 'usr_123456' })
  id: string;

  @ApiProperty({ example: 'usuario@exemplo.com' })
  email: string;

  @ApiProperty({ example: 'Nome do Usuário' })
  name: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: '2026-08-03T12:00:00.000Z' })
  createdAt: Date;
}
