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
import { BatchService } from './batch.service.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { UpdateBatchDto } from './dto/update-batch.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Get('api/admin/projects/:projectId/batches')
  async findByProject(@Param('projectId') projectId: string) {
    return this.batchService.findByProject(BigInt(projectId));
  }

  @Post('api/admin/projects/:projectId/batches')
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateBatchDto,
  ) {
    return this.batchService.create(BigInt(projectId), dto);
  }

  @Put('api/admin/batches/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.batchService.update(BigInt(id), dto);
  }

  @Delete('api/admin/batches/:id')
  async delete(@Param('id') id: string) {
    return this.batchService.delete(BigInt(id));
  }
}
