import { Module } from '@nestjs/common';
import { TagService } from './tag.service.js';
import { TagController } from './tag.controller.js';

@Module({
  controllers: [TagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}
