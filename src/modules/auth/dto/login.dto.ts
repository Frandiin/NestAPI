import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com', description: 'E-mail cadastrado' })
  @IsEmail({}, { message: 'Forneça um e-mail válido' })
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Senha de acesso' })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  password: string;
}
