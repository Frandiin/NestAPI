import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo do usuário' })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name: string;

  @ApiProperty({ example: 'joao@exemplo.com', description: 'E-mail de acesso' })
  @IsEmail({}, { message: 'Forneça um e-mail válido' })
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Senha de acesso (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6, { message: 'A senha deve conter pelo menos 6 caracteres' })
  password: string;

  @ApiProperty({ enum: Role, default: Role.USER, description: 'Papel do usuário na aplicação' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
