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
import { AuthCodeService } from './auth-code.service.js';
import { CreateAuthCodeDto } from './dto/create-auth-code.dto.js';
import { UpdateAuthCodeDto } from './dto/update-auth-code.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { AuthCodeStatus } from '@prisma/client';

@Controller('api/admin/auth-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class AuthCodeController {
  constructor(private readonly authCodeService: AuthCodeService) {}

  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: AuthCodeStatus,
  ) {
    return this.authCodeService.findAll(query.page, query.pageSize, status);
  }

  @Post()
  async create(
    @Body() dto: CreateAuthCodeDto,
    @CurrentUser('userId') userId: bigint,
  ) {
    return this.authCodeService.create(dto, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAuthCodeDto,
  ) {
    return this.authCodeService.update(BigInt(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.authCodeService.delete(BigInt(id));
  }

  @Put(':id/disable')
  async disable(@Param('id') id: string) {
    return this.authCodeService.disable(BigInt(id));
  }

  @Put(':id/enable')
  async enable(@Param('id') id: string) {
    return this.authCodeService.enable(BigInt(id));
  }

  @Get(':id/logs')
  async getLogs(@Param('id') id: string) {
    return this.authCodeService.getLogs(BigInt(id));
  }

  @Post('generate')
  async batchGenerate(
    @Body() body: { count: number; name?: string; maxDownloads?: number; expiresAt?: string },
    @CurrentUser('userId') userId: bigint,
  ) {
    const { count, ...options } = body;
    return this.authCodeService.batchGenerate(count, options, userId);
  }
}
