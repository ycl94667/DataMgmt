import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { QueryDocumentDto } from './dto/query-document.dto.js';
import { DocType } from '@prisma/client';

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryDocumentDto) {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      year,
      provinceId,
      cityId,
      districtId,
      docType,
      projectId,
      tagId,
      keyword,
    } = query;

    const where: any = { isDeleted: 0 };

    if (categoryId) where.categoryId = BigInt(categoryId);
    if (year) where.year = year;
    if (provinceId) where.provinceId = BigInt(provinceId);
    if (cityId) where.cityId = BigInt(cityId);
    if (districtId) where.districtId = BigInt(districtId);
    if (docType) where.docType = docType as DocType;
    if (keyword) {
      where.name = { contains: keyword, mode: 'insensitive' };
    }

    // Filter by projectId via relation
    if (projectId) {
      where.documentProjects = {
        some: { projectId: BigInt(projectId) },
      };
    }

    // Filter by tagId via relation
    if (tagId) {
      where.documentTags = {
        some: { tagId: BigInt(tagId) },
      };
    }

    const [total, documents] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
          documentProjects: {
            include: {
              project: {
                select: { id: true, name: true },
              },
            },
          },
          documentTags: {
            include: {
              tag: {
                select: { id: true, name: true, groupType: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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
      projects: doc.documentProjects.map((dp) => ({
        id: dp.project.id,
        name: dp.project.name,
      })),
      tags: doc.documentTags.map((dt) => ({
        id: dt.tag.id,
        name: dt.tag.name,
        groupType: dt.tag.groupType,
      })),
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

  async findOne(id: bigint) {
    const doc = await this.prisma.document.findFirst({
      where: { id, isDeleted: 0 },
      include: {
        category: {
          select: { id: true, name: true },
        },
        documentProjects: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
        documentTags: {
          include: {
            tag: {
              select: { id: true, name: true, groupType: true },
            },
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return {
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
      projects: doc.documentProjects.map((dp) => ({
        id: dp.project.id,
        name: dp.project.name,
      })),
      tags: doc.documentTags.map((dt) => ({
        id: dt.tag.id,
        name: dt.tag.name,
        groupType: dt.tag.groupType,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
    };
  }

  async create(dto: CreateDocumentDto, createdBy: bigint) {
    const document = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          name: dto.name,
          categoryId: BigInt(dto.categoryId),
          year: dto.year,
          provinceId: BigInt(dto.provinceId),
          cityId: BigInt(dto.cityId),
          districtId: BigInt(dto.districtId),
          docType: dto.docType as DocType,
          filePath: dto.filePath,
          fileName: dto.fileName,
          fileSize: BigInt(dto.fileSize),
          fileExt: dto.fileExt,
          createdBy,
        },
      });

      // Create project associations
      if (dto.projectIds && dto.projectIds.length > 0) {
        await tx.documentProject.createMany({
          data: dto.projectIds.map((projectId) => ({
            documentId: doc.id,
            projectId: BigInt(projectId),
          })),
        });
      }

      // Create tag associations
      if (dto.tagIds && dto.tagIds.length > 0) {
        await tx.documentTag.createMany({
          data: dto.tagIds.map((tagId) => ({
            documentId: doc.id,
            tagId: BigInt(tagId),
          })),
        });
      }

      return doc;
    });

    return {
      id: document.id,
      name: document.name,
      categoryId: document.categoryId,
      year: document.year,
      provinceId: document.provinceId,
      cityId: document.cityId,
      districtId: document.districtId,
      docType: document.docType,
      filePath: document.filePath,
      fileName: document.fileName,
      fileSize: document.fileSize,
      fileExt: document.fileExt,
      version: document.version,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  async batchCreate(items: CreateDocumentDto[], createdBy: bigint) {
    const results = await this.prisma.$transaction(async (tx) => {
      const created: any[] = [];

      for (const dto of items) {
        const doc = await tx.document.create({
          data: {
            name: dto.name,
            categoryId: BigInt(dto.categoryId),
            year: dto.year,
            provinceId: BigInt(dto.provinceId),
            cityId: BigInt(dto.cityId),
            districtId: BigInt(dto.districtId),
            docType: dto.docType as DocType,
            filePath: dto.filePath,
            fileName: dto.fileName,
            fileSize: BigInt(dto.fileSize),
            fileExt: dto.fileExt,
            createdBy,
          },
        });

        if (dto.projectIds && dto.projectIds.length > 0) {
          await tx.documentProject.createMany({
            data: dto.projectIds.map((projectId) => ({
              documentId: doc.id,
              projectId: BigInt(projectId),
            })),
          });
        }

        if (dto.tagIds && dto.tagIds.length > 0) {
          await tx.documentTag.createMany({
            data: dto.tagIds.map((tagId) => ({
              documentId: doc.id,
              tagId: BigInt(tagId),
            })),
          });
        }

        created.push({
          id: doc.id,
          name: doc.name,
          categoryId: doc.categoryId,
          year: doc.year,
          docType: doc.docType,
          fileName: doc.fileName,
          createdAt: doc.createdAt,
        });
      }

      return created;
    });

    return results;
  }

  async update(id: bigint, dto: UpdateDocumentDto) {
    const existing = await this.prisma.document.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Build update data
      const data: Record<string, unknown> = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.categoryId !== undefined)
        data.categoryId = BigInt(dto.categoryId);
      if (dto.year !== undefined) data.year = dto.year;
      if (dto.provinceId !== undefined)
        data.provinceId = BigInt(dto.provinceId);
      if (dto.cityId !== undefined) data.cityId = BigInt(dto.cityId);
      if (dto.districtId !== undefined)
        data.districtId = BigInt(dto.districtId);
      if (dto.docType !== undefined) data.docType = dto.docType as DocType;

      const doc = await tx.document.update({
        where: { id },
        data,
      });

      // Sync project associations: delete old, insert new
      if (dto.projectIds !== undefined) {
        await tx.documentProject.deleteMany({
          where: { documentId: id },
        });
        if (dto.projectIds.length > 0) {
          await tx.documentProject.createMany({
            data: dto.projectIds.map((projectId) => ({
              documentId: id,
              projectId: BigInt(projectId),
            })),
          });
        }
      }

      // Sync tag associations: delete old, insert new
      if (dto.tagIds !== undefined) {
        await tx.documentTag.deleteMany({
          where: { documentId: id },
        });
        if (dto.tagIds.length > 0) {
          await tx.documentTag.createMany({
            data: dto.tagIds.map((tagId) => ({
              documentId: id,
              tagId: BigInt(tagId),
            })),
          });
        }
      }

      return {
        id: doc.id,
        name: doc.name,
        categoryId: doc.categoryId,
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
      };
    });
  }

  async replaceFile(
    id: bigint,
    newFileData: {
      filePath: string;
      fileName: string;
      fileSize: number;
      fileExt: string;
    },
    operatorId: bigint,
  ) {
    const existing = await this.prisma.document.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Save current file info to document_version table
      await tx.documentVersion.create({
        data: {
          documentId: id,
          version: existing.version,
          filePath: existing.filePath,
          fileName: existing.fileName,
          fileSize: existing.fileSize,
          fileExt: existing.fileExt,
          createdBy: operatorId,
        },
      });

      // Update document record with new file and increment version
      const doc = await tx.document.update({
        where: { id },
        data: {
          filePath: newFileData.filePath,
          fileName: newFileData.fileName,
          fileSize: BigInt(newFileData.fileSize),
          fileExt: newFileData.fileExt,
          version: existing.version + 1,
        },
      });

      return {
        id: doc.id,
        name: doc.name,
        filePath: doc.filePath,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileExt: doc.fileExt,
        version: doc.version,
        updatedAt: doc.updatedAt,
      };
    });
  }

  async softDelete(id: bigint) {
    const existing = await this.prisma.document.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    await this.prisma.document.update({
      where: { id },
      data: { isDeleted: 1 },
    });

    return { message: 'Document deleted successfully' };
  }

  async getVersions(id: bigint) {
    const existing = await this.prisma.document.findFirst({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      documentId: v.documentId,
      version: v.version,
      filePath: v.filePath,
      fileName: v.fileName,
      fileSize: v.fileSize,
      fileExt: v.fileExt,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
    }));
  }
}
