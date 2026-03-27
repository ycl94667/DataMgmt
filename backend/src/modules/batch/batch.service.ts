import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { UpdateBatchDto } from './dto/update-batch.dto.js';

@Injectable()
export class BatchService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: bigint) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, isDeleted: 0 },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    const batches = await this.prisma.batch.findMany({
      where: { projectId, isDeleted: 0 },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return batches.map((b) => ({
      id: b.id,
      name: b.name,
      projectId: b.projectId,
      startTime: b.startTime,
      remark: b.remark,
      sortOrder: b.sortOrder,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
  }

  async create(projectId: bigint, dto: CreateBatchDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, isDeleted: 0 },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    const batch = await this.prisma.batch.create({
      data: {
        name: dto.name,
        projectId,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        remark: dto.remark ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return {
      id: batch.id,
      name: batch.name,
      projectId: batch.projectId,
      startTime: batch.startTime,
      remark: batch.remark,
      sortOrder: batch.sortOrder,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  }

  async update(id: bigint, dto: UpdateBatchDto) {
    const existing = await this.prisma.batch.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Batch with id ${id} not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.remark !== undefined) data.remark = dto.remark;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const batch = await this.prisma.batch.update({
      where: { id },
      data,
    });

    return {
      id: batch.id,
      name: batch.name,
      projectId: batch.projectId,
      startTime: batch.startTime,
      remark: batch.remark,
      sortOrder: batch.sortOrder,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  }

  async delete(id: bigint) {
    const existing = await this.prisma.batch.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!existing) {
      throw new NotFoundException(`Batch with id ${id} not found`);
    }

    await this.prisma.batch.update({
      where: { id },
      data: { isDeleted: 1 },
    });

    return { message: 'Batch deleted successfully' };
  }
}
