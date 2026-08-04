import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class MonthlyAnalysisDto {
  @ApiProperty({ example: 8 })
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

export class ForecastDto {
  @ApiProperty({ example: 3, description: 'Meses para prever' })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsNotEmpty()
  months: number;
}

export class ComparisonDto {
  @ApiProperty({ example: { month: 7, year: 2026 } })
  @IsNotEmpty()
  period1: { month: number; year: number };

  @ApiProperty({ example: { month: 6, year: 2026 } })
  @IsNotEmpty()
  period2: { month: number; year: number };
}
