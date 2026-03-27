import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { UpdateVideoDto } from './dto/update-video.dto.js';
import { QueryVideoDto } from './dto/query-video.dto.js';

@Injectable()
export class VideoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryVideoDto) {
    const { page = 1, pageSize = 20, keyword } = query;

    const where: any = { isDeleted: 0 };
    if (keyword) {
      where.title = { contains: keyword, mode: 'insensitive' };
    }

    const [total, videos] = await Promise.all([
      this.prisma.video.count({ where }),
      this.prisma.video.findMany({
        where,
        include: {
          videoProjects: {
            include: {
              project: {
                select: { id: true, name: true },
              },
            },
          },
          videoTags: {
            include: {
              tag: {
                select: { id: true, name: true, groupType: true },
              },
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = videos.map((v) => ({
      id: v.id,
      title: v.title,
      url: v.url,
      platform: v.platform,
      isEnabled: v.isEnabled,
      sortOrder: v.sortOrder,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      projects: v.videoProjects.map((vp) => ({
        id: vp.project.id,
        name: vp.project.name,
      })),
      tags: v.videoTags.map((vt) => ({
        id: vt.tag.id,
        name: vt.tag.name,
        groupType: vt.tag.groupType,
      })),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(dto: CreateVideoDto, createdBy: bigint) {
    const video = await this.prisma.video.create({
      data: {
        title: dto.title,
        url: dto.url,
        platform: dto.platform ?? 'other',
        isEnabled: dto.isEnabled ?? 1,
        sortOrder: dto.sortOrder ?? 0,
        createdBy,
        videoProjects: dto.projectIds?.length
          ? {
              create: dto.projectIds.map((projectId) => ({
                projectId: BigInt(projectId),
              })),
            }
          : undefined,
        videoTags: dto.tagIds?.length
          ? {
              create: dto.tagIds.map((tagId) => ({
                tagId: BigInt(tagId),
              })),
            }
          : undefined,
      },
      include: {
        videoProjects: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
        videoTags: {
          include: {
            tag: { select: { id: true, name: true, groupType: true } },
          },
        },
      },
    });

    return {
      id: video.id,
      title: video.title,
      url: video.url,
      platform: video.platform,
      isEnabled: video.isEnabled,
      sortOrder: video.sortOrder,
      createdBy: video.createdBy,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      projects: video.videoProjects.map((vp) => ({
        id: vp.project.id,
        name: vp.project.name,
      })),
      tags: video.videoTags.map((vt) => ({
        id: vt.tag.id,
        name: vt.tag.name,
        groupType: vt.tag.groupType,
      })),
    };
  }

  async update(id: bigint, dto: UpdateVideoDto) {
    const existing = await this.prisma.video.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Video with id ${id} not found`);
    }

    // Update video fields
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.platform !== undefined) data.platform = dto.platform;
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    // Use transaction to sync associations
    const video = await this.prisma.$transaction(async (tx) => {
      // Sync project associations
      if (dto.projectIds !== undefined) {
        await tx.videoProject.deleteMany({ where: { videoId: id } });
        if (dto.projectIds.length > 0) {
          await tx.videoProject.createMany({
            data: dto.projectIds.map((projectId) => ({
              videoId: id,
              projectId: BigInt(projectId),
            })),
          });
        }
      }

      // Sync tag associations
      if (dto.tagIds !== undefined) {
        await tx.videoTag.deleteMany({ where: { videoId: id } });
        if (dto.tagIds.length > 0) {
          await tx.videoTag.createMany({
            data: dto.tagIds.map((tagId) => ({
              videoId: id,
              tagId: BigInt(tagId),
            })),
          });
        }
      }

      return tx.video.update({
        where: { id },
        data,
        include: {
          videoProjects: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
          videoTags: {
            include: {
              tag: { select: { id: true, name: true, groupType: true } },
            },
          },
        },
      });
    });

    return {
      id: video.id,
      title: video.title,
      url: video.url,
      platform: video.platform,
      isEnabled: video.isEnabled,
      sortOrder: video.sortOrder,
      createdBy: video.createdBy,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      projects: video.videoProjects.map((vp) => ({
        id: vp.project.id,
        name: vp.project.name,
      })),
      tags: video.videoTags.map((vt) => ({
        id: vt.tag.id,
        name: vt.tag.name,
        groupType: vt.tag.groupType,
      })),
    };
  }

  async softDelete(id: bigint) {
    const existing = await this.prisma.video.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Video with id ${id} not found`);
    }

    await this.prisma.video.update({
      where: { id },
      data: { isDeleted: 1 },
    });

    return { message: 'Video deleted successfully' };
  }
}
