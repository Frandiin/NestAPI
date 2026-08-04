import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class AddGoalAmountDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
