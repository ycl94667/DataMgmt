import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [totalDocuments, totalProjects, totalDownloads, totalAuthCodes] =
      await Promise.all([
        this.prisma.document.count({ where: { isDeleted: 0 } }),
        this.prisma.project.count({ where: { isDeleted: 0 } }),
        this.prisma.downloadLog.count(),
        this.prisma.authorizationCode.count(),
      ]);

    return {
      totalDocuments,
      totalProjects,
      totalDownloads,
      totalAuthCodes,
    };
  }

  async getTrend(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const logs = await this.prisma.downloadLog.findMany({
      where: {
        downloadedAt: { gte: startDate },
      },
      select: {
        downloadedAt: true,
      },
      orderBy: { downloadedAt: 'asc' },
    });

    // Group by date
    const countMap = new Map<string, number>();

    // Initialize all dates in range with 0
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      countMap.set(dateStr, 0);
    }

    for (const log of logs) {
      const dateStr = log.downloadedAt.toISOString().split('T')[0];
      countMap.set(dateStr, (countMap.get(dateStr) || 0) + 1);
    }

    const trend: { date: string; count: number }[] = [];
    for (const [date, count] of countMap.entries()) {
      trend.push({ date, count });
    }

    return trend;
  }

  async getHotDocs(limit: number = 10) {
    const results = await this.prisma.downloadLog.groupBy({
      by: ['documentId'],
      _count: { documentId: true },
      orderBy: { _count: { documentId: 'desc' } },
      take: limit,
    });

    if (results.length === 0) return [];

    const documentIds = results.map((r) => r.documentId);
    const documents = await this.prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, name: true },
    });

    const docMap = new Map(documents.map((d) => [d.id, d.name]));

    return results.map((r) => ({
      documentId: r.documentId,
      name: docMap.get(r.documentId) || null,
      count: r._count.documentId,
    }));
  }

  async getHotTags(limit: number = 10) {
    const results = await this.prisma.documentTag.groupBy({
      by: ['tagId'],
      _count: { tagId: true },
      orderBy: { _count: { tagId: 'desc' } },
      take: limit,
    });

    if (results.length === 0) return [];

    const tagIds = results.map((r) => r.tagId);
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, name: true },
    });

    const tagMap = new Map(tags.map((t) => [t.id, t.name]));

    return results.map((r) => ({
      tagId: r.tagId,
      name: tagMap.get(r.tagId) || null,
      count: r._count.tagId,
    }));
  }
}
