import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOpportunityDto, UpdateOpportunityDto } from './dto/opportunity.dto';
import { OpportunityStage } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private businessId(tenantId: string): string {
    return `OPP-${tenantId.slice(0, 6).toUpperCase()}-${Date.now()}`;
  }

  async create(tenantId: string, dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: {
        id: uuidv4(),
        businessId: this.businessId(tenantId),
        tenantId,
        ...dto,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      },
    });
  }

  async findAll(tenantId: string, opts: {
    clientId?: string; leadId?: string; stage?: string;
    ownerId?: string; page?: number; limit?: number;
  } = {}) {
    const { clientId, leadId, stage, ownerId, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
      ...(clientId && { clientId }),
      ...(leadId && { leadId }),
      ...(ownerId && { ownerId }),
      ...(stage && { stage: stage as OpportunityStage }),
    };

    const [items, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where, skip, take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, status: true } },
          lead: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        client: true,
        lead: { select: { id: true, firstName: true, lastName: true, companyName: true, stage: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!opp) throw new NotFoundException(`Opportunity ${id} not found`);
    return opp;
  }

  async update(tenantId: string, id: string, dto: UpdateOpportunityDto) {
    await this.findOne(tenantId, id);
    const closedAt = (dto.stage === 'CLOSED_WON' || dto.stage === 'CLOSED_LOST')
      ? new Date() : undefined;
    return this.prisma.opportunity.update({
      where: { id },
      data: {
        ...dto,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
        closedAt,
        updatedAt: new Date(),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.opportunity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getPipeline(tenantId: string) {
    const stages = Object.values(OpportunityStage);
    const results = await this.prisma.opportunity.groupBy({
      by: ['stage'],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
      _sum: { value: true },
    });

    return stages.map((stage) => {
      const found = results.find((r) => r.stage === stage);
      return {
        stage,
        count: found?._count._all ?? 0,
        totalValue: found?._sum.value ?? 0,
      };
    });
  }
}
