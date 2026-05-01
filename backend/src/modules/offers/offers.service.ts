import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessIdService } from '../billing/business-id.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
  ) {}

  async create(tenantId: string, createdById: string, dto: CreateOfferDto) {
    // Validate submission belongs to tenant
    const submission = await this.prisma.submission.findFirst({
      where: { id: dto.submissionId, tenantId, deletedAt: null },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    // Prevent duplicate active offer for same submission
    const existing = await this.prisma.offer.findFirst({
      where: {
        submissionId: dto.submissionId,
        tenantId,
        deletedAt: null,
        status: { notIn: ['DECLINED', 'WITHDRAWN', 'EXPIRED'] },
      },
    });
    if (existing) {
      throw new ConflictException('An active offer already exists for this submission');
    }

    const businessId = await this.businessIdService.generate('offer');
    return this.prisma.offer.create({
      data: {
        businessId,
        tenantId,
        submissionId: dto.submissionId,
        candidateId: dto.candidateId,
        jobId: dto.jobId,
        clientId: dto.clientId,
        offeredSalary: dto.offeredSalary,
        currency: dto.currency ?? 'USD',
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        notes: dto.notes,
        createdById,
      },
      include: {
        submission: {
          select: {
            id: true, businessId: true, stage: true,
            candidate: { select: { id: true, firstName: true, lastName: true } },
            job: { select: { id: true, title: true } },
          },
        },
      },
    });
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
      this.prisma.offer.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
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
      this.prisma.offer.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const offer = await this.prisma.offer.findFirst({
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
    if (!offer) throw new NotFoundException(`Offer ${id} not found`);
    return offer;
  }

  async update(tenantId: string, id: string, dto: UpdateOfferDto) {
    await this.findOne(tenantId, id);
    return this.prisma.offer.update({
      where: { id },
      data: {
        ...dto,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.offer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(tenantId: string) {
    const statuses = ['PENDING', 'EXTENDED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'];
    const results = await this.prisma.offer.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
    });

    return statuses.map((status) => ({
      status,
      count: results.find((r) => r.status === status)?._count._all ?? 0,
    }));
  }
}
