import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import { BusinessIdService } from '../billing/business-id.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
  ) {}

  // ─── Core log/run methods ───────────────────────────────────────────────────

  async logRun(params: {
    tenantId: string;
    workflowType: string;
    entityId?: string;
    triggeredBy?: string;
    status: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.workflowRun.create({
      data: {
        businessId: await this.businessIdService.generate('workflowRun'),
        tenantId: params.tenantId,
        workflowType: params.workflowType as any,
        triggeredBy: params.triggeredBy,
        status: params.status as any,
        startedAt: new Date(),
        inputData: { entityId: params.entityId, ...(params.metadata ?? {}) },
      },
    });
  }

  async findAll(
    tenantId: string,
    filters?: {
      workflowType?: string;
      status?: string;
      isPaused?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const { workflowType, status, isPaused, page = 1, limit = 50 } = filters ?? {};
    const where: any = { tenantId };
    if (workflowType) where.workflowType = workflowType as any;
    if (status) where.status = status as any;
    if (isPaused !== undefined) where.isPaused = isPaused;

    const [data, total] = await Promise.all([
      this.prisma.workflowRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workflowRun.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const run = await this.prisma.workflowRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Workflow run not found');
    return run;
  }

  async markComplete(id: string, result?: Record<string, any>) {
    return this.prisma.workflowRun.update({
      where: { id },
      data: {
        status: 'SUCCESS' as any,
        completedAt: new Date(),
        isPaused: false,
        outputData: result ?? {},
      },
    });
  }

  async markFailed(id: string, errorMessage: string) {
    return this.prisma.workflowRun.update({
      where: { id },
      data: { status: 'FAILED' as any, completedAt: new Date(), errorMessage },
    });
  }

  // ─── Pause / Resume controls ────────────────────────────────────────────────

  /**
   * Pause a workflow run (manual or auto-pause).
   * Sets status=PAUSED, isPaused=true, records reason and timestamp.
   */
  async pause(tenantId: string, id: string, reason: string) {
    const run = await this.prisma.workflowRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Workflow run not found');
    if (run.status === 'SUCCESS' || run.status === 'CANCELLED') {
      throw new ForbiddenException(`Cannot pause a run with status ${run.status}`);
    }
    return this.prisma.workflowRun.update({
      where: { id },
      data: {
        status: 'PAUSED' as any,
        isPaused: true,
        pausedAt: new Date(),
        pauseReason: reason,
      },
    });
  }

  /**
   * Resume a paused workflow run.
   * Sets status=QUEUED, isPaused=false, records resume timestamp.
   */
  async resume(tenantId: string, id: string) {
    const run = await this.prisma.workflowRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Workflow run not found');
    if ((run.status as string) !== 'PAUSED') {
      throw new ForbiddenException('Only PAUSED runs can be resumed');
    }
    return this.prisma.workflowRun.update({
      where: { id },
      data: {
        status: 'QUEUED' as any,
        isPaused: false,
        resumedAt: new Date(),
        pauseReason: null,
      },
    });
  }

  /**
   * Retry a failed/cancelled workflow run.
   */
  async retry(tenantId: string, id: string) {
    const run = await this.prisma.workflowRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Workflow run not found');
    if (run.status !== 'FAILED' && (run.status as string) !== 'PAUSED') {
      throw new ForbiddenException('Only FAILED or PAUSED runs can be retried');
    }
    return this.prisma.workflowRun.update({
      where: { id },
      data: {
        status: 'RETRYING' as any,
        isPaused: false,
        retryCount: { increment: 1 },
        completedAt: null,
        errorMessage: null,
      },
    });
  }

  /**
   * Cancel a workflow run with an optional reason.
   */
  async cancel(tenantId: string, id: string, reason?: string) {
    const run = await this.prisma.workflowRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Workflow run not found');
    if (run.status === 'SUCCESS' || run.status === 'CANCELLED') {
      throw new ForbiddenException(`Run is already ${run.status}`);
    }
    return this.prisma.workflowRun.update({
      where: { id },
      data: {
        status: 'CANCELLED' as any,
        isPaused: false,
        completedAt: new Date(),
        ...(reason ? { pauseReason: reason } : {}),
      },
    });
  }

  /**
   * Admin manual override — force any status with an audit note.
   * Used when an action is blocked by auto-pause rules and admin needs to unblock it.
   */
  async manualOverride(
    tenantId: string,
    id: string,
    overriddenBy: string,
    note: string,
    forceStatus?: string,
  ) {
    const run = await this.prisma.workflowRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Workflow run not found');
    return this.prisma.workflowRun.update({
      where: { id },
      data: {
        overrideNote: note,
        overriddenBy,
        overriddenAt: new Date(),
        isPaused: false,
        ...(forceStatus ? { status: forceStatus as any } : {}),
      },
    });
  }

  // ─── Analytics / Stats ──────────────────────────────────────────────────────

  async getStats(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [total, byStatus, byType, recentFailed, pausedRuns, avgDurationResult] =
      await Promise.all([
        this.prisma.workflowRun.count({ where: { tenantId, createdAt: { gte: since } } }),

        this.prisma.workflowRun.groupBy({
          by: ['status'],
          where: { tenantId, createdAt: { gte: since } },
          _count: true,
        }),

        this.prisma.workflowRun.groupBy({
          by: ['workflowType'],
          where: { tenantId, createdAt: { gte: since } },
          _count: true,
          orderBy: { _count: { workflowType: 'desc' } },
        }),

        this.prisma.workflowRun.findMany({
          where: { tenantId, status: 'FAILED' as any, createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            businessId: true,
            workflowType: true,
            errorMessage: true,
            createdAt: true,
          },
        }),

        this.prisma.workflowRun.count({
          where: { tenantId, isPaused: true },
        }),

        this.prisma.$queryRaw<{ avg_ms: number | null }[]>`
          SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) * 1000)::int AS avg_ms
          FROM workflow_runs
          WHERE "tenantId" = ${tenantId}
            AND "status" = 'SUCCESS'
            AND "startedAt" IS NOT NULL
            AND "completedAt" IS NOT NULL
            AND "createdAt" >= ${since}
        `,
      ]);

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) statusMap[s.status] = s._count;

    const successCount = statusMap['SUCCESS'] ?? 0;
    const failedCount = statusMap['FAILED'] ?? 0;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

    return {
      period: { days, since: since.toISOString() },
      summary: {
        total,
        success: successCount,
        failed: failedCount,
        paused: (statusMap['PAUSED'] as number) ?? 0,
        retrying: statusMap['RETRYING'] ?? 0,
        cancelled: statusMap['CANCELLED'] ?? 0,
        currentlyPaused: pausedRuns,
        successRate,
        avgDurationMs: avgDurationResult[0]?.avg_ms ?? null,
      },
      byType: byType.map(t => ({ type: t.workflowType, count: t._count })),
      recentFailures: recentFailed,
    };
  }

  // ─── Auto-pause conditions ──────────────────────────────────────────────────

  /**
   * Auto-pause a workflow run when a system condition is met.
   * Called internally after repeated failures or rule violations.
   */
  async autoPause(tenantId: string, id: string, reason: string) {
    return this.pause(tenantId, id, `[AUTO-PAUSE] ${reason}`);
  }

  // ─── Event listeners ────────────────────────────────────────────────────────

  @OnEvent('application.screened')
  async onApplicationScreened(payload: {
    tenantId: string;
    applicationId: string;
    decision: string;
    score: number;
    candidateId: string;
  }) {
    await this.logRun({
      tenantId: payload.tenantId,
      workflowType: 'CANDIDATE_SCREENING',
      entityId: payload.applicationId,
      status: 'SUCCESS',
      metadata: { decision: payload.decision, score: payload.score },
    });
  }

  @OnEvent('application.created')
  async onApplicationCreated(payload: { tenantId: string; application: any }) {
    await this.logRun({
      tenantId: payload.tenantId,
      workflowType: 'CANDIDATE_IMPORTED',
      entityId: payload.application.id,
      status: 'SUCCESS',
      metadata: { stage: payload.application.stage },
    });
  }

  @OnEvent('lead.created')
  async onLeadCreated(payload: { tenantId: string; lead: any }) {
    await this.logRun({
      tenantId: payload.tenantId,
      workflowType: 'LEAD_IMPORTED',
      entityId: payload.lead.id,
      status: 'SUCCESS',
      metadata: { stage: payload.lead.stage },
    });
  }
}
