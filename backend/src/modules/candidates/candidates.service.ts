import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessIdService } from '../billing/business-id.service';
import { UsageService } from '../billing/usage.service';
import { DuplicateDetectionService } from '../search/duplicate-detection.service';
import { IsString, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() currentTitle?: string;
  @IsOptional() @IsString() currentCompany?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() linkedinUrl?: string;
  @IsOptional() @IsNumber() yearsExperience?: number;
  @IsOptional() @IsArray() skills?: string[];
  @IsOptional() @IsArray() languages?: string[];
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() visaType?: string;
  @IsOptional() @IsString() visaExpiry?: string;
  @IsOptional() @IsString() visaStatus?: string;
  @IsOptional() @IsBoolean() isForeigner?: boolean;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() resumeText?: string;
}

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
    private readonly usageService: UsageService,
    private readonly duplicateDetection: DuplicateDetectionService,
  ) {}

  async create(tenantId: string, dto: CreateCandidateDto) {
    // Enforce candidate usage limit
    await this.usageService.enforceAndIncrement(tenantId, 'candidate');

    const businessId = await this.businessIdService.generate('candidate');
    const { visaExpiry, source, resumeText, ...rest } = dto;

    // Check for duplicates
    const dupeCheck = await this.duplicateDetection.checkCandidate(tenantId, {
      email: dto.email, phone: dto.phone, firstName: dto.firstName, lastName: dto.lastName, currentCompany: dto.currentCompany,
    });

    const candidate = await this.prisma.candidate.create({
      data: {
        tenantId,
        businessId,
        ...rest,
        sourceName: source || 'MANUAL',
        visaExpiry: visaExpiry ? new Date(visaExpiry) : undefined,
        isDuplicate: dupeCheck.isDuplicate,
        duplicateOfId: dupeCheck.matches[0]?.id,
      },
    });

    // If resume text was provided (from AI parser), store it as a Resume record
    if (resumeText) {
      const resumeBusinessId = await this.businessIdService.generate('resume');
      await this.prisma.resume.create({
        data: {
          businessId: resumeBusinessId,
          candidateId: candidate.id,
          fileName: 'parsed-resume.txt',
          fileUrl: '',
          rawText: resumeText,
          isPrimary: true,
        },
      });
    }

    return { ...candidate, duplicateWarning: dupeCheck.isDuplicate ? dupeCheck.matches : undefined };
  }

  async findAll(tenantId: string, filters: { search?: string; skills?: string; stage?: string; page?: number; limit?: number }) {
    const { search, skills, page = 1, limit = 20 } = filters;

    const where: any = { tenantId, isActive: true, isDuplicate: false };
    if (search) {
      where.OR = [
        { businessId: { equals: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { currentTitle: { contains: search, mode: 'insensitive' } },
        { currentCompany: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (skills) {
      where.skills = { hasSome: skills.split(',').map(s => s.trim()) };
    }

    const [data, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { applications: true, resumes: true } },
          scorecards: { orderBy: { createdAt: 'desc' }, take: 1, select: { score: true } },
        },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findOne(tenantId: string, id: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id, tenantId },
      include: {
        resumes: true,
        applications: { include: { job: { select: { id: true, title: true } } } },
        scorecards: { orderBy: { createdAt: 'desc' }, take: 5 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        outreachMessages: { orderBy: { createdAt: 'desc' }, take: 10 },
        aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCandidateDto>) {
    await this.findOne(tenantId, id);
    // SECURITY: include tenantId in write where clause to prevent TOCTOU cross-tenant mutation
    return this.prisma.candidate.update({ where: { id, tenantId }, data: dto });
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.candidate.update({ where: { id, tenantId }, data: { isActive: false } });
  }

  async addNote(tenantId: string, candidateId: string, userId: string, note: string) {
    await this.findOne(tenantId, candidateId);
    const businessId = await this.businessIdService.generate('activity');
    return this.prisma.activity.create({
      data: { tenantId, businessId, userId, candidateId, type: 'NOTE', title: 'Recruiter Note', description: note },
    });
  }
}
