import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { QueryProjectDto } from './dto/query-project.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // ==================== Admin Endpoints ====================

  @UseGuards(JwtAuthGuard)
  @Get('api/admin/projects')
  async adminList(@Query() query: QueryProjectDto) {
    return this.projectService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('api/admin/projects')
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('userId') userId: bigint,
  ) {
    return this.projectService.create(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('api/admin/projects/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(BigInt(id), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('api/admin/projects/:id')
  async delete(@Param('id') id: string) {
    return this.projectService.delete(BigInt(id));
  }

  // ==================== Public Endpoints ====================

  @Get('api/front/projects')
  async frontList(@Query() query: QueryProjectDto) {
    return this.projectService.findAll(query);
  }

  @Get('api/front/projects/:id')
  async frontDetail(@Param('id') id: string) {
    return this.projectService.findOne(BigInt(id));
  }
}
