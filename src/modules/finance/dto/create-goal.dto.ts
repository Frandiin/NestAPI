import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateGoalDto {
  @ApiProperty({ example: 'Viagem Europa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @IsNotEmpty()
  targetAmount: number;

  @ApiProperty({ example: '2027-06-01' })
  @IsDateString()
  @IsNotEmpty()
  deadline: string;
}
