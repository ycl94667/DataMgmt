import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { UpdateAdminDto } from './dto/update-admin.dto.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.admin.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          realName: true,
          role: true,
          isEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.admin.count(),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        id: item.id.toString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(createAdminDto: CreateAdminDto) {
    const existing = await this.prisma.admin.findUnique({
      where: { username: createAdminDto.username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(createAdminDto.password, saltRounds);

    const admin = await this.prisma.admin.create({
      data: {
        username: createAdminDto.username,
        passwordHash,
        realName: createAdminDto.realName,
        role: createAdminDto.role,
      },
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        isEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...admin,
      id: admin.id.toString(),
    };
  }

  async update(id: bigint, updateAdminDto: UpdateAdminDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (updateAdminDto.username && updateAdminDto.username !== admin.username) {
      const existing = await this.prisma.admin.findUnique({
        where: { username: updateAdminDto.username },
      });
      if (existing) {
        throw new ConflictException('Username already exists');
      }
    }

    const data: Record<string, unknown> = {};

    if (updateAdminDto.username !== undefined) {
      data.username = updateAdminDto.username;
    }
    if (updateAdminDto.realName !== undefined) {
      data.realName = updateAdminDto.realName;
    }
    if (updateAdminDto.role !== undefined) {
      data.role = updateAdminDto.role;
    }
    if (updateAdminDto.isEnabled !== undefined) {
      data.isEnabled = updateAdminDto.isEnabled;
    }
    if (updateAdminDto.password) {
      const saltRounds = 10;
      data.passwordHash = await bcrypt.hash(updateAdminDto.password, saltRounds);
    }

    const updated = await this.prisma.admin.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        isEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      id: updated.id.toString(),
    };
  }

  async delete(id: bigint) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    await this.prisma.admin.delete({
      where: { id },
    });

    return { message: 'Admin deleted successfully' };
  }
}
