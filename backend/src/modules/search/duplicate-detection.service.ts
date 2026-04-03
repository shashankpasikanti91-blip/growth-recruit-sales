import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: Array<{
    id: string;
    businessId: string;
    matchField: string;
    matchValue: string;
    confidence: 'exact' | 'high' | 'medium';
  }>;
}

@Injectable()
export class DuplicateDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check for duplicate candidates by email, phone, or name+company similarity.
   */
  async checkCandidate(
    tenantId: string,
    data: { email?: string; phone?: string; firstName?: string; lastName?: string; currentCompany?: string },
    excludeId?: string,
  ): Promise<DuplicateCheckResult> {
    const matches: DuplicateCheckResult['matches'] = [];
    const exclude = excludeId ? { id: { not: excludeId } } : {};

    // Exact email match
    if (data.email) {
      const emailMatch = await this.prisma.candidate.findFirst({
        where: { tenantId, email: { equals: data.email, mode: 'insensitive' }, isActive: true, ...exclude },
        select: { id: true, businessId: true, email: true },
      });
      if (emailMatch) {
        matches.push({ id: emailMatch.id, businessId: emailMatch.businessId, matchField: 'email', matchValue: emailMatch.email!, confidence: 'exact' });
      }
    }

    // Exact phone match
    if (data.phone) {
      const normalizedPhone = data.phone.replace(/[\s\-\(\)\.]/g, '');
      const phoneMatch = await this.prisma.candidate.findFirst({
        where: { tenantId, isActive: true, ...exclude, phone: { contains: normalizedPhone.slice(-8) } },
        select: { id: true, businessId: true, phone: true },
      });
      if (phoneMatch && !matches.some(m => m.id === phoneMatch.id)) {
        matches.push({ id: phoneMatch.id, businessId: phoneMatch.businessId, matchField: 'phone', matchValue: phoneMatch.phone!, confidence: 'exact' });
      }
    }

    // Name + company similarity
    if (data.firstName && data.lastName) {
      const nameMatches = await this.prisma.candidate.findMany({
        where: {
          tenantId,
          isActive: true,
          ...exclude,
          firstName: { equals: data.firstName, mode: 'insensitive' },
          lastName: { equals: data.lastName, mode: 'insensitive' },
        },
        select: { id: true, businessId: true, firstName: true, lastName: true, currentCompany: true },
        take: 5,
      });

      for (const nm of nameMatches) {
        if (matches.some(m => m.id === nm.id)) continue;
        const confidence = data.currentCompany && nm.currentCompany &&
          data.currentCompany.toLowerCase() === nm.currentCompany.toLowerCase()
          ? 'high' as const : 'medium' as const;
        matches.push({
          id: nm.id,
          businessId: nm.businessId,
          matchField: 'name',
          matchValue: `${nm.firstName} ${nm.lastName}` + (nm.currentCompany ? ` @ ${nm.currentCompany}` : ''),
          confidence,
        });
      }
    }

    return { isDuplicate: matches.length > 0, matches };
  }

  /**
   * Check for duplicate leads by email, phone, LinkedIn, or company+name.
   */
  async checkLead(
    tenantId: string,
    data: { email?: string; phone?: string; linkedinUrl?: string; firstName?: string; lastName?: string; companyId?: string },
    excludeId?: string,
  ): Promise<DuplicateCheckResult> {
    const matches: DuplicateCheckResult['matches'] = [];
    const exclude = excludeId ? { id: { not: excludeId } } : {};

    if (data.email) {
      const emailMatch = await this.prisma.lead.findFirst({
        where: { tenantId, email: { equals: data.email, mode: 'insensitive' }, ...exclude },
        select: { id: true, businessId: true, email: true },
      });
      if (emailMatch) {
        matches.push({ id: emailMatch.id, businessId: emailMatch.businessId, matchField: 'email', matchValue: emailMatch.email!, confidence: 'exact' });
      }
    }

    if (data.phone) {
      const normalizedPhone = data.phone.replace(/[\s\-\(\)\.]/g, '');
      const phoneMatch = await this.prisma.lead.findFirst({
        where: { tenantId, ...exclude, phone: { contains: normalizedPhone.slice(-8) } },
        select: { id: true, businessId: true, phone: true },
      });
      if (phoneMatch && !matches.some(m => m.id === phoneMatch.id)) {
        matches.push({ id: phoneMatch.id, businessId: phoneMatch.businessId, matchField: 'phone', matchValue: phoneMatch.phone!, confidence: 'exact' });
      }
    }

    if (data.linkedinUrl) {
      const linkedinMatch = await this.prisma.lead.findFirst({
        where: { tenantId, linkedinUrl: { equals: data.linkedinUrl, mode: 'insensitive' }, ...exclude },
        select: { id: true, businessId: true, linkedinUrl: true },
      });
      if (linkedinMatch && !matches.some(m => m.id === linkedinMatch.id)) {
        matches.push({ id: linkedinMatch.id, businessId: linkedinMatch.businessId, matchField: 'linkedin', matchValue: linkedinMatch.linkedinUrl!, confidence: 'exact' });
      }
    }

    if (data.firstName && data.lastName && data.companyId) {
      const nameMatch = await this.prisma.lead.findFirst({
        where: {
          tenantId, ...exclude,
          firstName: { equals: data.firstName, mode: 'insensitive' },
          lastName: { equals: data.lastName, mode: 'insensitive' },
          companyId: data.companyId,
        },
        select: { id: true, businessId: true, firstName: true, lastName: true },
      });
      if (nameMatch && !matches.some(m => m.id === nameMatch.id)) {
        matches.push({ id: nameMatch.id, businessId: nameMatch.businessId, matchField: 'name+company', matchValue: `${nameMatch.firstName} ${nameMatch.lastName}`, confidence: 'high' });
      }
    }

    return { isDuplicate: matches.length > 0, matches };
  }

  /**
   * Check for duplicate companies by name, domain, or registration number.
   */
  async checkCompany(
    tenantId: string,
    data: { name?: string; domain?: string; registrationNumber?: string },
    excludeId?: string,
  ): Promise<DuplicateCheckResult> {
    const matches: DuplicateCheckResult['matches'] = [];
    const exclude = excludeId ? { id: { not: excludeId } } : {};

    if (data.domain) {
      const domainMatch = await this.prisma.company.findFirst({
        where: { tenantId, domain: { equals: data.domain, mode: 'insensitive' }, ...exclude },
        select: { id: true, businessId: true, domain: true },
      });
      if (domainMatch) {
        matches.push({ id: domainMatch.id, businessId: domainMatch.businessId, matchField: 'domain', matchValue: domainMatch.domain!, confidence: 'exact' });
      }
    }

    if (data.registrationNumber) {
      const regMatch = await this.prisma.company.findFirst({
        where: { tenantId, registrationNumber: { equals: data.registrationNumber, mode: 'insensitive' }, ...exclude },
        select: { id: true, businessId: true, registrationNumber: true },
      });
      if (regMatch && !matches.some(m => m.id === regMatch.id)) {
        matches.push({ id: regMatch.id, businessId: regMatch.businessId, matchField: 'registrationNumber', matchValue: regMatch.registrationNumber!, confidence: 'exact' });
      }
    }

    if (data.name) {
      const normalized = data.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameMatches = await this.prisma.company.findMany({
        where: { tenantId, ...exclude, name: { contains: data.name, mode: 'insensitive' } },
        select: { id: true, businessId: true, name: true },
        take: 5,
      });
      for (const nm of nameMatches) {
        if (matches.some(m => m.id === nm.id)) continue;
        const nmNormalized = nm.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const confidence = nmNormalized === normalized ? 'exact' as const : 'medium' as const;
        matches.push({ id: nm.id, businessId: nm.businessId, matchField: 'name', matchValue: nm.name, confidence });
      }
    }

    return { isDuplicate: matches.length > 0, matches };
  }

  /**
   * Check for duplicate contacts by email, phone, or company+name.
   */
  async checkContact(
    tenantId: string,
    data: { email?: string; phone?: string; firstName?: string; lastName?: string; companyId?: string },
    excludeId?: string,
  ): Promise<DuplicateCheckResult> {
    const matches: DuplicateCheckResult['matches'] = [];
    const exclude = excludeId ? { id: { not: excludeId } } : {};

    if (data.email) {
      const emailMatch = await this.prisma.contact.findFirst({
        where: { tenantId, email: { equals: data.email, mode: 'insensitive' }, ...exclude },
        select: { id: true, businessId: true, email: true },
      });
      if (emailMatch) {
        matches.push({ id: emailMatch.id, businessId: emailMatch.businessId, matchField: 'email', matchValue: emailMatch.email!, confidence: 'exact' });
      }
    }

    if (data.phone) {
      const normalizedPhone = data.phone.replace(/[\s\-\(\)\.]/g, '');
      const phoneMatch = await this.prisma.contact.findFirst({
        where: { tenantId, ...exclude, phone: { contains: normalizedPhone.slice(-8) } },
        select: { id: true, businessId: true, phone: true },
      });
      if (phoneMatch && !matches.some(m => m.id === phoneMatch.id)) {
        matches.push({ id: phoneMatch.id, businessId: phoneMatch.businessId, matchField: 'phone', matchValue: phoneMatch.phone!, confidence: 'exact' });
      }
    }

    if (data.firstName && data.lastName && data.companyId) {
      const nameMatch = await this.prisma.contact.findFirst({
        where: {
          tenantId, ...exclude,
          firstName: { equals: data.firstName, mode: 'insensitive' },
          lastName: { equals: data.lastName, mode: 'insensitive' },
          companyId: data.companyId,
        },
        select: { id: true, businessId: true, firstName: true, lastName: true },
      });
      if (nameMatch && !matches.some(m => m.id === nameMatch.id)) {
        matches.push({ id: nameMatch.id, businessId: nameMatch.businessId, matchField: 'name+company', matchValue: `${nameMatch.firstName} ${nameMatch.lastName}`, confidence: 'high' });
      }
    }

    return { isDuplicate: matches.length > 0, matches };
  }
}
