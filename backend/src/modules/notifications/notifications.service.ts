import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateNotificationDto {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({ data: dto });
  }

  async list(
    userId: string,
    tenantId: string,
    opts: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ) {
    const { page = 1, limit = 20, unreadOnly = false } = opts;
    const skip = (page - 1) * limit;
    const where: any = { userId, tenantId, ...(unreadOnly ? { isRead: false } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async unreadCount(userId: string, tenantId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, tenantId, isRead: false } });
  }

  async markRead(id: string, userId: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId, tenantId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true },
    });
  }

  /** Preview the latest N for a bell-dropdown */
  async preview(userId: string, tenantId: string, take = 5) {
    return this.prisma.notification.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
