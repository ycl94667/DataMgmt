import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { UploadService } from '../upload/upload.service.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

@Injectable()
export class RecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async findDeletedDocuments(query: PaginationQueryDto) {
    const { page = 1, pageSize = 20 } = query;

    const where = { isDeleted: 1 };

    const [total, documents] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      categoryId: doc.categoryId,
      category: doc.category
        ? { id: doc.category.id, name: doc.category.name }
        : null,
      year: doc.year,
      provinceId: doc.provinceId,
      cityId: doc.cityId,
      districtId: doc.districtId,
      docType: doc.docType,
      filePath: doc.filePath,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileExt: doc.fileExt,
      version: doc.version,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async restoreDocument(id: bigint) {
    const existing = await this.prisma.document.findFirst({
      where: { id, isDeleted: 1 },
    });
    if (!existing) {
      throw new NotFoundException(
        `Deleted document with id ${id} not found`,
      );
    }

    await this.prisma.document.update({
      where: { id },
      data: { isDeleted: 0 },
    });

    return { message: 'Document restored successfully' };
  }

  async permanentDelete(id: bigint) {
    const existing = await this.prisma.document.findFirst({
      where: { id, isDeleted: 1 },
    });
    if (!existing) {
      throw new NotFoundException(
        `Deleted document with id ${id} not found`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.documentProject.deleteMany({ where: { documentId: id } });
      await tx.documentTag.deleteMany({ where: { documentId: id } });
      await tx.authorizationLog.deleteMany({ where: { documentId: id } });
      await tx.downloadLog.deleteMany({ where: { documentId: id } });

      // Get all version file paths before deleting versions
      const versions = await tx.documentVersion.findMany({
        where: { documentId: id },
        select: { filePath: true },
      });

      await tx.documentVersion.deleteMany({ where: { documentId: id } });

      // Delete the document record
      await tx.document.delete({ where: { id } });

      // Delete physical files (main file + all version files)
      await this.uploadService.deleteFile(existing.filePath);
      for (const version of versions) {
        await this.uploadService.deleteFile(version.filePath);
      }
    });

    return { message: 'Document permanently deleted' };
  }
}
