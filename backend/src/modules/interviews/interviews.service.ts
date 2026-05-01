import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessIdService } from '../billing/business-id.service';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/interview.dto';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, createdById: string, dto: CreateInterviewDto) {
    // Validate submission belongs to tenant
    const submission = await this.prisma.submission.findFirst({
      where: { id: dto.submissionId, tenantId, deletedAt: null },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const businessId = await this.businessIdService.generate('interview');
    const interview = await this.prisma.interview.create({
      data: {
        businessId,
        tenantId,
        submissionId: dto.submissionId,
        candidateId: dto.candidateId,
        jobId: dto.jobId,
        clientId: dto.clientId,
        round: dto.round ?? 1,
        mode: dto.mode ?? 'VIDEO',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        meetingLink: dto.meetingLink,
        notes: dto.notes,
        createdById,
      },
      include: {
        submission: {
          select: {
            id: true, businessId: true, stage: true,
            salesOwnerId: true,
            candidate: { select: { id: true, firstName: true, lastName: true } },
            job: { select: { id: true, title: true } },
          },
        },
      },
    });

    // Emit event so notifications listener can notify the sales owner
    this.eventEmitter.emit('interview.scheduled', {
      tenantId,
      interviewId: interview.id,
      submissionId: dto.submissionId,
      salesOwnerId: (interview.submission as any)?.salesOwnerId,
      candidateName: `${(interview.submission as any)?.candidate?.firstName ?? ''} ${(interview.submission as any)?.candidate?.lastName ?? ''}`.trim(),
      jobTitle: (interview.submission as any)?.job?.title ?? '',
      scheduledAt: interview.scheduledAt,
    });

    return interview;
  }

  async findAll(tenantId: string, opts: {
    submissionId?: string;
    candidateId?: string;
    jobId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { submissionId, candidateId, jobId, status, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: null,
      ...(submissionId && { submissionId }),
      ...(candidateId && { candidateId }),
      ...(jobId && { jobId }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.interview.findMany({
        where, skip, take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          submission: {
            select: {
              id: true, businessId: true,
              candidate: { select: { id: true, firstName: true, lastName: true, currentTitle: true } },
              job: { select: { id: true, title: true, location: true } },
              client: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.interview.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        submission: {
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true, email: true, currentTitle: true } },
            job: { select: { id: true, title: true, location: true, department: true } },
            client: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!interview) throw new NotFoundException(`Interview ${id} not found`);
    return interview;
  }

  async update(tenantId: string, id: string, dto: UpdateInterviewDto) {
    await this.findOne(tenantId, id);
    return this.prisma.interview.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.interview.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(tenantId: string) {
    const [total, scheduled, completed, cancelled] = await Promise.all([
      this.prisma.interview.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.interview.count({ where: { tenantId, deletedAt: null, status: 'SCHEDULED' } }),
      this.prisma.interview.count({ where: { tenantId, deletedAt: null, status: 'COMPLETED' } }),
      this.prisma.interview.count({ where: { tenantId, deletedAt: null, status: 'CANCELLED' } }),
    ]);
    return { total, scheduled, completed, cancelled };
  }
}
