import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../providers/ai-provider.service';
import { ResumeScreeningInput, ResumeScreeningResult } from '../types/resume-screening.types';

@Injectable()
export class ResumeScreeningService {
  private readonly logger = new Logger(ResumeScreeningService.name);

  constructor(private readonly aiProvider: AiProviderService) {}

  async screen(input: ResumeScreeningInput): Promise<{ result: ResumeScreeningResult; tokensUsed: number; latencyMs: number }> {
    const prompt = this.buildPrompt(input.jobDescription, input.resumeText);

    const systemPrompt = `You are an expert Sr recruiter with experience hiring across:
- Technology & Software roles
- Executive leadership roles (CEO, COO, CTO, CFO)
- Business roles (Business Analyst, Business Development, Sales)
- Finance & Accounting roles
- Operations, Admin, and Blue-Collar roles

You understand that screening criteria vary by role type and seniority.

CRITICAL RULES:
- Base your evaluation STRICTLY on the provided Job Description and Resume
- Do NOT assume or infer missing information
- Do NOT hallucinate skills, experience, or reasons
- If a detail is not found, return "Not Found"
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

Your task is to:
- Analyze how well the candidate matches the job requirements
- Extract key candidate details from the resume
- Provide a structured, realistic screening evaluation

IMPORTANT RULES:
- Base your evaluation STRICTLY on the provided Job Description and Resume
- Do NOT assume or infer missing information
- Do NOT hallucinate skills, experience, or reasons
- If a detail is not found, return "Not Found"

--------------------------------------------------
STEP 1: EXTRACT CANDIDATE PROFILE
--------------------------------------------------
Extract the following from the resume:
- Full Name
- Email ID
- Contact Number
- Current Role
- Current Company (or Most Recent Employer)
- Total Experience (years)
- Relevant Experience (years aligned to JD)
- Key Skills (top 10)
- Current Location
- Notice Period (if available)
- Nationality (if mentioned or inferable from name/location/education)
- Visa Type (if mentioned — e.g. EP, DP, S Pass, H-1B, 482, PR, Citizen)
- Visa Expiry (if mentioned)
- Is Foreigner (true if candidate appears to be a foreigner in the job's country based on nationality vs location)

--------------------------------------------------
STEP 2: IDENTIFY ROLE CATEGORY
--------------------------------------------------
Classify the JD role into ONE of the following:
- Executive / Leadership (CEO, COO, CFO, Director, VP)
- Technical / IT / Engineering
- Business / Sales / BA / BD
- Finance / Accounts
- Operations / Admin
- Blue-Collar / Skilled / Support

Apply evaluation criteria based on this classification.

--------------------------------------------------
STEP 3: ROLE-AWARE SCREENING ANALYSIS
--------------------------------------------------

3A) CURRENT EXPERIENCE PRIORITY (ALL ROLES):
- Give highest priority to skills, responsibilities, and domain used in the CURRENT or MOST RECENT role
- If the candidate has not worked in the JD-related role/domain in the last 8 months:
  - Treat the experience as historical
  - Reduce suitability score accordingly

3B) PREVIOUS EXPERIENCE VALIDATION:

For Technical Roles:
- Previous experience counts ONLY if it is recent and continuous
- If candidate switched technology/domain for more than 8 months: mark core JD skills as NOT CURRENT

For Executive / Leadership Roles:
- Prior leadership roles ARE valid even if not current, but must match company size, scope, and function
- Individual contributor roles do NOT substitute leadership experience

For Business / Sales / BA / BD Roles:
- Prior experience is valid if same function (BA ≠ BD ≠ Sales) and similar industry/market
- Tool changes are acceptable; role-function change is not

For Finance / Accounts Roles:
- Current hands-on accounting or finance work is preferred
- Long gaps or role switches reduce suitability

For Blue-Collar / Operations Roles:
- Practical hands-on experience matters more than tools or titles
- Recent physical/work-site experience is prioritized

3C) EXPERIENCE DURATION MATCHING:
- Compare JD-required years vs ACTUAL relevant years
- Count only years where the candidate was actively working in the JD-related role
- Do NOT count unrelated roles toward required experience

3D) ROLE CHANGE & RECENCY RULE:
- Role change < 6 months → previous role still relevant
- Role change 6-8 months → medium risk
- Role change > 8 months → previous role considered outdated

3E) CAREER GAP ANALYSIS:
- Identify gaps using provided dates
- Do NOT assume reasons for gaps
- If no reason is mentioned → "Reason not provided"
- Gap Risk: ≤1 year = Low, 1-3 years = Medium, 3-4 years = High, >4 years = Very High
- Mention gap impact clearly in justification

--------------------------------------------------
STEP 4: SCORING
--------------------------------------------------

Score between 0-100 using realistic recruiter judgment based on role type:
- Skill Match (35%)
- Relevant Experience & Recency (30%)
- Role & Seniority Alignment (20%)
- Stability & Consistency (15%)

Score Interpretation:
- 75+  → Strong fit
- 60-74 → Moderate fit
- < 60  → Weak fit

--------------------------------------------------
STEP 5: FINAL DECISION
--------------------------------------------------

If score >= 70 → Decision = "Shortlisted"
If score 55-69 → Decision = "KIV"
If score < 55  → Decision = "Rejected"

--------------------------------------------------
STEP 6: OUTPUT FORMAT (STRICT JSON)
--------------------------------------------------

Return ONLY this valid JSON structure:

{
  "candidate_profile": {
    "full_name": "",
    "email": "",
    "contact_number": "",
    "current_role": "",
    "current_company": "",
    "total_experience_years": "",
    "relevant_experience_years": "",
    "key_skills": [],
    "current_location": "",
    "notice_period": "",
    "nationality": "",
    "visa_type": "",
    "visa_expiry": "",
    "is_foreigner": false
  },
  "role_category": "",
  "match_analysis": {
    "skill_match": {
      "matched_skills": [],
      "missing_skills": []
    },
    "experience_relevance": "",
    "experience_recency": "",
    "role_alignment": "",
    "seniority_match": "",
    "stability": "",
    "career_gaps": [],
    "red_flags": []
  },
  "score": 0,
  "score_breakdown": {
    "skill_match": 0,
    "experience_relevance": 0,
    "role_alignment": 0,
    "stability": 0
  },
  "decision": "",
  "summary": ""
}

--------------------------------------------------
STEP 7: SUMMARY RULE
--------------------------------------------------
Write a 2-3 line recruiter-style summary:
- Why this candidate is suitable or not
- Mention key strengths and concerns
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
      'Shortlisted': 'SCREENED',
      'KIV': 'SCREENED',
      'Rejected': 'REJECTED',
    };
    return map[decision] || 'SCREENED';
  }
}
