import { Injectable } from '@nestjs/common';
import { AiProviderService } from '../providers/ai-provider.service';

@Injectable()
export class JdParserService {
  constructor(private readonly aiProvider: AiProviderService) {}

  async parse(jobDescription: string): Promise<{
    title: string;
    department: string;
    location: string;
    jobType: string;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string;
    requiredSkills: string[];
    preferredSkills: string[];
    yearsExperienceMin: number | null;
    yearsExperienceMax: number | null;
    educationLevel: string;
    responsibilities: string[];
    benefits: string[];
    tokensUsed: number;
  }> {
    const prompt = `Parse the following job description and extract structured requirements.
Return valid JSON:
{
  "title": "",
  "department": "",
  "location": "",
  "jobType": "",
  "salaryMin": null,
  "salaryMax": null,
  "currency": "",
  "requiredSkills": [],
  "preferredSkills": [],
  "yearsExperienceMin": null,
  "yearsExperienceMax": null,
  "educationLevel": "",
  "responsibilities": [],
  "benefits": []
}

Job Description:
${jobDescription}`;

    const { data, meta } = await this.aiProvider.completeJson<any>(prompt, {
      systemPrompt: 'You are an expert job description parser. Extract factual information only. Return ONLY valid JSON.',
      temperature: 0.1,
    });

    return { ...data, tokensUsed: meta.tokensInput + meta.tokensOutput };
  }
}
