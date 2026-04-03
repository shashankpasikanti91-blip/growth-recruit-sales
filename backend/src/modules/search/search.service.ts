import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SearchResult {
  entityType: string;
  id: string;
  businessId: string;
  title: string;
  subtitle: string;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(
    tenantId: string,
    query: string,
    options: { entityTypes?: string[]; limit?: number; offset?: number } = {},
  ): Promise<SearchResponse> {
    const { limit = 20, offset = 0, entityTypes } = options;
    const trimmed = query.trim();
    if (!trimmed) return { results: [], total: 0, query };

    // Check if it's a business ID search (exact match)
    const isBusinessId = /^(TEN|USR|CAN|RES|JOB|APP|LED|COM|CNT|ACT|WFR|OUT)-\d{4,6}-\d{4,6}$/i.test(trimmed);

    const results: SearchResult[] = [];
    const types = entityTypes ?? ['candidate', 'lead', 'company', 'contact', 'job', 'application'];

    const promises: Promise<void>[] = [];

    if (types.includes('candidate')) {
      promises.push(this.searchCandidates(tenantId, trimmed, isBusinessId, limit).then(r => { results.push(...r); }));
    }
    if (types.includes('lead')) {
      promises.push(this.searchLeads(tenantId, trimmed, isBusinessId, limit).then(r => { results.push(...r); }));
    }
    if (types.includes('company')) {
      promises.push(this.searchCompanies(tenantId, trimmed, isBusinessId, limit).then(r => { results.push(...r); }));
    }
    if (types.includes('contact')) {
      promises.push(this.searchContacts(tenantId, trimmed, isBusinessId, limit).then(r => { results.push(...r); }));
    }
    if (types.includes('job')) {
      promises.push(this.searchJobs(tenantId, trimmed, isBusinessId, limit).then(r => { results.push(...r); }));
    }
    if (types.includes('application')) {
      promises.push(this.searchApplications(tenantId, trimmed, isBusinessId, limit).then(r => { results.push(...r); }));
    }

    await Promise.all(promises);

    // Sort: exact business ID matches first, then by relevance
    results.sort((a, b) => {
      const aExact = a.businessId.toUpperCase() === trimmed.toUpperCase() ? 0 : 1;
      const bExact = b.businessId.toUpperCase() === trimmed.toUpperCase() ? 0 : 1;
      return aExact - bExact;
    });

    return {
      results: results.slice(offset, offset + limit),
      total: results.length,
      query: trimmed,
    };
  }

  private async searchCandidates(tenantId: string, query: string, isBusinessId: boolean, limit: number): Promise<SearchResult[]> {
    const where: any = { tenantId, isActive: true };
    if (isBusinessId) {
      where.businessId = { equals: query, mode: 'insensitive' };
    } else {
      where.OR = [
        { businessId: { equals: query, mode: 'insensitive' } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { currentTitle: { contains: query, mode: 'insensitive' } },
        { currentCompany: { contains: query, mode: 'insensitive' } },
        { skills: { hasSome: [query] } },
      ];
    }

    const candidates = await this.prisma.candidate.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, businessId: true, firstName: true, lastName: true, email: true, currentTitle: true, currentCompany: true },
    });

    return candidates.map(c => ({
      entityType: 'candidate',
      id: c.id,
      businessId: c.businessId,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: [c.currentTitle, c.currentCompany, c.email].filter(Boolean).join(' · '),
    }));
  }

  private async searchLeads(tenantId: string, query: string, isBusinessId: boolean, limit: number): Promise<SearchResult[]> {
    const where: any = { tenantId };
    if (isBusinessId) {
      where.businessId = { equals: query, mode: 'insensitive' };
    } else {
      where.OR = [
        { businessId: { equals: query, mode: 'insensitive' } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
      ];
    }

    const leads = await this.prisma.lead.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, businessId: true, firstName: true, lastName: true, email: true, title: true, stage: true },
    });

    return leads.map(l => ({
      entityType: 'lead',
      id: l.id,
      businessId: l.businessId,
      title: `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || l.email || 'Unknown',
      subtitle: [l.title, l.stage, l.email].filter(Boolean).join(' · '),
    }));
  }

  private async searchCompanies(tenantId: string, query: string, isBusinessId: boolean, limit: number): Promise<SearchResult[]> {
    const where: any = { tenantId };
    if (isBusinessId) {
      where.businessId = { equals: query, mode: 'insensitive' };
    } else {
      where.OR = [
        { businessId: { equals: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { website: { contains: query, mode: 'insensitive' } },
        { domain: { contains: query, mode: 'insensitive' } },
        { industry: { contains: query, mode: 'insensitive' } },
      ];
    }

    const companies = await this.prisma.company.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, businessId: true, name: true, industry: true, website: true, size: true },
    });

    return companies.map(c => ({
      entityType: 'company',
      id: c.id,
      businessId: c.businessId,
      title: c.name,
      subtitle: [c.industry, c.size, c.website].filter(Boolean).join(' · '),
    }));
  }

  private async searchContacts(tenantId: string, query: string, isBusinessId: boolean, limit: number): Promise<SearchResult[]> {
    const where: any = { tenantId };
    if (isBusinessId) {
      where.businessId = { equals: query, mode: 'insensitive' };
    } else {
      where.OR = [
        { businessId: { equals: query, mode: 'insensitive' } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
      ];
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, businessId: true, firstName: true, lastName: true, email: true, title: true },
    });

    return contacts.map(c => ({
      entityType: 'contact',
      id: c.id,
      businessId: c.businessId,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: [c.title, c.email].filter(Boolean).join(' · '),
    }));
  }

  private async searchJobs(tenantId: string, query: string, isBusinessId: boolean, limit: number): Promise<SearchResult[]> {
    const where: any = { tenantId, isActive: true };
    if (isBusinessId) {
      where.businessId = { equals: query, mode: 'insensitive' };
    } else {
      where.OR = [
        { businessId: { equals: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { department: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { skills: { hasSome: [query] } },
      ];
    }

    const jobs = await this.prisma.job.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, businessId: true, title: true, department: true, location: true },
    });

    return jobs.map(j => ({
      entityType: 'job',
      id: j.id,
      businessId: j.businessId,
      title: j.title,
      subtitle: [j.department, j.location].filter(Boolean).join(' · '),
    }));
  }

  private async searchApplications(tenantId: string, query: string, isBusinessId: boolean, limit: number): Promise<SearchResult[]> {
    const where: any = { tenantId };
    if (isBusinessId) {
      where.businessId = { equals: query, mode: 'insensitive' };
    } else {
      where.OR = [
        { businessId: { equals: query, mode: 'insensitive' } },
        { candidate: { firstName: { contains: query, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: query, mode: 'insensitive' } } },
        { job: { title: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const applications = await this.prisma.application.findMany({
      where,
      take: limit,
      orderBy: { appliedAt: 'desc' },
      select: {
        id: true,
        businessId: true,
        stage: true,
        candidate: { select: { firstName: true, lastName: true } },
        job: { select: { title: true } },
      },
    });

    return applications.map(a => ({
      entityType: 'application',
      id: a.id,
      businessId: a.businessId,
      title: `${a.candidate.firstName} ${a.candidate.lastName} → ${a.job.title}`,
      subtitle: `Stage: ${a.stage}`,
    }));
  }
}
