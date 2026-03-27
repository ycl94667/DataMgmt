import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { CreateRegionDto } from './dto/create-region.dto.js';
import { UpdateRegionDto } from './dto/update-region.dto.js';

export interface RegionTreeNode {
  id: bigint;
  name: string;
  level: number;
  parentId: bigint;
  sortOrder: number;
  children: RegionTreeNode[];
}

@Injectable()
export class RegionService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(): Promise<RegionTreeNode[]> {
    const regions = await this.prisma.region.findMany({
      where: { isDeleted: 0 },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });

    const nodes: RegionTreeNode[] = regions.map((r) => ({
      id: r.id,
      name: r.name,
      level: r.level,
      parentId: r.parentId,
      sortOrder: r.sortOrder,
      children: [],
    }));

    const nodeMap = new Map<bigint, RegionTreeNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const tree: RegionTreeNode[] = [];
    for (const node of nodes) {
      if (node.parentId === 0n) {
        tree.push(node);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    }

    return tree;
  }

  async create(dto: CreateRegionDto) {
    const region = await this.prisma.region.create({
      data: {
        name: dto.name,
        level: dto.level,
        parentId: BigInt(dto.parentId),
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return {
      id: region.id,
      name: region.name,
      level: region.level,
      parentId: region.parentId,
      sortOrder: region.sortOrder,
      createdAt: region.createdAt,
    };
  }

  async update(id: bigint, dto: UpdateRegionDto) {
    const existing = await this.prisma.region.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Region with id ${id} not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.parentId !== undefined) data.parentId = BigInt(dto.parentId);
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const region = await this.prisma.region.update({
      where: { id },
      data,
    });

    return {
      id: region.id,
      name: region.name,
      level: region.level,
      parentId: region.parentId,
      sortOrder: region.sortOrder,
      createdAt: region.createdAt,
    };
  }

  async delete(id: bigint) {
    const existing = await this.prisma.region.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Region with id ${id} not found`);
    }

    await this.prisma.region.update({
      where: { id },
      data: { isDeleted: 1 },
    });

    return { message: 'Region deleted successfully' };
  }
}
