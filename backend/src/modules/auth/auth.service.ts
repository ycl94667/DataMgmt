import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (admin.isEnabled !== 1) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: admin.id.toString(),
      username: admin.username,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      admin: {
        id: admin.id.toString(),
        username: admin.username,
        realName: admin.realName,
        role: admin.role,
      },
    };
  }

  async validateAdmin(payload: { sub: string; username: string }) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: BigInt(payload.sub) },
    });

    if (!admin || admin.isEnabled !== 1) {
      return null;
    }

    return admin;
  }
}
