import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

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
        tenantId: params.tenantId,
        workflowType: params.workflowType as any,
        triggeredBy: params.triggeredBy,
        status: params.status as any,
        inputData: { entityId: params.entityId, ...(params.metadata ?? {}) },
      },
    });
  }

  async findAll(tenantId: string, workflowType?: string) {
    return this.prisma.workflowRun.findMany({
      where: { tenantId, ...(workflowType ? { workflowType: workflowType as any } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markComplete(id: string, result?: Record<string, any>) {
    return this.prisma.workflowRun.update({
      where: { id },
      data: { status: 'SUCCESS', completedAt: new Date(), outputData: result ?? {} },
    });
  }

  async markFailed(id: string, errorMessage: string) {
    return this.prisma.workflowRun.update({
      where: { id },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage },
    });
  }

  // ─── Auto-log AI screening as a workflow run ────────────────────────────────

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
}
