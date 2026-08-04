import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { CloudinaryProvider } from './cloudinary.provider';
import { File } from './entities/file.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([File])],
  controllers: [FilesController],
  providers: [FilesService, CloudinaryProvider],
  exports: [FilesService, CloudinaryProvider],
})
export class FilesModule {}
