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

  // ─── Create Application ────────────────────────────────────────────────────

  async create(tenantId: string, createdById: string, dto: CreateApplicationDto) {
    // Verify candidate and job belong to tenant
    const [candidate, job] = await Promise.all([
      this.prisma.candidate.findFirst({ where: { id: dto.candidateId, tenantId } }),
      this.prisma.job.findFirst({ where: { id: dto.jobId, tenantId } }),
    ]);

    if (!candidate) throw new NotFoundException('Candidate not found');
    if (!job) throw new NotFoundException('Job not found');
    if (!job.isActive) throw new BadRequestException('Job is closed');

    // Prevent duplicate applications
    const existing = await this.prisma.application.findFirst({
      where: { candidateId: dto.candidateId, jobId: dto.jobId },
    });
    if (existing) throw new ConflictException('Candidate already applied for this job');

    const application = await this.prisma.application.create({
      data: {
        tenantId,
        candidateId: dto.candidateId,
        jobId: dto.jobId,
        source: dto.source ?? 'manual',
        stage: 'APPLIED',
        resumeText: dto.resumeText,
        coverNote: dto.coverNote,
      },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });

    this.eventEmitter.emit('application.created', { tenantId, application });

    return application;
  }

  // ─── AI Screen (Core Pipeline Step) ────────────────────────────────────────

  async screenApplication(tenantId: string, applicationId: string, resumeTextOverride?: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId },
      include: {
        candidate: true,
        job: {
          select: {
            title: true,
            description: true,
            requiredSkills: true,
            requiredExperience: true,
            department: true,
            location: true,
            countryCode: true,
          },
        },
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    const resumeText = resumeTextOverride || application.resumeText || application.candidate.rawResumeText;
    if (!resumeText) throw new BadRequestException('No resume text available for screening');

    // Build job description string for the screening prompt
    const jobDescription = [
      `Title: ${application.job.title}`,
      application.job.department ? `Department: ${application.job.department}` : '',
      application.job.description ?? '',
      application.job.requiredSkills?.length
        ? `Required Skills: ${(application.job.requiredSkills as string[]).join(', ')}`
        : '',
      application.job.requiredExperience
        ? `Required Experience: ${application.job.requiredExperience} years`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Get country-specific rules if job has a country
    let countryRules: string | undefined;
    if (application.job.countryCode) {
      const country = await this.prisma.countryConfig.findUnique({
        where: { countryCode: application.job.countryCode },
      });
      if (country?.screeningNotes) countryRules = country.screeningNotes as string;
    }

    // Run the 6-step AI screening
    const result = await this.resumeScreening.screen({
      resumeText,
      jobDescription,
      countryRules,
    });

    // Persist result: → AiAnalysisResult + Scorecard + update Application stage + log usage
    await this.aiService.persistScreeningResult(tenantId, {
      candidateId: application.candidateId,
      applicationId: application.id,
      jobId: application.jobId,
      result,
    });

    // Emit event for n8n/workflow to pick up
    this.eventEmitter.emit('application.screened', {
      tenantId,
      applicationId,
      decision: result.decision,
      score: result.score,
      candidateId: application.candidateId,
    });

    return { applicationId, screening: result };
  }

  // ─── Stage Update ───────────────────────────────────────────────────────────

  async updateStage(tenantId: string, id: string, dto: UpdateApplicationStageDto) {
    const application = await this.prisma.application.findFirst({ where: { id, tenantId } });
    if (!application) throw new NotFoundException('Application not found');

    const updated = await this.prisma.application.update({
      where: { id },
      data: { stage: dto.stage as any },
    });

    // Sync candidate's stage to highest-level application stage
    await this.syncCandidateStage(application.candidateId);

    this.eventEmitter.emit('application.stage_changed', {
      tenantId,
      applicationId: id,
      oldStage: application.stage,
      newStage: dto.stage,
    });

    return updated;
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

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
          candidate: { select: { id: true, firstName: true, lastName: true, email: true, currentTitle: true, overallScore: true } },
          job: { select: { id: true, title: true, department: true } },
          scorecards: { orderBy: { createdAt: 'desc' }, take: 1 },
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
        job: { select: { id: true, title: true, department: true, requiredSkills: true } },
        scorecards: { orderBy: { createdAt: 'desc' } },
        aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private readonly stageOrder = [
    'APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED',
  ];

  private async syncCandidateStage(candidateId: string) {
    const applications = await this.prisma.application.findMany({
      where: { candidateId },
      select: { stage: true },
    });

    const highestStageIndex = Math.max(
      ...applications.map((a) => this.stageOrder.indexOf(a.stage as string)),
    );

    if (highestStageIndex >= 0) {
      const targetStage = this.stageOrder[highestStageIndex];
      const prismaStage = this.mapAppStageToCandidateStage(targetStage);
      if (prismaStage) {
        await this.prisma.candidate.update({
          where: { id: candidateId },
          data: { stage: prismaStage },
        });
      }
    }
  }

  private mapAppStageToCandidateStage(stage: string): CandidateStage | null {
    const map: Record<string, CandidateStage> = {
      APPLIED: CandidateStage.APPLIED,
      SCREENING: CandidateStage.SCREENING,
      SHORTLISTED: CandidateStage.SHORTLISTED,
      INTERVIEW: CandidateStage.INTERVIEW,
      OFFER: CandidateStage.OFFER,
      HIRED: CandidateStage.HIRED,
      REJECTED: CandidateStage.REJECTED,
    };
    return map[stage] ?? null;
  }
}
