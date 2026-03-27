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
import { TagService } from './tag.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { UpdateTagDto } from './dto/update-tag.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TagGroupType } from '@prisma/client';

@Controller('api/admin/tags')
@UseGuards(JwtAuthGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  async findAll(@Query('groupType') groupType?: TagGroupType) {
    return this.tagService.findAll(groupType);
  }

  @Get('suggest')
  async suggest(@Query('keyword') keyword: string) {
    return this.tagService.suggest(keyword || '');
  }

  @Post()
  async create(@Body() dto: CreateTagDto) {
    return this.tagService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagService.update(BigInt(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.tagService.delete(BigInt(id));
  }
}
