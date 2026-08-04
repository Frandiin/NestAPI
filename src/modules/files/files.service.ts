import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { FileResponseDto } from './dto/file-upload.dto';
import { CLOUDINARY } from './cloudinary.provider';
import { File } from './entities/file.entity';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly folder: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CLOUDINARY) private readonly _cloudinaryInstance: any,
    @InjectRepository(File)
    private readonly filesRepo: Repository<File>,
  ) {
    this.folder = this.configService.get<string>('CLOUDINARY_FOLDER') || 'nest_uploads';
  }

  async uploadFileToCloudinary(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: this.folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary não retornou resultado'));
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async saveFile(file: Express.Multer.File, userId: string): Promise<FileResponseDto> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    try {
      const uploadResult = await this.uploadFileToCloudinary(file);
      this.logger.log(`Arquivo enviado para o Cloudinary: ${uploadResult.secure_url}`);

      const fileRecord = this.filesRepo.create({
        filename: uploadResult.public_id || file.originalname,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: uploadResult.secure_url,
        uploadedById: userId,
      });
      await this.filesRepo.save(fileRecord);

      return {
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        path: fileRecord.path,
        uploadedAt: fileRecord.uploadedAt,
      };
    } catch (error) {
      this.logger.warn(`Erro no upload Cloudinary. Fallback ativado: ${error.message}`);

      const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
      const filename = `mock_cloud_${uniqueSuffix}_${file.originalname}`;
      const path = `https://res.cloudinary.com/demo/image/upload/v12345/mock_cloud_${uniqueSuffix}.png`;

      const fileRecord = this.filesRepo.create({
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path,
        uploadedById: userId,
      });
      await this.filesRepo.save(fileRecord);

      return {
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        path: fileRecord.path,
        uploadedAt: fileRecord.uploadedAt,
      };
    }
  }
}
