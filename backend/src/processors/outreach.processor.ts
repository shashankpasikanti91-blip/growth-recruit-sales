import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutreachGenerationService } from '../modules/ai/services/outreach-generation.service';

export interface OutreachJobData {
  tenantId: string;
  targetType: 'CANDIDATE' | 'LEAD';
  targetId: string;
  messageId?: string;
  channel?: string;
  jobId?: string;
}

/**
 * Processes the outreach queue.
 * Handles: auto-generating sequences after import, scheduling follow-ups.
 */
@Processor('outreach')
export class OutreachProcessor {
  private readonly logger = new Logger(OutreachProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outreachService: OutreachGenerationService,
  ) {}

  @Process('generate-outreach')
  async generateOutreach(job: Job<OutreachJobData>) {
    const { tenantId, targetType, targetId, channel, jobId } = job.data;
    this.logger.log(`Generating outreach for ${targetType} ${targetId}`);

    let targetProfile: any;

    if (targetType === 'CANDIDATE') {
      const candidate = await this.prisma.candidate.findFirst({ where: { id: targetId, tenantId } });
      if (!candidate) return { skipped: true };
      targetProfile = { name: `${candidate.firstName} ${candidate.lastName}`, title: candidate.currentTitle };
      if (jobId) {
        const job = await this.prisma.job.findFirst({ where: { id: jobId, tenantId } });
        if (job) targetProfile.jobTitle = job.title;
      }
    } else {
      const lead = await this.prisma.lead.findFirst({ where: { id: targetId, tenantId }, include: { company: { select: { name: true } } } });
      if (!lead) return { skipped: true };
      targetProfile = { name: `${lead.firstName} ${lead.lastName}`, title: lead.title, company: (lead.company as any)?.name };
    }

    const message = await this.outreachService.generate({
      channel: (channel?.toLowerCase() ?? 'email') as 'email' | 'linkedin' | 'whatsapp',
      entityType: targetType.toLowerCase() as 'candidate' | 'lead',
      tone: 'professional',
      recipientData: targetProfile,
      contextData: { jobId },
    });

    await this.prisma.outreachMessage.create({
      data: {
        tenantId,
        channel: channel ?? 'EMAIL',
        subject: message.subject,
        body: message.body,
        status: 'DRAFT',
        ...(targetType === 'CANDIDATE' ? { candidateId: targetId } : { leadId: targetId }),
      },
    });

    return { generated: true };
  }

  @Process('send-follow-up')
  async sendFollowUp(job: Job<{ tenantId: string; messageId: string }>) {
    const { tenantId, messageId } = job.data;
    const message = await this.prisma.outreachMessage.findFirst({ where: { id: messageId, tenantId } });
    if (!message || message.status !== 'DRAFT') return { skipped: true };

    // Mark as queued — actual SMTP/LinkedIn send done via n8n node triggered by this event
    await this.prisma.outreachMessage.update({ where: { id: messageId }, data: { status: 'PENDING_APPROVAL' } });
    this.logger.log(`Follow-up queued for message ${messageId} — n8n will handle dispatch`);
    return { queued: true };
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Outreach job (DLQ) ${job.id} (${job.name}) failed: ${error.message}`);
    try {
      await this.prisma.workflowRun.create({
        data: {
          tenantId: job.data?.tenantId ?? 'unknown',
          workflowType: 'OUTREACH_DRAFT_GENERATION',
          status: 'FAILED',
          inputData: job.data ?? {},
          errorMessage: error.message,
          retryCount: job.attemptsMade,
          startedAt: new Date(job.processedOn ?? Date.now()),
          completedAt: new Date(),
        },
      });
    } catch { /* best-effort */ }
  }
}
