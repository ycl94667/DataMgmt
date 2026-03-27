import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller.js';
import { BatchService } from './batch.service.js';

@Module({
  controllers: [BatchController],
  providers: [BatchService],
  exports: [BatchService],
})
export class BatchModule {}
