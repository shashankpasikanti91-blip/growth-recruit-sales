import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResumeScreeningResult } from './types/resume-screening.types';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async persistScreeningResult(
    tenantId: string,
    candidateId: string,
    jobId: string,
    result: ResumeScreeningResult,
    tokensUsed: number,
    latencyMs: number,
  ) {
    // Save AI analysis result
    await this.prisma.aiAnalysisResult.create({
      data: {
        tenantId,
        serviceType: 'CANDIDATE_SCORING',
        candidateId,
        inputData: { jobId },
        outputData: result as any,
        model: 'gpt-4o',
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
      'Strong Shortlist': 'INTERVIEWING',
      'Shortlist': 'SCREENED',
      'Keep in View (KIV)': 'SCREENED',
      'Rejected': 'REJECTED',
    };

    const newStage = stageMap[result.decision];
    if (newStage) {
      await this.prisma.application.updateMany({
        where: { candidateId, jobId },
        data: {
          stage: newStage as any,
          matchScore: result.score,
          scoreDetails: result.match_analysis as any,
          isShortlisted: result.decision === 'Strong Shortlist' || result.decision === 'Shortlist',
          isInterview: result.decision === 'Strong Shortlist',
        },
      });
    }

    // Log AI usage
    await this.prisma.aiUsageLog.create({
      data: { tenantId, serviceType: 'CANDIDATE_SCORING', model: 'gpt-4o', tokensInput: Math.round(tokensUsed * 0.6), tokensOutput: Math.round(tokensUsed * 0.4) },
    });
  }
}
