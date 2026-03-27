import { Module } from '@nestjs/common';
import { RecycleController } from './recycle.controller.js';
import { RecycleService } from './recycle.service.js';
import { UploadModule } from '../upload/upload.module.js';

@Module({
  imports: [UploadModule],
  controllers: [RecycleController],
  providers: [RecycleService],
})
export class RecycleModule {}
