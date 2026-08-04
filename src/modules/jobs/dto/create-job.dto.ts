import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ example: 'send_welcome_email', description: 'Tipo do job a ser executado' })
  @IsString()
  @IsNotEmpty({ message: 'O tipo do job é obrigatório' })
  type: string;

  @ApiProperty({
    example: { userId: 'usr_123', email: 'usuario@exemplo.com' },
    description: 'Carga útil (payload) do job',
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, any>;
}

export class JobResponseDto {
  @ApiProperty({ example: 'job_1754226000000_abc' })
  id: string;

  @ApiProperty({ example: 'tasks-queue' })
  queueName: string;

  @ApiProperty({ example: 'send_welcome_email' })
  type: string;

  @ApiProperty({ example: 'queued' })
  status: string;

  @ApiProperty({ example: '2026-08-03T12:00:00.000Z' })
  createdAt: Date;
}
