import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessIdService } from '../billing/business-id.service';
import { UsageService } from '../billing/usage.service';
import { DuplicateDetectionService } from '../search/duplicate-detection.service';
import { StorageService } from '../documents/storage.service';
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
    private readonly storageService: StorageService,
  ) {}

  async create(tenantId: string, dto: CreateCandidateDto, allowDuplicate = false) {
    // Normalize inputs for duplicate checking
    const normalizedEmail = dto.email?.trim().toLowerCase() || undefined;
    const normalizedPhone = dto.phone?.replace(/[\s\-\(\)\.]/g, '') || undefined;

    // Check for duplicates BEFORE creating
    const dupeCheck = await this.duplicateDetection.checkCandidate(tenantId, {
      email: normalizedEmail,
      phone: normalizedPhone,
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      currentCompany: dto.currentCompany?.trim(),
    });

    // Block duplicate creation unless explicitly allowed by admin
    if (dupeCheck.isDuplicate && !allowDuplicate) {
      const exactMatches = dupeCheck.matches.filter(m => m.confidence === 'exact');
      const bestMatch = exactMatches[0] || dupeCheck.matches[0];
      throw new ConflictException({
        statusCode: 409,
        error: 'Duplicate candidate detected',
        message: `A candidate with the same ${bestMatch.matchField} already exists (${bestMatch.matchValue}).`,
        duplicateOf: {
          id: bestMatch.id,
          businessId: bestMatch.businessId,
          matchField: bestMatch.matchField,
          matchValue: bestMatch.matchValue,
          confidence: bestMatch.confidence,
        },
        allMatches: dupeCheck.matches,
      });
    }

    // Enforce candidate usage limit
    await this.usageService.enforceAndIncrement(tenantId, 'candidate');

    const businessId = await this.businessIdService.generate('candidate');
    const { visaExpiry, source, resumeText, ...rest } = dto;

    const candidate = await this.prisma.candidate.create({
      data: {
        tenantId,
        businessId,
        ...rest,
        email: normalizedEmail,
        sourceName: source || 'MANUAL',
        visaExpiry: visaExpiry ? new Date(visaExpiry) : undefined,
        isDuplicate: false,
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

    return candidate;
  }

  async findAll(tenantId: string, filters: { search?: string; skills?: string; stage?: string; visaStatus?: string; sourceName?: string; page?: number; limit?: number }) {
    const { search, skills, stage, visaStatus, sourceName, page = 1, limit = 25 } = filters;

    const where: any = { tenantId, isActive: true, isDuplicate: false };
    if (stage) { where.stage = stage; }
    if (visaStatus) { where.visaStatus = visaStatus; }
    if (sourceName) { where.sourceName = sourceName; }
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
        orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          _count: { select: { applications: true, resumes: true } },
          scorecards: { orderBy: { createdAt: 'desc' }, take: 1, select: { score: true, explanation: true } },
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
        resumes: { orderBy: { createdAt: 'desc' }, take: 1 },
        applications: {
          include: {
            job: { select: { id: true, title: true, department: true, location: true, jobType: true, businessId: true } },
          },
          orderBy: { appliedAt: 'desc' },
        },
        scorecards: { orderBy: { createdAt: 'desc' }, take: 10 },
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

  async uploadResume(tenantId: string, candidateId: string, file: Express.Multer.File) {
    // Validate candidate belongs to tenant
    await this.findOne(tenantId, candidateId);

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, Word documents, and text files are supported');
    }
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum 10 MB allowed');
    }

    // Duplicate detection by hash within this candidate
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const existing = await this.prisma.resume.findFirst({
      where: { candidateId, parsedData: { path: ['hash'], equals: hash } },
    });
    if (existing) {
      return { duplicate: true, resume: existing };
    }

    // Extract raw text for AI screening
    let rawText: string | undefined;
    try {
      if (file.mimetype === 'application/pdf') {
        const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
        const parsed = await pdfParse(file.buffer);
        rawText = parsed.text;
      } else if (file.mimetype === 'text/plain') {
        rawText = file.buffer.toString('utf-8');
      }
    } catch { /* ignore parse errors */ }

    // Upload to object storage
    const businessId = await this.businessIdService.generate('resume');
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${tenantId}/candidates/${candidateId}/resumes/${businessId}/${safeFilename}`;
    await this.storageService.upload(storageKey, file.buffer, file.mimetype);

    // Mark previous primary resumes as not primary
    await this.prisma.resume.updateMany({
      where: { candidateId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Create Resume record
    const resume = await this.prisma.resume.create({
      data: {
        businessId,
        candidateId,
        fileName: file.originalname,
        fileUrl: storageKey,
        fileSize: file.size,
        mimeType: file.mimetype,
        rawText: rawText ?? null,
        isPrimary: true,
        parsedData: { hash } as any,
      },
    });

    return { duplicate: false, resume };
  }

  async getResumeDownloadUrl(tenantId: string, candidateId: string, resumeId: string) {
    // Validate candidate belongs to tenant
    await this.findOne(tenantId, candidateId);

    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, candidateId },
    });
    if (!resume) throw new NotFoundException('Resume not found');

    const url = await this.storageService.getSignedDownloadUrl(resume.fileUrl);
    return { url, fileName: resume.fileName, mimeType: resume.mimeType };
  }

  async listResumes(tenantId: string, candidateId: string) {
    await this.findOne(tenantId, candidateId);
    return this.prisma.resume.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessId: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        isPrimary: true,
        createdAt: true,
        rawText: false, // exclude large text from listing
        parsedData: false,
        fileUrl: false, // don't expose storage key directly
      },
    });
  }
}
