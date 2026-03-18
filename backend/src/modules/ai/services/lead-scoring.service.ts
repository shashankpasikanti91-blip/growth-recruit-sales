import { Injectable } from '@nestjs/common';
import { AiProviderService } from '../providers/ai-provider.service';

@Injectable()
export class LeadScoringService {
  constructor(private readonly aiProvider: AiProviderService) {}

  async score(input: {
    leadData: Record<string, any>;
    icpData: Record<string, any>;
  }): Promise<{
    score: number;
    breakdown: { industry_fit: number; size_fit: number; title_relevance: number; intent_signals: number };
    explanation: string;
    nextBestAction: string;
    tokensUsed: number;
  }> {
    const prompt = `Score this lead against the Ideal Customer Profile.
Return valid JSON with:
{
  "score": 0-100,
  "breakdown": {
    "industry_fit": 0-100,
    "size_fit": 0-100,
    "title_relevance": 0-100,
    "intent_signals": 0-100
  },
  "explanation": "2-3 sentence explanation",
  "nextBestAction": "Specific recommended next step"
}

Lead Data:
${JSON.stringify(input.leadData, null, 2)}

Ideal Customer Profile:
${JSON.stringify(input.icpData, null, 2)}`;

    const systemPrompt = `You are an expert B2B sales specialist.
Score leads based on fit with the ICP and buying intent signals.
Be objective. Only score based on available data.
Return ONLY valid JSON.`;

    const { data, meta } = await this.aiProvider.completeJson<{
      score: number;
      breakdown: { industry_fit: number; size_fit: number; title_relevance: number; intent_signals: number };
      explanation: string;
      nextBestAction: string;
    }>(prompt, { systemPrompt, temperature: 0.1 });

    return {
      score: data.score,
      breakdown: data.breakdown,
      explanation: data.explanation,
      nextBestAction: data.nextBestAction,
      tokensUsed: meta.tokensInput + meta.tokensOutput,
    };
  }

  async extractPainPoints(input: { companyData: Record<string, any>; websiteContent?: string; jobPostings?: string }): Promise<{
    painPoints: string[];
    summary: string;
    tokensUsed: number;
  }> {
    const prompt = `Analyze this company's public data and extract likely business pain points relevant to a service provider.
Return valid JSON: { "painPoints": ["...", "..."], "summary": "2-3 sentence company summary" }

Company Data:
${JSON.stringify(input.companyData, null, 2)}

${input.websiteContent ? `Website Content:\n${input.websiteContent.slice(0, 2000)}` : ''}
${input.jobPostings ? `Job Postings:\n${input.jobPostings.slice(0, 1000)}` : ''}`;

    const { data, meta } = await this.aiProvider.completeJson<{ painPoints: string[]; summary: string }>(prompt, {
      systemPrompt: 'You are a B2B sales intelligence analyst. Extract specific, actionable pain points from company data. Return ONLY valid JSON.',
      temperature: 0.3,
    });

    return { painPoints: data.painPoints, summary: data.summary, tokensUsed: meta.tokensInput + meta.tokensOutput };
  }
}
