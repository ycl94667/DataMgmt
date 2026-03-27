import { Module } from '@nestjs/common';
import { VideoService } from './video.service.js';
import { VideoController } from './video.controller.js';

@Module({
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
