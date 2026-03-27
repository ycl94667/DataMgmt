import { Module } from '@nestjs/common';
import { RegionController } from './region.controller.js';
import { RegionService } from './region.service.js';

@Module({
  controllers: [RegionController],
  providers: [RegionService],
  exports: [RegionService],
})
export class RegionModule {}
