import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(tenantId: string, page = 1, limit = 50) {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          businessId: true,
          email: true,
          firstName: true,
          lastName: true,
          fullName: true,
          role: true,
          authProvider: true,
          isActive: true,
          lastLoginAt: true,
          invitedAt: true,
          createdAt: true,
          invitedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.user.count({ where: { tenantId } }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async updateUserRole(tenantId: string, userId: string, role: UserRole, currentUserId: string) {
    // Prevent changing own role
    if (userId === currentUserId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('User not found');

    // Don't allow changing SUPER_ADMIN role
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot modify SUPER_ADMIN role');
    }

    // Don't allow assigning SUPER_ADMIN
    if (role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot assign SUPER_ADMIN role');
    }

    return this.prisma.user.update({
      where: { id: userId, tenantId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
  }

  async updateUserStatus(tenantId: string, userId: string, isActive: boolean, currentUserId: string) {
    // Prevent deactivating yourself
    if (userId === currentUserId) {
      throw new ForbiddenException('You cannot deactivate yourself');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('User not found');

    // Don't allow deactivating SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot deactivate SUPER_ADMIN');
    }

    return this.prisma.user.update({
      where: { id: userId, tenantId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
  }
}
