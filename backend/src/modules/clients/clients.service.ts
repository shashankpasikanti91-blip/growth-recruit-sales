import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto, ConvertToClientDto } from './dto/client.dto';
import { ClientStatus } from '@prisma/client';
import { BusinessIdService } from '../billing/business-id.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        id:         uuidv4(),
        businessId: await this.businessIdService.generate('client'),
        tenantId,
        ...dto,
        requiredDocuments: dto.requiredDocuments ?? [],
      },
    });
  }

  // ── List with pagination + filters ───────────────────────────────────────────
  async findAll(
    tenantId: string,
    opts: {
      search?: string;
      status?: string;
      industry?: string;
      countryCode?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { search, status, industry, countryCode, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
      ...(status && { status: status as ClientStatus }),
      ...(industry && { industry }),
      ...(countryCode && { countryCode }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { industry: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { jobs: true, submissions: true, opportunities: true } },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── Find one ──────────────────────────────────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        jobs: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true, businessId: true, title: true, location: true,
            priority: true, openings: true, isActive: true, assignedRecruiterId: true,
            targetSubmissionDate: true, createdAt: true,
            _count: { select: { applications: true, submissions: true } },
          },
        },
        submissions: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true, currentTitle: true } },
            job: { select: { id: true, title: true } },
          },
        },
        opportunities: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          where: { status: 'PENDING' },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        _count: { select: { jobs: true, submissions: true, opportunities: true, followUps: true } },
      },
    });

    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(tenantId, id); // throws if not found
    return this.prisma.client.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
    });
  }

  // ── Soft delete ───────────────────────────────────────────────────────────────
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Convert Lead/Company → Client ─────────────────────────────────────────────
  async convertToClient(tenantId: string, dto: ConvertToClientDto) {
    if (!dto.leadId && !dto.companyId) {
      throw new BadRequestException('Provide either leadId or companyId to convert');
    }

    let name = '';
    let industry: string | undefined;
    let website: string | undefined;
    let countryCode: string | undefined;

    // Pull data from lead
    if (dto.leadId) {
      const lead = await this.prisma.lead.findFirst({
        where: { id: dto.leadId, tenantId },
        include: { company: true },
      });
      if (!lead) throw new NotFoundException(`Lead ${dto.leadId} not found`);
      if (lead.convertedToClientId) {
        // Return the existing client instead of erroring
        return this.findOne(tenantId, lead.convertedToClientId);
      }
      name = lead.companyName ?? `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() ?? 'New Client';
      industry = lead.industry ?? undefined;
      countryCode = lead.countryCode ?? undefined;
      if (lead.company) {
        website = lead.company.website ?? undefined;
      }
    }

    // Pull data from company
    if (dto.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, tenantId },
      });
      if (!company) throw new NotFoundException(`Company ${dto.companyId} not found`);
      name = company.name;
      industry = company.industry ?? undefined;
      website = company.website ?? undefined;
      countryCode = company.countryCode ?? undefined;
    }

    const clientId = uuidv4();
    const businessId = await this.businessIdService.generate('client');
    const now = new Date();

    // Create client + backlink lead/company in a transaction
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          id: clientId,
          businessId,
          tenantId,
          name,
          industry,
          website,
          countryCode,
          status: ClientStatus.ACTIVE,
          salesOwnerId: dto.salesOwnerId,
          paymentTerms: dto.paymentTerms,
          notes: dto.notes,
          sourceLeadId: dto.leadId,
          sourceCompanyId: dto.companyId,
          requiredDocuments: [],
        },
      });

      if (dto.leadId) {
        await tx.lead.update({
          where: { id: dto.leadId },
          data: { convertedToClientId: clientId, convertedAt: now, stage: 'CLOSED_WON' },
        });
      }

      if (dto.companyId) {
        await tx.company.update({
          where: { id: dto.companyId },
          data: { isClient: true, clientId },
        });
      }

      return client;
    });
  }

  // ── Stats for dashboard ───────────────────────────────────────────────────────
  async getStats(tenantId: string) {
    const [total, active, newThis30Days, pending] = await Promise.all([
      this.prisma.client.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.client.count({ where: { tenantId, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.client.count({
        where: {
          tenantId,
          deletedAt: null,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.client.count({ where: { tenantId, deletedAt: null, status: 'PROSPECT' } }),
    ]);
    return { total, active, newThis30Days, pending };
  }
}
