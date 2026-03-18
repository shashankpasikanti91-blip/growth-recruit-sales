import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadScoringService } from '../ai/services/lead-scoring.service';
import { CreateLeadDto, UpdateLeadDto, UpdateLeadStageDto } from './dto/lead.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadScoring: LeadScoringService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateLeadDto) {
    if (dto.email) {
      const existing = await this.prisma.lead.findFirst({
        where: { tenantId, email: dto.email },
      });
      if (existing) throw new ConflictException('Lead with this email already exists');
    }

    return this.prisma.lead.create({
      data: {
        tenantId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        title: dto.title,
        companyId: dto.companyId,
        companyName: dto.companyName,
        linkedinUrl: dto.linkedinUrl,
        source: dto.source ?? 'manual',
        stage: 'NEW',
        countryCode: dto.countryCode,
        industry: dto.industry,
        tags: dto.tags ?? [],
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: {
      search?: string;
      stage?: string;
      countryCode?: string;
      source?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { search, stage, countryCode, source, page = 1, limit = 20 } = filters;
    const where: any = { tenantId };

    if (stage) where.stage = stage;
    if (countryCode) where.countryCode = countryCode;
    if (source) where.source = source;

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true, industry: true, size: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        company: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        outreachMessages: { orderBy: { createdAt: 'desc' }, take: 10 },
        aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 5 },
        contacts: { select: { id: true, firstName: true, lastName: true, email: true, title: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
    await this.findOne(tenantId, id);
    return this.prisma.lead.update({ where: { id }, data: dto as any });
  }

  async updateStage(tenantId: string, id: string, dto: UpdateLeadStageDto) {
    const lead = await this.findOne(tenantId, id);
    const updated = await this.prisma.lead.update({ where: { id }, data: { stage: dto.stage as any } });

    if (dto.note) {
      await this.prisma.activity.create({
        data: {
          tenantId,
          leadId: id,
          activityType: 'NOTE',
          description: dto.note,
        },
      });
    }

    this.eventEmitter.emit('lead.stage_changed', {
      tenantId,
      leadId: id,
      oldStage: lead.stage,
      newStage: dto.stage,
    });

    return updated;
  }

  async scoreLead(tenantId: string, id: string) {
    const lead = await this.findOne(tenantId, id);

    // Load tenant ICP if exists
    const icp = await this.prisma.icpProfile.findFirst({ where: { tenantId, isActive: true } });
    if (!icp) return { error: 'No active ICP profile found for tenant' };

    const result = await this.leadScoring.score(
      {
        fullName: lead.fullName,
        title: lead.title ?? '',
        company: lead.company as any,
        industry: lead.industry ?? '',
        countryCode: lead.countryCode ?? '',
        email: lead.email ?? '',
        linkedinUrl: lead.linkedinUrl ?? '',
      },
      icp as any,
    );

    // Update lead's AI score
    await this.prisma.lead.update({
      where: { id },
      data: { aiScore: result.score, enrichmentData: { icpScore: result } },
    });

    return result;
  }

  async addNote(tenantId: string, id: string, note: string) {
    await this.findOne(tenantId, id);
    return this.prisma.activity.create({
      data: { tenantId, leadId: id, activityType: 'NOTE', description: note },
    });
  }
}
