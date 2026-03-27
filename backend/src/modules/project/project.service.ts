import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { QueryProjectDto } from './dto/query-project.dto.js';
import { ProjectType } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProjectDto) {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      year,
      provinceId,
      cityId,
      districtId,
      type,
      keyword,
    } = query;

    const where: any = { isDeleted: 0 };

    if (categoryId) where.categoryId = BigInt(categoryId);
    if (year) where.year = year;
    if (provinceId) where.provinceId = BigInt(provinceId);
    if (cityId) where.cityId = BigInt(cityId);
    if (districtId) where.districtId = BigInt(districtId);
    if (type) where.type = type as ProjectType;
    if (keyword) {
      where.name = { contains: keyword, mode: 'insensitive' };
    }

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = await Promise.all(
      projects.map(async (p) => {
        const [documentCount, videoCount] = await Promise.all([
          this.prisma.documentProject.count({
            where: { projectId: p.id },
          }),
          this.prisma.videoProject.count({
            where: { projectId: p.id },
          }),
        ]);

        return {
          id: p.id,
          name: p.name,
          categoryId: p.categoryId,
          category: p.category
            ? { id: p.category.id, name: p.category.name }
            : null,
          year: p.year,
          provinceId: p.provinceId,
          cityId: p.cityId,
          districtId: p.districtId,
          type: p.type,
          sortOrder: p.sortOrder,
          documentCount,
          videoCount,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
    );

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: bigint) {
    const project = await this.prisma.project.findFirst({
      where: { id, isDeleted: 0 },
      include: {
        category: {
          select: { id: true, name: true },
        },
        batches: {
          where: { isDeleted: 0 },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        },
        documentProjects: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                docType: true,
                fileName: true,
                fileExt: true,
                fileSize: true,
              },
            },
          },
        },
        videoProjects: {
          include: {
            video: {
              select: {
                id: true,
                title: true,
                url: true,
                platform: true,
                isEnabled: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    return {
      id: project.id,
      name: project.name,
      categoryId: project.categoryId,
      category: project.category
        ? { id: project.category.id, name: project.category.name }
        : null,
      year: project.year,
      provinceId: project.provinceId,
      cityId: project.cityId,
      districtId: project.districtId,
      type: project.type,
      sortOrder: project.sortOrder,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      batches: project.batches.map((b) => ({
        id: b.id,
        name: b.name,
        projectId: b.projectId,
        startTime: b.startTime,
        remark: b.remark,
        sortOrder: b.sortOrder,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
      documents: project.documentProjects.map((dp) => ({
        id: dp.document.id,
        name: dp.document.name,
        docType: dp.document.docType,
        fileName: dp.document.fileName,
        fileExt: dp.document.fileExt,
        fileSize: dp.document.fileSize,
      })),
      videos: project.videoProjects.map((vp) => ({
        id: vp.video.id,
        title: vp.video.title,
        url: vp.video.url,
        platform: vp.video.platform,
        isEnabled: vp.video.isEnabled,
      })),
    };
  }

  async create(dto: CreateProjectDto, createdBy: bigint) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        categoryId: BigInt(dto.categoryId),
        year: dto.year,
        provinceId: BigInt(dto.provinceId),
        cityId: BigInt(dto.cityId),
        districtId: BigInt(dto.districtId),
        type: dto.type as ProjectType,
        sortOrder: dto.sortOrder ?? 0,
        createdBy,
      },
    });

    return {
      id: project.id,
      name: project.name,
      categoryId: project.categoryId,
      year: project.year,
      provinceId: project.provinceId,
      cityId: project.cityId,
      districtId: project.districtId,
      type: project.type,
      sortOrder: project.sortOrder,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async update(id: bigint, dto: UpdateProjectDto) {
    const existing = await this.prisma.project.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.categoryId !== undefined) data.categoryId = BigInt(dto.categoryId);
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.provinceId !== undefined) data.provinceId = BigInt(dto.provinceId);
    if (dto.cityId !== undefined) data.cityId = BigInt(dto.cityId);
    if (dto.districtId !== undefined) data.districtId = BigInt(dto.districtId);
    if (dto.type !== undefined) data.type = dto.type as ProjectType;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const project = await this.prisma.project.update({
      where: { id },
      data,
    });

    return {
      id: project.id,
      name: project.name,
      categoryId: project.categoryId,
      year: project.year,
      provinceId: project.provinceId,
      cityId: project.cityId,
      districtId: project.districtId,
      type: project.type,
      sortOrder: project.sortOrder,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async delete(id: bigint) {
    const existing = await this.prisma.project.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    await this.prisma.project.update({
      where: { id },
      data: { isDeleted: 1 },
    });

    return { message: 'Project deleted successfully' };
  }
}
