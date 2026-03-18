import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../providers/ai-provider.service';
import { ResumeScreeningInput, ResumeScreeningResult } from '../types/resume-screening.types';

@Injectable()
export class ResumeScreeningService {
  private readonly logger = new Logger(ResumeScreeningService.name);

  constructor(private readonly aiProvider: AiProviderService) {}

  async screen(input: ResumeScreeningInput): Promise<{ result: ResumeScreeningResult; tokensUsed: number; latencyMs: number }> {
    const prompt = this.buildPrompt(input.jobDescription, input.resumeText);

    const systemPrompt = `You are an expert technical recruiter specializing in AI, automation, and software engineering roles.

CRITICAL RULES:
- Only use information explicitly present in the resume and job description
- Do NOT assume or infer missing information
- If any detail is not found, return "Not Found"
- Be objective and consistent
- Focus on CURRENT and RELEVANT experience (recent roles matter more than old/irrelevant ones)
- Return ONLY valid JSON with no extra text, markdown, or explanation`;

    const { data, meta } = await this.aiProvider.completeJson<ResumeScreeningResult>(prompt, {
      systemPrompt,
      temperature: 0.1,
      maxTokens: 2500,
    });

    return {
      result: data,
      tokensUsed: meta.tokensInput + meta.tokensOutput,
      latencyMs: meta.latencyMs,
    };
  }

  private buildPrompt(jobDescription: string, resumeText: string): string {
    return `You will receive:
1) A Job Description
2) A Candidate Resume

Your task is to perform a strict, evidence-based screening evaluation.

--------------------------------------------------
STEP 1: EXTRACT CANDIDATE PROFILE
--------------------------------------------------
Extract the following:
- Full Name
- Current Role
- Current Company
- Total Experience (years)
- Relevant Experience (years aligned to JD)
- Key Skills (top 10)
- Current Location
- Notice Period (if available)

--------------------------------------------------
STEP 2: JOB MATCH ANALYSIS
--------------------------------------------------

Evaluate the candidate based on:

1. Skill Match
   - Match required skills from JD with candidate skills
   - Highlight matched vs missing skills

2. Experience Relevance
   - Consider ONLY relevant and recent experience
   - Ignore outdated or unrelated experience
   - Check domain, tools, and role similarity

3. Role Alignment
   - Compare candidate's current/last role with JD role
   - Check seniority level match

4. Stability Check
   - Identify frequent job changes (if visible)

5. Red Flags (if any)
   - Missing critical skills
   - Role mismatch
   - Too junior/senior
   - Career gaps (if clearly visible)

--------------------------------------------------
STEP 3: SCORING
--------------------------------------------------

Provide a score between 0-100 based on:
- Skills match (40%)
- Relevant experience (30%)
- Role alignment (20%)
- Stability (10%)

Guidelines:
- 80-100 = Strong fit
- 65-79 = Good fit
- 50-64 = Moderate fit
- Below 50 = Weak fit

--------------------------------------------------
STEP 4: FINAL DECISION
--------------------------------------------------

Based on score:
- 80+ → "Strong Shortlist"
- 65-79 → "Shortlist"
- 50-64 → "Keep in View (KIV)"
- Below 50 → "Rejected"

--------------------------------------------------
STEP 5: OUTPUT FORMAT (STRICT JSON)
--------------------------------------------------

Return ONLY this valid JSON structure:

{
  "candidate_profile": {
    "full_name": "",
    "current_role": "",
    "current_company": "",
    "total_experience_years": "",
    "relevant_experience_years": "",
    "key_skills": [],
    "current_location": "",
    "notice_period": ""
  },
  "match_analysis": {
    "skill_match": {
      "matched_skills": [],
      "missing_skills": []
    },
    "experience_relevance": "",
    "role_alignment": "",
    "stability": "",
    "red_flags": []
  },
  "score": 0,
  "decision": "",
  "summary": ""
}

--------------------------------------------------
STEP 6: SUMMARY RULE
--------------------------------------------------
Write a 2-3 line recruiter-style summary:
- Why this candidate is suitable or not
- Keep it sharp and decision-focused

--------------------------------------------------
JOB DESCRIPTION:
--------------------------------------------------
${jobDescription}

--------------------------------------------------
CANDIDATE RESUME:
--------------------------------------------------
${resumeText}`;
  }

  mapDecisionToStage(decision: ResumeScreeningResult['decision']): string {
    const map: Record<string, string> = {
      'Strong Shortlist': 'INTERVIEWING',
      'Shortlist': 'SCREENED',
      'Keep in View (KIV)': 'SCREENED',
      'Rejected': 'REJECTED',
    };
    return map[decision] || 'SCREENED';
  }
}
