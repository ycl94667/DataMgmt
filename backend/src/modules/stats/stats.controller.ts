import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('api/admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  async getOverview() {
    return this.statsService.getOverview();
  }

  @Get('trend')
  async getTrend() {
    return this.statsService.getTrend(30);
  }

  @Get('hot-docs')
  async getHotDocs() {
    return this.statsService.getHotDocs(10);
  }

  @Get('hot-tags')
  async getHotTags() {
    return this.statsService.getHotTags(10);
  }
}
