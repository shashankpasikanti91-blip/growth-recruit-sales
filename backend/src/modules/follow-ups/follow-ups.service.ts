import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFollowUpDto, UpdateFollowUpDto } from './dto/follow-up.dto';
import { BusinessIdService } from '../billing/business-id.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
  ) {}

  async create(tenantId: string, dto: CreateFollowUpDto) {
    return this.prisma.followUp.create({
      data: {
        id: uuidv4(),
        businessId: await this.businessIdService.generate('followUp'),
        tenantId,
        ...dto,
        scheduledAt: new Date(dto.scheduledAt),
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });
  }

  async findAll(tenantId: string, opts: {
    clientId?: string; leadId?: string; status?: string;
    ownerId?: string; upcoming?: boolean; page?: number; limit?: number;
  } = {}) {
    const { clientId, leadId, status, ownerId, upcoming, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      ...(clientId && { clientId }),
      ...(leadId && { leadId }),
      ...(ownerId && { ownerId }),
      ...(status && { status }),
      ...(upcoming && { scheduledAt: { gte: new Date() }, status: 'PENDING' }),
    };

    const [items, total] = await Promise.all([
      this.prisma.followUp.findMany({
        where, skip, take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          client: { select: { id: true, name: true } },
          lead: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          contact: { select: { id: true, firstName: true, lastName: true, title: true } },
        },
      }),
      this.prisma.followUp.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const fu = await this.prisma.followUp.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        lead: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        contact: true,
      },
    });
    if (!fu) throw new NotFoundException(`Follow-up ${id} not found`);
    return fu;
  }

  async update(tenantId: string, id: string, dto: UpdateFollowUpDto) {
    await this.findOne(tenantId, id);
    await this.prisma.followUp.updateMany({
      where: { id, tenantId },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
        updatedAt: new Date(),
      },
    });
    return this.findOne(tenantId, id);
  }

  async markDone(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.followUp.updateMany({
      where: { id, tenantId },
      data: { status: 'DONE', completedAt: new Date(), updatedAt: new Date() },
    });
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.followUp.deleteMany({ where: { id, tenantId } });
    return { deleted: true };
  }

  async getUpcomingToday(tenantId: string) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    return this.prisma.followUp.findMany({
      where: {
        tenantId,
        status: 'PENDING',
        scheduledAt: { gte: start, lte: end },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        client: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
