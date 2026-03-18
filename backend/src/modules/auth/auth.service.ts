import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    // Resolve tenant
    let tenantId: string | undefined;
    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug, isActive: true },
      });
      if (!tenant) throw new UnauthorizedException('Tenant not found or inactive');
      tenantId = tenant.id;
    }

    // Find user
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        ...(tenantId ? { tenantId } : {}),
        isActive: true,
      },
      include: { tenant: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.tenant.isActive) throw new UnauthorizedException('Tenant is inactive');

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { tenant: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    const { user } = stored;
    if (!user.isActive || !user.tenant.isActive) {
      throw new UnauthorizedException('User or tenant inactive');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    return tokens;
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(userId: string, email: string, tenantId: string, role: string) {
    const payload = { sub: userId, email, tenantId, role };

    const [accessToken, refreshTokenValue] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('auth.jwtSecret'),
        expiresIn: this.config.get('auth.jwtExpiresIn'),
      }),
      uuidv4(),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshTokenValue, expiresAt },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
