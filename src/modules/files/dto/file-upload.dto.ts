import { ApiProperty } from '@nestjs/swagger';

export class FileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Arquivo a ser enviado (Max 5MB)' })
  file: any;
}

export class FileResponseDto {
  @ApiProperty({ example: 'file_1754226000000_doc.pdf' })
  filename: string;

  @ApiProperty({ example: 'document.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimetype: string;

  @ApiProperty({ example: 102400 })
  size: number;

  @ApiProperty({ example: '/uploads/file_1754226000000_doc.pdf' })
  path: string;

  @ApiProperty({ example: '2026-08-03T12:00:00.000Z' })
  uploadedAt: Date;
}
