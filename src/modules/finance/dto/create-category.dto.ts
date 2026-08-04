import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TransactionType } from '../../../common/enums/finance.enums';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Alimentacao' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '🍔', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: '#FF5733', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;
}
