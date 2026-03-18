import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValues ?? {},
        newValue: params.newValues ?? {},
        ipAddress: params.ipAddress,
      },
    });
  }

  async findAll(tenantId: string, filters: { entityType?: string; userId?: string; page?: number; limit?: number }) {
    const { entityType, userId, page = 1, limit = 50 } = filters;
    const where: any = { tenantId };
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  // ─── Auto-log application stage changes via events ──────────────────────────

  @OnEvent('application.stage_changed')
  async onApplicationStageChanged(payload: {
    tenantId: string;
    applicationId: string;
    oldStage: string;
    newStage: string;
  }) {
    await this.log({
      tenantId: payload.tenantId,
      action: 'STAGE_CHANGED',
      entityType: 'Application',
      entityId: payload.applicationId,
      oldValues: { stage: payload.oldStage },
      newValues: { stage: payload.newStage },
    });
  }

  @OnEvent('application.screened')
  async onApplicationScreened(payload: {
    tenantId: string;
    applicationId: string;
    decision: string;
    score: number;
  }) {
    await this.log({
      tenantId: payload.tenantId,
      action: 'AI_SCREENED',
      entityType: 'Application',
      entityId: payload.applicationId,
      newValues: { decision: payload.decision, score: payload.score },
    });
  }
}
