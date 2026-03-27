import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

const multerOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
};

@Controller()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard)
  @Post('api/admin/upload')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('year') year: string,
    @Body('category') category: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!year) {
      throw new BadRequestException('year is required');
    }
    if (!category) {
      throw new BadRequestException('category is required');
    }

    const result = await this.uploadService.saveFile(file, year, category);
    return { message: 'File uploaded successfully', data: result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('api/admin/upload/batch')
  @UseInterceptors(FilesInterceptor('files', 20, multerOptions))
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('year') year: string,
    @Body('category') category: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    if (!year) {
      throw new BadRequestException('year is required');
    }
    if (!category) {
      throw new BadRequestException('category is required');
    }

    const results = await Promise.all(
      files.map((file) => this.uploadService.saveFile(file, year, category)),
    );

    return { message: 'Files uploaded successfully', data: results };
  }
}
