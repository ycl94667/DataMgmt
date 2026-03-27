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
import { DocumentService } from './document.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { QueryDocumentDto } from './dto/query-document.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @UseGuards(JwtAuthGuard)
  @Get('api/admin/documents')
  async list(@Query() query: QueryDocumentDto) {
    return this.documentService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('api/admin/documents')
  async create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser('userId') userId: bigint,
  ) {
    return this.documentService.create(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('api/admin/documents/batch')
  async batchCreate(
    @Body() items: CreateDocumentDto[],
    @CurrentUser('userId') userId: bigint,
  ) {
    return this.documentService.batchCreate(items, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('api/admin/documents/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentService.update(BigInt(id), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('api/admin/documents/:id/replace')
  async replaceFile(
    @Param('id') id: string,
    @Body() body: { filePath: string; fileName: string; fileSize: number; fileExt: string },
    @CurrentUser('userId') userId: bigint,
  ) {
    return this.documentService.replaceFile(BigInt(id), body, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('api/admin/documents/:id')
  async delete(@Param('id') id: string) {
    return this.documentService.softDelete(BigInt(id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/admin/documents/:id/versions')
  async getVersions(@Param('id') id: string) {
    return this.documentService.getVersions(BigInt(id));
  }
}
