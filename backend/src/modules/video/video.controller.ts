import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VideoService } from './video.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { UpdateVideoDto } from './dto/update-video.dto.js';
import { QueryVideoDto } from './dto/query-video.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('api/admin/videos')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get()
  async findAll(@Query() query: QueryVideoDto) {
    return this.videoService.findAll(query);
  }

  @Post()
  async create(
    @Body() dto: CreateVideoDto,
    @CurrentUser('userId') userId: bigint,
  ) {
    return this.videoService.create(dto, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVideoDto,
  ) {
    return this.videoService.update(BigInt(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.videoService.softDelete(BigInt(id));
  }
}
