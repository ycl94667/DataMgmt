import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { CreateAuthCodeDto } from './dto/create-auth-code.dto.js';
import { UpdateAuthCodeDto } from './dto/update-auth-code.dto.js';
import { AuthCodeStatus } from '@prisma/client';

@Injectable()
export class AuthCodeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an 8-character uppercase alphanumeric code, ensuring uniqueness.
   */
  async generateCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists = true;

    while (exists) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.prisma.authorizationCode.findUnique({
        where: { code },
      });
      exists = !!existing;
    }

    return code!;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    status?: AuthCodeStatus,
  ) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      this.prisma.authorizationCode.count({ where }),
      this.prisma.authorizationCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        status: item.status,
        maxDownloads: item.maxDownloads,
        downloadCount: item.downloadCount,
        expiresAt: item.expiresAt,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(dto: CreateAuthCodeDto, createdBy: bigint) {
    const code = await this.generateCode();

    const authCode = await this.prisma.authorizationCode.create({
      data: {
        code,
        name: dto.name,
        description: dto.description,
        status: AuthCodeStatus.active,
        maxDownloads: dto.maxDownloads ?? -1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy,
      },
    });

    return {
      id: authCode.id,
      code: authCode.code,
      name: authCode.name,
      description: authCode.description,
      status: authCode.status,
      maxDownloads: authCode.maxDownloads,
      downloadCount: authCode.downloadCount,
      expiresAt: authCode.expiresAt,
      createdBy: authCode.createdBy,
      createdAt: authCode.createdAt,
      updatedAt: authCode.updatedAt,
    };
  }

  async update(id: bigint, dto: UpdateAuthCodeDto) {
    const existing = await this.prisma.authorizationCode.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Auth code with id ${id} not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.maxDownloads !== undefined) data.maxDownloads = dto.maxDownloads;
    if (dto.expiresAt !== undefined) data.expiresAt = new Date(dto.expiresAt);

    const authCode = await this.prisma.authorizationCode.update({
      where: { id },
      data,
    });

    return {
      id: authCode.id,
      code: authCode.code,
      name: authCode.name,
      description: authCode.description,
      status: authCode.status,
      maxDownloads: authCode.maxDownloads,
      downloadCount: authCode.downloadCount,
      expiresAt: authCode.expiresAt,
      createdBy: authCode.createdBy,
      createdAt: authCode.createdAt,
      updatedAt: authCode.updatedAt,
    };
  }

  async delete(id: bigint) {
    const existing = await this.prisma.authorizationCode.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Auth code with id ${id} not found`);
    }

    await this.prisma.authorizationCode.delete({
      where: { id },
    });

    return { message: 'Auth code deleted successfully' };
  }

  async disable(id: bigint) {
    const existing = await this.prisma.authorizationCode.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Auth code with id ${id} not found`);
    }

    const authCode = await this.prisma.authorizationCode.update({
      where: { id },
      data: { status: AuthCodeStatus.disabled },
    });

    return {
      id: authCode.id,
      code: authCode.code,
      name: authCode.name,
      status: authCode.status,
      updatedAt: authCode.updatedAt,
    };
  }

  async enable(id: bigint) {
    const existing = await this.prisma.authorizationCode.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Auth code with id ${id} not found`);
    }

    const authCode = await this.prisma.authorizationCode.update({
      where: { id },
      data: { status: AuthCodeStatus.active },
    });

    return {
      id: authCode.id,
      code: authCode.code,
      name: authCode.name,
      status: authCode.status,
      updatedAt: authCode.updatedAt,
    };
  }

  async getLogs(id: bigint) {
    const existing = await this.prisma.authorizationCode.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Auth code with id ${id} not found`);
    }

    const logs = await this.prisma.authorizationLog.findMany({
      where: { authCodeId: id },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileName: true,
            fileExt: true,
            docType: true,
          },
        },
      },
      orderBy: { downloadedAt: 'desc' },
    });

    return logs.map((log) => ({
      id: log.id,
      authCodeId: log.authCodeId,
      documentId: log.documentId,
      document: {
        id: log.document.id,
        name: log.document.name,
        fileName: log.document.fileName,
        fileExt: log.document.fileExt,
        docType: log.document.docType,
      },
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      downloadedAt: log.downloadedAt,
    }));
  }

  async batchGenerate(
    count: number,
    options: { name?: string; maxDownloads?: number; expiresAt?: string },
    createdBy: bigint,
  ) {
    if (count < 1 || count > 100) {
      throw new BadRequestException('Count must be between 1 and 100');
    }

    const results: {
      id: bigint;
      code: string;
      name: string;
      status: AuthCodeStatus;
      maxDownloads: number;
      expiresAt: Date | null;
      createdAt: Date;
    }[] = [];
    for (let i = 0; i < count; i++) {
      const code = await this.generateCode();
      const authCode = await this.prisma.authorizationCode.create({
        data: {
          code,
          name: options.name || `Batch-${code}`,
          status: AuthCodeStatus.active,
          maxDownloads: options.maxDownloads ?? -1,
          expiresAt: options.expiresAt ? new Date(options.expiresAt) : null,
          createdBy,
        },
      });
      results.push({
        id: authCode.id,
        code: authCode.code,
        name: authCode.name,
        status: authCode.status,
        maxDownloads: authCode.maxDownloads,
        expiresAt: authCode.expiresAt,
        createdAt: authCode.createdAt,
      });
    }

    return results;
  }

  async verify(code: string) {
    const authCode = await this.prisma.authorizationCode.findUnique({
      where: { code },
    });

    if (!authCode) {
      throw new NotFoundException('Auth code not found');
    }

    if (authCode.status !== AuthCodeStatus.active) {
      throw new BadRequestException('Auth code is not active');
    }

    if (authCode.expiresAt && authCode.expiresAt < new Date()) {
      throw new BadRequestException('Auth code has expired');
    }

    if (
      authCode.maxDownloads !== -1 &&
      authCode.downloadCount >= authCode.maxDownloads
    ) {
      throw new BadRequestException('Auth code has reached download limit');
    }

    return {
      id: authCode.id,
      code: authCode.code,
      name: authCode.name,
      status: authCode.status,
      maxDownloads: authCode.maxDownloads,
      downloadCount: authCode.downloadCount,
      expiresAt: authCode.expiresAt,
    };
  }
}
