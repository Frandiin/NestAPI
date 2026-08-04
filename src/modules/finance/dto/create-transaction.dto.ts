import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { TransactionType } from '../../../common/enums/finance.enums';

export class CreateTransactionDto {
  @ApiProperty({ example: 'Supermercado Extra' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 150.5 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiProperty({ example: '2026-08-04' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 'uuid-category-id' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Compras do mes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  recurring?: boolean;
}
