import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { UpdateTagDto } from './dto/update-tag.dto.js';
import { TagGroupType } from '@prisma/client';

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(groupType?: TagGroupType) {
    const where: any = { isDeleted: 0 };
    if (groupType) {
      where.groupType = groupType;
    }

    const tags = await this.prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: { documentTags: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group tags by groupType
    const grouped: Record<string, any[]> = {};

    for (const tag of tags) {
      const group = tag.groupType;
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push({
        id: tag.id,
        name: tag.name,
        groupType: tag.groupType,
        usageCount: tag._count.documentTags,
        createdAt: tag.createdAt,
      });
    }

    return grouped;
  }

  async create(dto: CreateTagDto) {
    const tag = await this.prisma.tag.create({
      data: {
        name: dto.name,
        groupType: dto.groupType,
      },
    });

    return {
      id: tag.id,
      name: tag.name,
      groupType: tag.groupType,
      createdAt: tag.createdAt,
    };
  }

  async update(id: bigint, dto: UpdateTagDto) {
    const existing = await this.prisma.tag.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Tag with id ${id} not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.groupType !== undefined) data.groupType = dto.groupType;

    const tag = await this.prisma.tag.update({
      where: { id },
      data,
    });

    return {
      id: tag.id,
      name: tag.name,
      groupType: tag.groupType,
      createdAt: tag.createdAt,
    };
  }

  async delete(id: bigint) {
    const existing = await this.prisma.tag.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Tag with id ${id} not found`);
    }

    await this.prisma.tag.update({
      where: { id },
      data: { isDeleted: 1 },
    });

    return { message: 'Tag deleted successfully' };
  }

  async suggest(keyword: string) {
    const tags = await this.prisma.tag.findMany({
      where: {
        isDeleted: 0,
        name: { contains: keyword, mode: 'insensitive' },
      },
      include: {
        _count: {
          select: { documentTags: true },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      groupType: tag.groupType,
      usageCount: tag._count.documentTags,
      createdAt: tag.createdAt,
    }));
  }
}
