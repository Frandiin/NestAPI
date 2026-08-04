import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsUUID, Max, Min } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ example: 'uuid-category-id' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 800 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 8, description: 'Mes (1-12)' })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsNotEmpty()
  month: number;

  @ApiProperty({ example: 2026 })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  @IsNotEmpty()
  year: number;
}
