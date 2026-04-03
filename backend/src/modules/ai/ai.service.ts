import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsageService } from '../billing/usage.service';
import { ResumeScreeningResult } from './types/resume-screening.types';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageService: UsageService,
  ) {}

  async persistScreeningResult(
    tenantId: string,
    candidateId: string,
    jobId: string,
    result: ResumeScreeningResult,
    tokensUsed: number,
    latencyMs: number,
  ) {
    // Enforce AI usage limit
    await this.usageService.enforceAndIncrement(tenantId, 'ai');
    // Save AI analysis result
    await this.prisma.aiAnalysisResult.create({
      data: {
        tenantId,
        serviceType: 'CANDIDATE_SCORING',
        candidateId,
        inputData: { jobId },
        outputData: result as any,
        model: 'openai/gpt-4.1-mini',
        tokensUsed,
        latencyMs,
      },
    });

    // Upsert scorecard
    await this.prisma.scorecard.create({
      data: {
        tenantId,
        candidateId,
        jobId,
        score: result.score,
        maxScore: 100,
        breakdown: result.match_analysis as any,
        explanation: result.summary,
        aiGenerated: true,
      },
    });

    // Update application stage based on decision
    const stageMap: Record<string, string> = {
      'Shortlisted': 'SCREENED',
      'KIV': 'SCREENED',
      'Rejected': 'REJECTED',
    };

    const newStage = stageMap[result.decision];
    if (newStage) {
      // SECURITY: always include tenantId in write operations to prevent cross-tenant mutation
      await this.prisma.application.updateMany({
        where: { candidateId, jobId, tenantId },
        data: {
          stage: newStage as any,
          matchScore: result.score,
          scoreDetails: result.match_analysis as any,
          isShortlisted: result.decision === 'Shortlisted',
          isInterview: false,
        },
      });
    }

    // Log AI usage
    await this.prisma.aiUsageLog.create({
      data: { tenantId, serviceType: 'CANDIDATE_SCORING', model: 'openai/gpt-4.1-mini', tokensInput: Math.round(tokensUsed * 0.6), tokensOutput: Math.round(tokensUsed * 0.4) },
    });
  }
}
