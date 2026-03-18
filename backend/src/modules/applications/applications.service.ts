import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ResumeScreeningService } from '../ai/services/resume-screening.service';
import { CreateApplicationDto, UpdateApplicationStageDto } from './dto/application.dto';
import { CandidateStage } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly resumeScreening: ResumeScreeningService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, createdById: string, dto: CreateApplicationDto) {
    const [candidate, job] = await Promise.all([
      this.prisma.candidate.findFirst({ where: { id: dto.candidateId, tenantId } }),
      this.prisma.job.findFirst({ where: { id: dto.jobId, tenantId } }),
    ]);

    if (!candidate) throw new NotFoundException('Candidate not found');
    if (!job) throw new NotFoundException('Job not found');
    if (!job.isActive) throw new BadRequestException('Job is closed');

    const existing = await this.prisma.application.findFirst({
      where: { candidateId: dto.candidateId, jobId: dto.jobId },
    });
    if (existing) throw new ConflictException('Candidate already applied for this job');

    const application = await this.prisma.application.create({
      data: {
        tenantId,
        candidateId: dto.candidateId,
        jobId: dto.jobId,
        stage: CandidateStage.SOURCED,
      },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });

    this.eventEmitter.emit('application.created', { tenantId, application });

    return application;
  }

  async screenApplication(tenantId: string, applicationId: string, resumeTextOverride?: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId },
      include: {
        candidate: {
          include: {
            resumes: { where: { isPrimary: true }, take: 1 },
          },
        },
        job: {
          select: {
            title: true,
            description: true,
            skills: true,
            experience: true,
            department: true,
            location: true,
            countryCode: true,
          },
        },
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    const candidate = application.candidate as any;
    const primaryResume = candidate.resumes?.[0];
    const resumeText = resumeTextOverride || primaryResume?.rawText || '';
    if (!resumeText) throw new BadRequestException('No resume text available for screening');

    const job = application.job as any;
    const jobDescription = [
      `Title: ${job.title}`,
      job.department ? `Department: ${job.department}` : '',
      job.description ?? '',
      job.skills?.length ? `Required Skills: ${(job.skills as string[]).join(', ')}` : '',
      job.experience ? `Required Experience: ${job.experience}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    let fullJobDescription = jobDescription;
    if (job.countryCode) {
      const country = await this.prisma.countryConfig.findUnique({
        where: { code: job.countryCode },
      });
      if (country?.complianceNotes) {
        fullJobDescription += `\n\nCompliance Notes: ${country.complianceNotes}`;
      }
    }

    const screenOutput = await this.resumeScreening.screen({
      resumeText,
      jobDescription: fullJobDescription,
    });

    await this.aiService.persistScreeningResult(
      tenantId,
      application.candidateId,
      application.jobId,
      screenOutput.result,
      screenOutput.tokensUsed,
      screenOutput.latencyMs,
    );

    this.eventEmitter.emit('application.screened', {
      tenantId,
      applicationId,
      decision: screenOutput.result.decision,
      score: screenOutput.result.score,
      candidateId: application.candidateId,
    });

    return { applicationId, screening: screenOutput.result };
  }

  async updateStage(tenantId: string, id: string, dto: UpdateApplicationStageDto) {
    const application = await this.prisma.application.findFirst({ where: { id, tenantId } });
    if (!application) throw new NotFoundException('Application not found');

    const updated = await this.prisma.application.update({
      where: { id },
      data: { stage: dto.stage as CandidateStage },
    });

    this.eventEmitter.emit('application.stage_changed', {
      tenantId,
      applicationId: id,
      oldStage: application.stage,
      newStage: dto.stage,
    });

    return updated;
  }

  async findAll(
    tenantId: string,
    filters: { jobId?: string; candidateId?: string; stage?: string; page?: number; limit?: number },
  ) {
    const { jobId, candidateId, stage, page = 1, limit = 20 } = filters;
    const where: any = { tenantId };
    if (jobId) where.jobId = jobId;
    if (candidateId) where.candidateId = candidateId;
    if (stage) where.stage = stage;

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { appliedAt: 'desc' },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              currentTitle: true,
            },
          },
          job: { select: { id: true, title: true, department: true } },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, tenantId },
      include: {
        candidate: true,
        job: { select: { id: true, title: true, department: true, skills: true } },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }
}
