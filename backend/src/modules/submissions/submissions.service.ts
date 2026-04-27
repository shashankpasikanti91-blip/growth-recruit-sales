import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubmissionDto, UpdateSubmissionDto } from './dto/submission.dto';
import { SubmissionStage } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private businessId(tenantId: string): string {
    return `SUB-${tenantId.slice(0, 6).toUpperCase()}-${Date.now()}`;
  }

  async create(tenantId: string, dto: CreateSubmissionDto) {
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

    return this.prisma.submission.create({
      data: {
        id:         uuidv4(),
        businessId: this.businessId(tenantId),
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
