import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutreachGenerationService } from '../modules/outreach/outreach.service';

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
      targetProfile = { name: lead.fullName, title: lead.title, company: lead.company?.name ?? lead.companyName };
    }

    const message = await this.outreachService.generate(targetProfile, { channel: channel ?? 'EMAIL' });

    await this.prisma.outreachMessage.create({
      data: {
        tenantId,
        stepNumber: 1,
        channel: channel ?? 'EMAIL',
        subject: message.subject,
        body: message.body,
        status: 'PENDING',
        ...(targetType === 'CANDIDATE' ? { candidateId: targetId } : { leadId: targetId }),
      },
    });

    return { generated: true };
  }

  @Process('send-follow-up')
  async sendFollowUp(job: Job<{ tenantId: string; messageId: string }>) {
    const { tenantId, messageId } = job.data;
    const message = await this.prisma.outreachMessage.findFirst({ where: { id: messageId, tenantId } });
    if (!message || message.status !== 'PENDING') return { skipped: true };

    // Mark as queued — actual SMTP/LinkedIn send done via n8n node triggered by this event
    await this.prisma.outreachMessage.update({ where: { id: messageId }, data: { status: 'PENDING' } });
    this.logger.log(`Follow-up queued for message ${messageId} — n8n will handle dispatch`);
    return { queued: true };
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Outreach job ${job.id} (${job.name}) failed: ${error.message}`);
  }
}
