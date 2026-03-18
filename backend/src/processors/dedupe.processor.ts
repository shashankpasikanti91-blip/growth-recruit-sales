import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DedupeJobData {
  tenantId: string;
  entityType: 'CANDIDATE' | 'LEAD';
  entityId: string;
  email: string;
}

/**
 * Deduplication queue processor.
 * Runs after import to detect and merge potential duplicate records.
 */
@Processor('dedupe')
export class DedupeProcessor {
  private readonly logger = new Logger(DedupeProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('check-candidate-dupe')
  async checkCandidateDupe(job: Job<DedupeJobData>) {
    const { tenantId, entityId, email } = job.data;

    const duplicates = await this.prisma.candidate.findMany({
      where: { tenantId, email, NOT: { id: entityId } },
      select: { id: true, createdAt: true },
    });

    if (duplicates.length === 0) return { isDuplicate: false };

    // Flag as possible duplicate
    await this.prisma.candidate.update({
      where: { id: entityId },
      data: { isDuplicate: true },
    });

    this.logger.warn(`Candidate ${entityId} flagged as possible duplicate of ${duplicates.map(d => d.id).join(', ')}`);
    return { isDuplicate: true, duplicateOf: duplicates.map(d => d.id) };
  }

  @Process('check-lead-dupe')
  async checkLeadDupe(job: Job<DedupeJobData>) {
    const { tenantId, entityId, email } = job.data;

    const duplicates = await this.prisma.lead.findMany({
      where: { tenantId, email, NOT: { id: entityId } },
      select: { id: true, createdAt: true },
    });

    if (duplicates.length === 0) return { isDuplicate: false };

    await this.prisma.lead.update({
      where: { id: entityId },
      data: { isDuplicate: true },
    });

    this.logger.warn(`Lead ${entityId} flagged as possible duplicate of ${duplicates.map(d => d.id).join(', ')}`);
    return { isDuplicate: true, duplicateOf: duplicates.map(d => d.id) };
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Dedupe job ${job.id} failed: ${error.message}`);
  }
}
