import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly baseUploadDir = path.resolve('./uploads/documents');

  private readonly allowedExtensions = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'zip',
    'rar',
    'jpg',
    'jpeg',
    'png',
    'gif',
  ];

  validateFile(file: Express.Multer.File): void {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!this.allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `File extension .${ext} is not allowed. Allowed: ${this.allowedExtensions.join(', ')}`,
      );
    }
  }

  async saveFile(
    file: Express.Multer.File,
    year: string,
    category: string,
  ): Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
    fileExt: string;
  }> {
    this.validateFile(file);

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const dir = path.join(this.baseUploadDir, year, category);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate unique file name to avoid collision
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeOriginalName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    const storedFileName = `${timestamp}_${randomSuffix}_${safeOriginalName}.${ext}`;
    const filePath = path.join(dir, storedFileName);

    fs.writeFileSync(filePath, file.buffer);

    // Return path relative to project root for storage
    const relativePath = path
      .relative(path.resolve('./'), filePath)
      .replace(/\\/g, '/');

    return {
      filePath: relativePath,
      fileName: file.originalname,
      fileSize: file.size,
      fileExt: ext,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }
}
