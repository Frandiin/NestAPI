import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class MonthlyReportDto {
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

export class AnnualReportDto {
  @ApiProperty({ example: 2026 })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  @IsNotEmpty()
  year: number;
}

export class ExtractReportDto {
  @ApiProperty({ example: '2026-08-01' })
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsNotEmpty()
  endDate: string;
}

export class ReceiptReportDto {
  @ApiProperty({ example: 'uuid-transaction-id' })
  @IsUUID()
  @IsNotEmpty()
  transactionId: string;
}
