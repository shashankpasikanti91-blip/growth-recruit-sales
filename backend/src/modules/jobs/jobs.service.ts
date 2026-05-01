import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JdParserService } from '../ai/services/jd-parser.service';
import { BusinessIdService } from '../billing/business-id.service';

/** Fields that must never be returned to RECRUITER-role users */
const COMMERCIAL_FIELDS: Array<'billingRate' | 'candidatePayRate'> = [
  'billingRate',
  'candidatePayRate',
];

function stripCommercial<T extends Record<string, unknown>>(obj: T): Omit<T, 'billingRate' | 'candidatePayRate'> {
  const copy = { ...obj };
  for (const field of COMMERCIAL_FIELDS) delete (copy as any)[field];
  return copy as Omit<T, 'billingRate' | 'candidatePayRate'>;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jdParser: JdParserService,
    private readonly businessIdService: BusinessIdService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, createdById: string, dto: CreateJobDto) {
    // If only description provided (raw JD text), auto-parse it via AI
    if (dto.description && !dto.requiredSkills?.length) {
      try {
        const parsed = await this.jdParser.parse(dto.description);
        dto.title = dto.title || parsed.title;
        dto.requiredSkills = parsed.requiredSkills || [];
        dto.experience = dto.experience ?? String(parsed.yearsExperienceMin ?? '');
        dto.department = dto.department || parsed.department;
      } catch {
        // fall through with original dto if AI fails
      }
    }

    const businessId = await this.businessIdService.generate('job');
    return this.prisma.job.create({
      data: {
        tenantId,
        businessId,
        title: dto.title,
        department: dto.department,
        location: dto.location,
        jobType: dto.jobType as any,
        description: dto.description,
        requirements: dto.requirements ?? [],
        skills: dto.requiredSkills ?? [],
        experience: dto.experience,
        salaryMin: dto.salaryMin ? parseFloat(dto.salaryMin) : undefined,
        salaryMax: dto.salaryMax ? parseFloat(dto.salaryMax) : undefined,
        currency: dto.salaryCurrency ?? 'USD',
        isActive: dto.isActive ?? true,
        countryCode: dto.countryCode,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: { search?: string; isActive?: boolean; assignedRecruiterId?: string; page?: number; limit?: number },
    userRole?: string,
  ) {
    const { search, isActive, assignedRecruiterId, page = 1, limit = 20 } = filters;
    const where: any = { tenantId };

    if (isActive !== undefined) where.isActive = isActive;
    if (assignedRecruiterId) where.assignedRecruiterId = assignedRecruiterId;

    if (search) {
      where.OR = [
        { businessId: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { applications: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    const rows = userRole === 'RECRUITER' ? data.map(stripCommercial) : data;
    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string, userRole?: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, tenantId },
      include: {
        applications: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                currentTitle: true,
                skills: true,
              },
            },
          },
          orderBy: { appliedAt: 'desc' },
          take: 50,
        },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    // Attach recruiter details if assigned
    let assignedRecruiter: any = null;
    if (job.assignedRecruiterId) {
      assignedRecruiter = await this.prisma.user.findFirst({
        where: { id: job.assignedRecruiterId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
    }

    const enriched = { ...job, assignedRecruiter };
    return userRole === 'RECRUITER' ? stripCommercial(enriched) : enriched;
  }

  async update(tenantId: string, id: string, dto: UpdateJobDto) {
    const existing = await this.findOne(tenantId, id);
    const { salaryMin, salaryMax, salaryCurrency, requiredSkills, requiredExperience, workMode, headcount, ...rest } = dto as any;
    // SECURITY: include tenantId in write where clause to prevent TOCTOU cross-tenant mutation
    const updated = await this.prisma.job.update({
      where: { id, tenantId },
      data: {
        ...rest,
        ...(requiredSkills !== undefined ? { skills: requiredSkills } : {}),
        ...(requiredExperience !== undefined ? { experience: String(requiredExperience) } : {}),
        ...(salaryCurrency !== undefined ? { currency: salaryCurrency } : {}),
        ...(salaryMin ? { salaryMin: parseFloat(salaryMin) } : {}),
        ...(salaryMax ? { salaryMax: parseFloat(salaryMax) } : {}),
      },
    });

    // Emit event when a recruiter is newly assigned
    const newRecruiterId = (rest as any).assignedRecruiterId ?? undefined;
    if (newRecruiterId && newRecruiterId !== (existing as any).assignedRecruiterId) {
      this.eventEmitter.emit('job.assigned', {
        tenantId,
        jobId: id,
        jobTitle: updated.title,
        recruiterId: newRecruiterId,
      });
    }
    return updated;
  }

  async close(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.job.update({ where: { id, tenantId }, data: { isActive: false } });
  }
}
