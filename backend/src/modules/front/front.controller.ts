import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { FrontService } from './front.service.js';
import {
  QueryFrontProjectDto,
  QueryFrontDocumentDto,
  QueryFrontVideoDto,
  VerifyCodeDto,
} from './dto/query-front.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

@Controller('api/front')
export class FrontController {
  constructor(private readonly frontService: FrontService) {}

  // ==================== Categories ====================

  @Get('categories')
  async getCategories() {
    return this.frontService.getCategories();
  }

  // ==================== Regions ====================

  @Get('regions')
  async getRegions() {
    return this.frontService.getRegionTree();
  }

  // ==================== Projects ====================

  @Get('projects')
  async getProjects(@Query() query: QueryFrontProjectDto) {
    return this.frontService.getProjects(query);
  }

  @Get('projects/:id')
  async getProjectDetail(@Param('id') id: string) {
    return this.frontService.getProjectDetail(BigInt(id));
  }

  // ==================== Documents ====================

  @Get('documents/search')
  async searchDocuments(@Query() query: PaginationQueryDto & { keyword?: string }) {
    return this.frontService.searchDocuments(
      query.keyword || '',
      query.page,
      query.pageSize,
    );
  }

  @Get('documents')
  async getDocuments(@Query() query: QueryFrontDocumentDto) {
    return this.frontService.getDocuments(query);
  }

  @Get('documents/:id')
  async getDocumentDetail(@Param('id') id: string) {
    return this.frontService.getDocumentDetail(BigInt(id));
  }

  // ==================== Videos ====================

  @Get('videos')
  async getVideos(@Query() query: QueryFrontVideoDto) {
    return this.frontService.getVideos(query);
  }

  @Get('videos/:id')
  async getVideoDetail(@Param('id') id: string) {
    return this.frontService.getVideoDetail(BigInt(id));
  }

  // ==================== Download ====================

  @Post('download/verify')
  async verifyCode(@Body() body: VerifyCodeDto) {
    return this.frontService.verifyCode(body.code);
  }

  @Get('download/:id')
  async download(
    @Param('id') id: string,
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    if (!code) {
      throw new BadRequestException('Auth code is required');
    }

    const req = (res as any).req;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.ip || null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    const fileInfo = await this.frontService.downloadDocument(
      BigInt(id),
      code,
      ipAddress,
      userAgent,
    );

    const filePath = fileInfo.filePath;
    const downloadName = `${fileInfo.fileName}${fileInfo.fileExt}`;

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found on server');
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(downloadName)}"`,
    );
    res.setHeader('Content-Type', 'application/octet-stream');

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}
