import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { QueryAuditDto } from './dto/query-audit.dto.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditDto) {
    const {
      page = 1,
      pageSize = 20,
      action,
      targetType,
      operatorId,
      dateFrom,
      dateTo,
    } = query;

    const where: any = {};

    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (operatorId) where.operatorId = BigInt(operatorId);
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async export(query: QueryAuditDto) {
    const { action, targetType, operatorId, dateFrom, dateTo } = query;

    const where: any = {};

    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (operatorId) where.operatorId = BigInt(operatorId);
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    operatorId?: bigint | null;
    operatorName?: string | null;
    action: string;
    targetType: string;
    targetId?: bigint | null;
    targetName?: string | null;
    detail?: any;
    ipAddress?: string | null;
  }) {
    return this.prisma.auditLog.create({ data });
  }
}
