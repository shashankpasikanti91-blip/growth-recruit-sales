import { Injectable, ConflictException, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessIdService } from '../billing/business-id.service';
import { CreateUserDto, UpdateUserDto, UpdateMeDto, ChangePasswordDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
  ) {}

  async create(tenantId: string, dto: CreateUserDto) {
    // Check tenant user limit
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const userCount = await this.prisma.user.count({ where: { tenantId, isActive: true } });
    if (userCount >= tenant.maxUsers) {
      throw new ForbiddenException(`Tenant user limit (${tenant.maxUsers}) reached`);
    }

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) throw new ConflictException('Email already registered in this tenant');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const businessId = await this.businessIdService.generate('user');
    const user = await this.prisma.user.create({
      data: {
        tenantId, email: dto.email, passwordHash, businessId,
        firstName: dto.firstName, lastName: dto.lastName,
        fullName: `${dto.firstName} ${dto.lastName}`,
        role: dto.role,
      },
    });

    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async findAll(tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, lastLoginAt: true, createdAt: true,
        },
      }),
      this.prisma.user.count({ where: { tenantId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true, lastLoginAt: true, settings: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(tenantId: string, id: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    const { firstName, lastName, phone, jobTitle } = dto;
    const settings = { ...(user.settings as Record<string, any> ?? {}) };
    if (phone !== undefined) settings.phone = phone;
    if (jobTitle !== undefined) settings.jobTitle = jobTitle;

    const fn = firstName ?? user.firstName;
    const ln = lastName ?? user.lastName;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        fullName: `${fn} ${ln}`.trim(),
        settings,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true, settings: true, createdAt: true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(tenantId, id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true, isActive: true,
      },
    });
  }

  async changePassword(tenantId: string, id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: 'Password changed successfully' };
  }
}
