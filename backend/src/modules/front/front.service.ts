import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { AuthCodeService } from '../auth-code/auth-code.service.js';
import {
  QueryFrontProjectDto,
  QueryFrontDocumentDto,
  QueryFrontVideoDto,
} from './dto/query-front.dto.js';
import { DocType, ProjectType } from '@prisma/client';

@Injectable()
export class FrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authCodeService: AuthCodeService,
  ) {}

  // ==================== Categories ====================

  async getCategories() {
    const categories = await this.prisma.category.findMany({
      where: { isDeleted: 0 },
      orderBy: { sortOrder: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
    }));
  }

  // ==================== Regions ====================

  async getRegionTree() {
    const regions = await this.prisma.region.findMany({
      where: { isDeleted: 0 },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });

    const nodes = regions.map((r) => ({
      id: r.id,
      name: r.name,
      level: r.level,
      parentId: r.parentId,
      sortOrder: r.sortOrder,
      children: [] as any[],
    }));

    const nodeMap = new Map<bigint, (typeof nodes)[0]>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const tree: (typeof nodes)[0][] = [];
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

  // ==================== Projects ====================

  async getProjects(query: QueryFrontProjectDto) {
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
          province: {
            select: { id: true, name: true },
          },
          city: {
            select: { id: true, name: true },
          },
          district: {
            select: { id: true, name: true },
          },
          _count: {
            select: { documentProjects: true, videoProjects: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = projects.map((p) => ({
      id: p.id,
      name: p.name,
      categoryId: p.categoryId,
      category: p.category
        ? { id: p.category.id, name: p.category.name }
        : null,
      year: p.year,
      provinceId: p.provinceId,
      provinceName: p.province?.name,
      cityId: p.cityId,
      cityName: p.city?.name,
      districtId: p.districtId,
      districtName: p.district?.name,
      type: p.type,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt,
      documentCount: p._count.documentProjects,
      videoCount: p._count.videoProjects,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getProjectDetail(id: bigint) {
    const project = await this.prisma.project.findFirst({
      where: { id, isDeleted: 0 },
      include: {
        category: {
          select: { id: true, name: true },
        },
        province: {
          select: { id: true, name: true },
        },
        city: {
          select: { id: true, name: true },
        },
        district: {
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
                isDeleted: true,
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
                isDeleted: true,
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
      provinceName: project.province?.name,
      cityId: project.cityId,
      cityName: project.city?.name,
      districtId: project.districtId,
      districtName: project.district?.name,
      type: project.type,
      sortOrder: project.sortOrder,
      createdAt: project.createdAt,
      batches: project.batches.map((b) => ({
        id: b.id,
        name: b.name,
        startTime: b.startTime,
        remark: b.remark,
        sortOrder: b.sortOrder,
      })),
      documents: project.documentProjects
        .filter((dp) => dp.document.isDeleted === 0)
        .map((dp) => ({
          id: dp.document.id,
          name: dp.document.name,
          docType: dp.document.docType,
          fileName: dp.document.fileName,
          fileExt: dp.document.fileExt,
          fileSize: dp.document.fileSize,
        })),
      videos: project.videoProjects
        .filter((vp) => vp.video.isEnabled === 1 && vp.video.isDeleted === 0)
        .map((vp) => ({
          id: vp.video.id,
          title: vp.video.title,
          url: vp.video.url,
          platform: vp.video.platform,
        })),
      documentCount: project.documentProjects.filter((dp) => dp.document.isDeleted === 0).length,
      videoCount: project.videoProjects.filter((vp) => vp.video.isEnabled === 1 && vp.video.isDeleted === 0).length,
    };
  }

  // ==================== Documents ====================

  async getDocuments(query: QueryFrontDocumentDto) {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      year,
      provinceId,
      cityId,
      districtId,
      docType,
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
    if (tagId) {
      where.documentTags = {
        some: { tagId: BigInt(tagId) },
      };
    }
    if (keyword) {
      where.name = { contains: keyword, mode: 'insensitive' };
    }

    const [total, documents] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
          province: {
            select: { id: true, name: true },
          },
          city: {
            select: { id: true, name: true },
          },
          district: {
            select: { id: true, name: true },
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
      provinceName: doc.province?.name,
      cityId: doc.cityId,
      cityName: doc.city?.name,
      districtId: doc.districtId,
      districtName: doc.district?.name,
      docType: doc.docType,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileExt: doc.fileExt,
      tags: doc.documentTags.map((dt) => ({
        id: dt.tag.id,
        name: dt.tag.name,
        groupType: dt.tag.groupType,
      })),
      createdAt: doc.createdAt,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getDocumentDetail(id: bigint) {
    const doc = await this.prisma.document.findFirst({
      where: { id, isDeleted: 0 },
      include: {
        category: {
          select: { id: true, name: true },
        },
        province: {
          select: { id: true, name: true },
        },
        city: {
          select: { id: true, name: true },
        },
        district: {
          select: { id: true, name: true },
        },
        documentTags: {
          include: {
            tag: {
              select: { id: true, name: true, groupType: true },
            },
          },
        },
        documentProjects: {
          include: {
            project: {
              select: { id: true, name: true },
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
      provinceName: doc.province?.name,
      cityId: doc.cityId,
      cityName: doc.city?.name,
      districtId: doc.districtId,
      districtName: doc.district?.name,
      docType: doc.docType,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileExt: doc.fileExt,
      version: doc.version,
      tags: doc.documentTags.map((dt) => ({
        id: dt.tag.id,
        name: dt.tag.name,
        groupType: dt.tag.groupType,
      })),
      projects: doc.documentProjects.map((dp) => ({
        id: dp.project.id,
        name: dp.project.name,
      })),
      createdAt: doc.createdAt,
    };
  }

  async searchDocuments(keyword: string, page: number = 1, pageSize: number = 20) {
    if (!keyword) {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const where: any = {
      isDeleted: 0,
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        {
          documentTags: {
            some: {
              tag: {
                name: { contains: keyword, mode: 'insensitive' },
              },
            },
          },
        },
      ],
    };

    const [total, documents] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
          province: {
            select: { id: true, name: true },
          },
          city: {
            select: { id: true, name: true },
          },
          district: {
            select: { id: true, name: true },
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
      provinceName: doc.province?.name,
      cityId: doc.cityId,
      cityName: doc.city?.name,
      districtId: doc.districtId,
      districtName: doc.district?.name,
      docType: doc.docType,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileExt: doc.fileExt,
      tags: doc.documentTags.map((dt) => ({
        id: dt.tag.id,
        name: dt.tag.name,
        groupType: dt.tag.groupType,
      })),
      createdAt: doc.createdAt,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ==================== Videos ====================

  async getVideos(query: QueryFrontVideoDto) {
    const { page = 1, pageSize = 20, keyword } = query;

    const where: any = { isDeleted: 0, isEnabled: 1 };
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
      sortOrder: v.sortOrder,
      projects: v.videoProjects.map((vp) => ({
        id: vp.project.id,
        name: vp.project.name,
      })),
      tags: v.videoTags.map((vt) => ({
        id: vt.tag.id,
        name: vt.tag.name,
        groupType: vt.tag.groupType,
      })),
      createdAt: v.createdAt,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getVideoDetail(id: bigint) {
    const video = await this.prisma.video.findFirst({
      where: { id, isDeleted: 0, isEnabled: 1 },
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
    });

    if (!video) {
      throw new NotFoundException(`Video with id ${id} not found`);
    }

    return {
      id: video.id,
      title: video.title,
      url: video.url,
      platform: video.platform,
      sortOrder: video.sortOrder,
      projects: video.videoProjects.map((vp) => ({
        id: vp.project.id,
        name: vp.project.name,
      })),
      tags: video.videoTags.map((vt) => ({
        id: vt.tag.id,
        name: vt.tag.name,
        groupType: vt.tag.groupType,
      })),
      createdAt: video.createdAt,
    };
  }

  // ==================== Download ====================

  async verifyCode(code: string) {
    try {
      await this.authCodeService.verify(code);
      return { valid: true, message: 'Auth code is valid' };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Invalid auth code',
      };
    }
  }

  async downloadDocument(
    documentId: bigint,
    code: string,
    ipAddress: string | null,
    userAgent: string | null,
  ) {
    // 1. Validate auth code
    const authCode = await this.authCodeService.verify(code);

    // 2. Check document exists and not deleted
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, isDeleted: 0 },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // 3. Increment auth code downloadCount
    await this.prisma.authorizationCode.update({
      where: { id: authCode.id },
      data: { downloadCount: { increment: 1 } },
    });

    // 4. Create authorization_log record
    await this.prisma.authorizationLog.create({
      data: {
        authCodeId: authCode.id,
        documentId: document.id,
        ipAddress,
        userAgent,
        downloadedAt: new Date(),
      },
    });

    // 5. Create download_log record
    await this.prisma.downloadLog.create({
      data: {
        documentId: document.id,
        authCodeId: authCode.id,
        ipAddress,
        downloadedAt: new Date(),
      },
    });

    // 6. Return document info for file streaming
    return {
      filePath: document.filePath,
      fileName: document.fileName,
      fileExt: document.fileExt,
    };
  }
}
