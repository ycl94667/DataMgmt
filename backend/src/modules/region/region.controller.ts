import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RegionService } from './region.service.js';
import { CreateRegionDto } from './dto/create-region.dto.js';
import { UpdateRegionDto } from './dto/update-region.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller()
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  // ==================== Admin Endpoints ====================

  @UseGuards(JwtAuthGuard)
  @Get('api/admin/regions')
  async adminGetTree() {
    return this.regionService.getTree();
  }

  @UseGuards(JwtAuthGuard)
  @Post('api/admin/regions')
  async create(@Body() dto: CreateRegionDto) {
    return this.regionService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('api/admin/regions/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRegionDto,
  ) {
    return this.regionService.update(BigInt(id), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('api/admin/regions/:id')
  async delete(@Param('id') id: string) {
    return this.regionService.delete(BigInt(id));
  }

  // ==================== Public Endpoints ====================

  @Get('api/front/regions')
  async frontGetTree() {
    return this.regionService.getTree();
  }
}
