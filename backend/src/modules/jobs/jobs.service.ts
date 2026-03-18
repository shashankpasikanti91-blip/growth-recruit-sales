import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JdParserService } from '../ai/services/jd-parser.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jdParser: JdParserService,
  ) {}

  async create(tenantId: string, createdById: string, dto: CreateJobDto) {
    // If only description provided (raw JD text), auto-parse it via AI
    if (dto.description && !dto.requiredSkills?.length) {
      try {
        const parsed = await this.jdParser.parse(dto.description);
        dto.title = dto.title || parsed.title;
        dto.requiredSkills = parsed.requiredSkills || [];
        dto.requiredExperience = dto.requiredExperience ?? parsed.minExperienceYears;
        dto.department = dto.department || parsed.department;
      } catch {
        // fall through with original dto if AI fails
      }
    }

    return this.prisma.job.create({
      data: {
        tenantId,
        createdById,
        title: dto.title,
        department: dto.department,
        location: dto.location,
        workMode: dto.workMode as any,
        jobType: dto.jobType as any,
        description: dto.description,
        requiredSkills: dto.requiredSkills ?? [],
        requiredExperience: dto.requiredExperience,
        salaryMin: dto.salaryMin ? parseFloat(dto.salaryMin) : undefined,
        salaryMax: dto.salaryMax ? parseFloat(dto.salaryMax) : undefined,
        salaryCurrency: dto.salaryCurrency ?? 'USD',
        isActive: dto.isActive ?? true,
        countryCode: dto.countryCode,
        headcount: dto.headcount ?? 1,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: { search?: string; isActive?: boolean; page?: number; limit?: number },
  ) {
    const { search, isActive, page = 1, limit = 20 } = filters;
    const where: any = { tenantId };

    if (isActive !== undefined) where.isActive = isActive;

    if (search) {
      where.OR = [
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
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
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
                overallScore: true,
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
    return job;
  }

  async update(tenantId: string, id: string, dto: UpdateJobDto) {
    await this.findOne(tenantId, id);
    const { salaryMin, salaryMax, ...rest } = dto;
    return this.prisma.job.update({
      where: { id },
      data: {
        ...rest,
        ...(salaryMin ? { salaryMin: parseFloat(salaryMin) } : {}),
        ...(salaryMax ? { salaryMax: parseFloat(salaryMax) } : {}),
      },
    });
  }

  async close(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.job.update({ where: { id }, data: { isActive: false } });
  }
}
