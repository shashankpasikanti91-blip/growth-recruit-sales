import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProposalDto, UpdateProposalDto } from './dto/proposal.dto';
import { ProposalStatus } from '@prisma/client';
import { BusinessIdService } from '../billing/business-id.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
  ) {}

  async create(tenantId: string, dto: CreateProposalDto) {
    const { documentUrl, ...rest } = dto as any;
    return this.prisma.proposal.create({
      data: {
        id:         uuidv4(),
        businessId: await this.businessIdService.generate('proposal'),
        tenantId,
        ...rest,
        fileUrl: documentUrl, // map DTO field to schema field
      },
      include: { client: true, lead: true },
    });
  }

  async findAll(
    tenantId: string,
    opts: { status?: ProposalStatus; clientId?: string; page?: number; limit?: number } = {},
  ) {
    const { status, clientId, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (status)   where.status   = status;
    if (clientId) where.clientId = clientId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.proposal.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { id: true, name: true } }, lead: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.proposal.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: { select: { id: true, name: true, status: true } },
        lead:   { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    return proposal;
  }

  async update(tenantId: string, id: string, dto: UpdateProposalDto) {
    await this.findOne(tenantId, id);
    const { documentUrl, ...rest } = dto as any;
    const extra: any = {};
    if (dto.status === ProposalStatus.ACCEPTED) extra.acceptedAt = new Date();
    if (dto.status === ProposalStatus.REJECTED)  extra.rejectedAt  = new Date();
    await this.prisma.proposal.updateMany({
      where: { id, tenantId },
      data: { ...rest, fileUrl: documentUrl, ...extra, updatedAt: new Date() },
    });
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.proposal.deleteMany({ where: { id, tenantId } });
    return { deleted: true };
  }

  async getStats(tenantId: string) {
    const groups = await this.prisma.proposal.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
      _sum:   { value: true },
    });
    return groups.map(g => ({
      status:     g.status,
      count:      g._count.status,
      totalValue: Number(g._sum.value ?? 0),
    }));
  }
}
