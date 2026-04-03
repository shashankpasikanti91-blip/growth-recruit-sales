import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadScoringService } from '../modules/ai/services/lead-scoring.service';
import { BusinessIdService } from '../modules/billing/business-id.service';

export interface EnrichmentJobData {
  tenantId: string;
  entityType: 'LEAD' | 'CANDIDATE';
  entityId: string;
}

/**
 * Processes enrichment queue jobs.
 * Triggered by: ImportProcessor after creating a lead/candidate row,
 * or manually via POST /leads/:id/score.
 */
@Processor('enrichment')
export class EnrichmentProcessor {
  private readonly logger = new Logger(EnrichmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadScoring: LeadScoringService,
    private readonly businessIdService: BusinessIdService,
  ) {}

  @Process('enrich-lead')
  async enrichLead(job: Job<EnrichmentJobData>) {
    const { tenantId, entityId } = job.data;
    this.logger.log(`Enriching lead ${entityId}`);

    const lead = await this.prisma.lead.findFirst({
      where: { id: entityId, tenantId },
      include: { company: true },
    });
    if (!lead) {
      this.logger.warn(`Lead ${entityId} not found, skipping`);
      return { skipped: true };
    }

    const icp = await this.prisma.icpProfile.findFirst({ where: { tenantId, isActive: true } });
    if (!icp) {
      this.logger.warn(`No active ICP for tenant ${tenantId}, skipping enrichment`);
      return { skipped: true, reason: 'no-icp' };
    }

    const result = await this.leadScoring.score({
      leadData: {
        name: `${lead.firstName} ${lead.lastName}`,
        title: lead.title ?? '',
        company: (lead.company as any)?.name ?? '',
        industry: (lead.company as any)?.industry ?? '',
        email: lead.email ?? '',
        linkedinUrl: lead.linkedinUrl ?? '',
      },
      icpData: icp as any,
    });

    await this.prisma.lead.update({
      where: { id: entityId },
      data: { score: result.score, scoreDetails: { icpScore: result } as any },
    });

    return { score: result.score, recommendation: result.nextBestAction };
  }

  @Process('enrich-candidate')
  async enrichCandidate(job: Job<EnrichmentJobData>) {
    const { entityId } = job.data;
    this.logger.log(`Enrichment check for candidate ${entityId} — no-op (screening handles scoring)`);
    return { skipped: false, message: 'Candidate enrichment deferred to screening pipeline' };
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Enrichment job ${job.id} (${job.name}) failed: ${error.message}`);
    try {
      await this.prisma.workflowRun.create({
        data: {
          tenantId: job.data?.tenantId ?? 'unknown',
          workflowType: 'SCHEDULED_ENRICHMENT',
          status: 'FAILED',
          inputData: job.data ?? {},
          errorMessage: error.message,
          retryCount: job.attemptsMade,
          startedAt: new Date(job.processedOn ?? Date.now()),
          completedAt: new Date(),
          businessId: await this.businessIdService.generate('workflowRun'),
        },
      });
    } catch { /* best-effort */ }
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Enrichment job ${job.id} completed: ${JSON.stringify(result)}`);
  }
}
