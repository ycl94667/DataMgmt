import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RecycleService } from './recycle.service.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller()
export class RecycleController {
  constructor(private readonly recycleService: RecycleService) {}

  @UseGuards(JwtAuthGuard)
  @Get('api/admin/recycle/documents')
  async listDeleted(@Query() query: PaginationQueryDto) {
    return this.recycleService.findDeletedDocuments(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('api/admin/recycle/documents/:id/restore')
  async restore(@Param('id') id: string) {
    return this.recycleService.restoreDocument(BigInt(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Delete('api/admin/recycle/documents/:id')
  async permanentDelete(@Param('id') id: string) {
    return this.recycleService.permanentDelete(BigInt(id));
  }
}
