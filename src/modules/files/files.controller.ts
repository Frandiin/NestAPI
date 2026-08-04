import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileValidator,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { FileUploadDto, FileResponseDto } from './dto/file-upload.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

export class AllowedFileTypesValidator extends FileValidator<{ allowedTypes: string[] }> {
  isValid(file: Express.Multer.File): boolean {
    if (!file || !file.mimetype) return false;
    return this.validationOptions.allowedTypes.some((type) =>
      file.mimetype.toLowerCase().includes(type.toLowerCase()),
    );
  }

  buildErrorMessage(file: Express.Multer.File): string {
    return `Tipo de arquivo inválido (${file?.mimetype}). Tipos permitidos: ${this.validationOptions.allowedTypes.join(', ')}`;
  }
}

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Realizar upload de arquivo (Requer Autenticação)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Arquivo para upload (JPEG, PNG, PDF ou TXT - máx 5MB)',
    type: FileUploadDto,
  })
  @ApiResponse({ status: 201, type: FileResponseDto })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou excede o tamanho permitido' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new AllowedFileTypesValidator({
            allowedTypes: ['text/plain', 'image/png', 'image/jpeg', 'application/pdf'],
          }),
        ],
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: any,
  ): Promise<FileResponseDto> {
    return this.filesService.saveFile(file, user.sub);
  }
}
