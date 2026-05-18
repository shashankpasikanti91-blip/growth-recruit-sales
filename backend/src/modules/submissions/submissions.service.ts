import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessIdService } from '../billing/business-id.service';
import { CreateSubmissionDto, UpdateSubmissionDto } from './dto/submission.dto';
import { SubmissionStage } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateSubmissionDto, createdById?: string) {
    // QA Gate: candidate must have at least one CV/resume before submission
    const resumeCount = await this.prisma.resume.count({
      where: { candidateId: dto.candidateId },
    });
    if (resumeCount === 0) {
      throw new BadRequestException(
        'Candidate must have a CV/resume uploaded before being submitted to a client.',
      );
    }

    // Prevent duplicate submission
    const existing = await this.prisma.submission.findFirst({
      where: {
        tenantId,
        clientId: dto.clientId,
        jobId: dto.jobId,
        candidateId: dto.candidateId,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        'This candidate has already been submitted for this job',
      );
    }

    const submission = await this.prisma.submission.create({
      data: {
        id:         uuidv4(),
        businessId: await this.businessIdService.generate('submission'),
        tenantId,
        ...dto,
        submittedAt: dto.stage === 'SUBMITTED_TO_CLIENT' ? new Date() : undefined,
        lastActivityAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true } },
        job: { select: { id: true, title: true, location: true } },
        candidate: { select: { id: true, firstName: true, lastName: true, currentTitle: true, overallScore: true } },
      },
    });

    // Log creation activity
    if (createdById) {
      const actBid = await this.businessIdService.generate('activity');
      await this.prisma.activity.create({
        data: {
          tenantId,
          businessId: actBid,
          userId: createdById,
          submissionId: submission.id,
          type: 'NOTE',
          title: 'Submission Created',
          description: `Submission ${submission.businessId} created for ${(submission.candidate as any)?.firstName} ${(submission.candidate as any)?.lastName}`,
        },
      }).catch(() => { /* non-critical */ });
    }

    // Notify sales owner via event bus
    this.eventEmitter.emit('submission.created', {
      tenantId,
      submissionId: submission.id,
      businessId: submission.businessId,
      candidateId: submission.candidateId,
      jobId: submission.jobId,
      clientId: submission.clientId,
      salesOwnerId: dto.salesOwnerId,
      createdById,
    });

    return submission;
  }

  async findAll(tenantId: string, opts: {
    clientId?: string; jobId?: string; candidateId?: string;
    recruiterId?: string; stage?: string; search?: string;
    page?: number; limit?: number;
  } = {}) {
    const { clientId, jobId, candidateId, recruiterId, stage, search, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
      ...(clientId && { clientId }),
      ...(jobId && { jobId }),
      ...(candidateId && { candidateId }),
      ...(recruiterId && { recruiterId }),
      ...(stage && { stage: stage as SubmissionStage }),
    };

    const [items, total] = await Promise.all([
      this.prisma.submission.findMany({
        where, skip, take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          job: { select: { id: true, title: true, location: true } },
          candidate: {
            select: {
              id: true, firstName: true, lastName: true,
              currentTitle: true, overallScore: true,
            },
          },
        },
      }),
      this.prisma.submission.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const sub = await this.prisma.submission.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        client: true,
        job: true,
        candidate: {
          include: {
            resumes: { where: { isPrimary: true }, take: 1 },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!sub) throw new NotFoundException(`Submission ${id} not found`);
    return sub;
  }

  async update(tenantId: string, id: string, dto: UpdateSubmissionDto) {
    await this.findOne(tenantId, id);
    const submittedAt =
      dto.stage === 'SUBMITTED_TO_CLIENT' ? new Date() : undefined;
    return this.prisma.submission.update({
      where: { id },
      data: {
        ...dto,
        interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : undefined,
        submittedAt,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /** Sales-only: record client feedback and optionally advance stage */
  async updateClientFeedback(
    tenantId: string,
    id: string,
    userId: string,
    payload: { feedback: string; stage?: SubmissionStage },
  ) {
    const sub = await this.findOne(tenantId, id);
    const updated = await this.prisma.submission.update({
      where: { id },
      data: {
        clientFeedback: payload.feedback,
        ...(payload.stage && { stage: payload.stage }),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log activity
    const actBid = await this.businessIdService.generate('activity');
    await this.prisma.activity.create({
      data: {
        tenantId,
        businessId: actBid,
        userId,
        submissionId: id,
        type: 'NOTE',
        title: 'Client Feedback Recorded',
        description: payload.feedback.slice(0, 500),
      },
    }).catch(() => { /* non-critical */ });

    this.eventEmitter.emit('submission.feedback', {
      tenantId,
      submissionId: id,
      recruiterId: (sub as any).recruiterId,
      stage: updated.stage,
    });

    return updated;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.submission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(tenantId: string) {
    const stages = Object.values(SubmissionStage);
    const results = await this.prisma.submission.groupBy({
      by: ['stage'],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
    });

    return stages.map((stage) => ({
      stage,
      count: results.find((r) => r.stage === stage)?._count._all ?? 0,
    }));
  }
}
