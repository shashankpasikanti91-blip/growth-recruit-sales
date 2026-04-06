import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../providers/ai-provider.service';
import { ResumeScreeningInput, ResumeScreeningResult } from '../types/resume-screening.types';

@Injectable()
export class ResumeScreeningService {
  private readonly logger = new Logger(ResumeScreeningService.name);

  constructor(private readonly aiProvider: AiProviderService) {}

  async screen(input: ResumeScreeningInput): Promise<{ result: ResumeScreeningResult; tokensUsed: number; latencyMs: number }> {
    const prompt = this.buildPrompt(input.jobDescription, input.resumeText);

    const systemPrompt = `You are an expert recruiter with experience hiring across:
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
- Respond ONLY with valid JSON — no markdown, no explanations, no extra text`;

    const { data, meta } = await this.aiProvider.completeJson<ResumeScreeningResult>(prompt, {
      systemPrompt,
      temperature: 0.1,
      maxTokens: 3000,
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
EXTRACT THE FOLLOWING DETAILS FROM THE RESUME:
--------------------------------------------------
- Full Name         → "name"
- Email ID          → "email"
- Contact Number    → "contact_number"
- Current Company (or Most Recent Employer) → "current_company"
- Current Role      → candidate_profile.current_role
- Total Experience  → candidate_profile.total_experience_years
- Relevant Exp      → candidate_profile.relevant_experience_years
- Key Skills (top 10) → candidate_profile.key_skills
- Current Location  → candidate_profile.current_location
- Notice Period     → candidate_profile.notice_period
- Nationality       → candidate_profile.nationality
- Visa Type (if mentioned) → candidate_profile.visa_type
- Visa Expiry       → candidate_profile.visa_expiry
- Is Foreigner      → candidate_profile.is_foreigner (true if candidate appears to be a foreigner in the job's country)

--------------------------------------------------
ROLE-AWARE SCREENING LOGIC (CRITICAL):
--------------------------------------------------

1) IDENTIFY ROLE CATEGORY FROM JOB DESCRIPTION
Classify the role into ONE of the following (return as "role_category"):
- Executive / Leadership (CEO, COO, CFO, Director, VP)
- Technical / IT / Engineering
- Business / Sales / BA / BD
- Finance / Accounts
- Operations / Admin
- Blue-Collar / Skilled / Support

Apply evaluation criteria based on this classification.

--------------------------------------------------
2) CURRENT EXPERIENCE PRIORITY (ALL ROLES)
--------------------------------------------------
- Give highest priority to skills, responsibilities, and domain used in the CURRENT or MOST RECENT role
- If the candidate has not worked in the JD-related role/domain in the last 8 months or more:
  - Treat the experience as historical
  - Reduce suitability score accordingly

--------------------------------------------------
3) PREVIOUS EXPERIENCE VALIDATION
--------------------------------------------------

A) For Technical Roles:
- Previous experience counts ONLY if it is recent and continuous
- If candidate switched technology/domain for more than 8 months:
  - Mark core JD skills as NOT CURRENT

B) For Executive / Leadership Roles:
- Prior leadership roles ARE valid even if not current, but:
  - Must match company size, scope, and function
  - Individual contributor roles do NOT substitute leadership experience

C) For Business / Sales / BA / BD Roles:
- Prior experience is valid if:
  - Same function (BA ≠ BD ≠ Sales)
  - Similar industry or market
- Tool changes are acceptable; role-function change is not

D) For Finance / Accounts Roles:
- Current hands-on accounting or finance work is preferred
- Long gaps or role switches reduce suitability

E) For Blue-Collar / Operations Roles:
- Practical hands-on experience matters more than tools or titles
- Recent physical/work-site experience is prioritized

--------------------------------------------------
4) EXPERIENCE DURATION MATCHING
--------------------------------------------------

- Compare JD-required years vs ACTUAL relevant years
- Count only years where the candidate was actively working in the JD-related role
- Do NOT count unrelated roles toward required experience

Example:
JD: Finance Manager – 8 years
Resume:
- Accountant (2015–2020)
- Business Analyst (2021–Present)
→ Relevant experience = 5 years (NOT 8)

--------------------------------------------------
5) ROLE CHANGE & RECENCY RULE
--------------------------------------------------

- Role change < 6 months → previous role still relevant
- Role change 6–8 months → medium risk
- Role change > 8 months → previous role considered outdated

--------------------------------------------------
6) CAREER GAP ANALYSIS (ALL ROLES)
--------------------------------------------------

- Identify gaps using provided dates
- Do NOT assume reasons for gaps
- If no reason is mentioned → "Reason not provided"

Gap Risk Levels:
- ≤ 1 year → Low risk
- 1–3 years → Medium risk
- 3–4 years → High risk
- > 4 years → Very high risk (likely rejection)

Mention gap impact clearly in justification.

--------------------------------------------------
7) SCORING RULES
--------------------------------------------------

Score between 0–100 based on weighted criteria:
- Skill Match             35%  → score_breakdown.skill_match  (0–35)
- Relevant Experience     30%  → score_breakdown.experience_relevance (0–30)
- Role & Seniority Match  20%  → score_breakdown.role_alignment (0–20)
- Stability & Consistency 15%  → score_breakdown.stability (0–15)

Score Interpretation:
- 75+  → Strong fit
- 60–74 → Moderate fit
- < 60  → Weak fit

--------------------------------------------------
8) FINAL DECISION RULE
--------------------------------------------------

If score >= 70  → decision = "Shortlisted"
If score 55–69  → decision = "KIV"
If score < 55   → decision = "Rejected"

--------------------------------------------------
OUTPUT FORMAT (STRICT – JSON ONLY):
--------------------------------------------------

Respond ONLY with valid JSON. No explanations, markdown, or extra text.
Do NOT change field names.

{
  "name": "",
  "email": "",
  "contact_number": "",
  "current_company": "",
  "role_category": "",
  "score": 0,
  "decision": "",
  "evaluation": {
    "candidate_strengths": [],
    "candidate_weaknesses": [],
    "high_match_skills": [],
    "medium_match_skills": [],
    "low_or_missing_match_skills": [],
    "career_gaps": [],
    "red_flags": [],
    "risk_level": "",
    "risk_explanation": "",
    "reward_level": "",
    "reward_explanation": "",
    "overall_fit_rating": 0,
    "score_breakdown": {
      "skill_match": 0,
      "experience_relevance": 0,
      "role_alignment": 0,
      "stability": 0
    },
    "justification": ""
  },
  "candidate_profile": {
    "current_role": "",
    "total_experience_years": "",
    "relevant_experience_years": "",
    "key_skills": [],
    "current_location": "",
    "notice_period": "",
    "nationality": "",
    "visa_type": "",
    "visa_expiry": "",
    "is_foreigner": false
  }
}

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
