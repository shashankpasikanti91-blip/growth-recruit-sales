import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../providers/ai-provider.service';
import { ResumeScreeningInput, ResumeScreeningResult } from '../types/resume-screening.types';

@Injectable()
export class ResumeScreeningService {
  private readonly logger = new Logger(ResumeScreeningService.name);

  constructor(private readonly aiProvider: AiProviderService) {}

  async screen(input: ResumeScreeningInput): Promise<{ result: ResumeScreeningResult; tokensUsed: number; latencyMs: number }> {
    const prompt = this.buildPrompt(input.jobDescription, input.resumeText);

    const systemPrompt = `You are a Senior Recruitment Auditor AI.

You function as a combination of:
* Senior Recruiter
* Hiring Manager
* Background Verification Auditor

You are designed to evaluate candidates across ALL industries and roles, including:
* Blue-collar jobs (technicians, drivers, operators)
* Non-technical roles (customer service, BPO, sales, admin)
* IT & software roles (developers, cloud, data, etc.)
* Medical field (nurses, doctors, pharmacists, healthcare staff)
* Leadership roles (managers, directors, CXO level)

CORE MINDSET:
* Be strict, analytical, and evidence-based
* Do NOT assume missing information
* If something is not clearly mentioned → treat it as missing
* Focus on RECENT and VERIFIED experience only
* Think like a hiring panel and auditor

CRITICAL DATE RULE: ALL experience entries MUST include Month + Year (e.g., Jan 2022 – Mar 2024). Year-only format hides actual duration — flag it.
CRITICAL ORDER RULE: Experience MUST be in DESCENDING order (latest first). Flag if not.

SCORING SYSTEM:
> 70 → STRONG (Hire-ready) → classification: "STRONG" → decision: "Shortlisted" → recommendation: "Hire"
60–70 → KAV (Needs improvement) → classification: "KAV" → decision: "KIV" → recommendation: "Hold"
< 55 → REJECT (High risk) → classification: "REJECT" → decision: "Rejected" → recommendation: "Reject"

EVALUATION WEIGHTAGE:
1. JD Relevance (25%) → score_breakdown.jd_relevance (/25)
2. Recent Role Strength (20%) → score_breakdown.recent_role_strength (/20)
3. Experience Consistency & Gaps (20%) → score_breakdown.experience_consistency (/20)
4. Skill Authenticity (10%) → score_breakdown.skill_authenticity_score (/10)
5. Education Completeness (10%) → score_breakdown.education_completeness (/10)
6. Resume Structure & Format (15%) → score_breakdown.resume_structure (/15)

Do NOT hallucinate skills, experience, or reasons.
If a detail is not found, return "Not Found".
Respond ONLY with valid JSON — no markdown, no explanations, no extra text.`;

    const { data, meta } = await this.aiProvider.completeJson<ResumeScreeningResult>(prompt, {
      systemPrompt,
      temperature: 0.1,
      maxTokens: 5000,
    });

    return {
      result: this.normalizeResult(data),
      tokensUsed: meta.tokensInput + meta.tokensOutput,
      latencyMs: meta.latencyMs,
    };
  }

  /** Ensure backward-compat fields are always populated */
  private normalizeResult(data: ResumeScreeningResult): ResumeScreeningResult {
    // Sync score ↔ final_score
    if (data.final_score != null && data.score == null) data.score = data.final_score;
    if (data.score != null && data.final_score == null) data.final_score = data.score;

    // Sync classification ↔ decision
    const classToDecision: Record<string, 'Shortlisted' | 'KIV' | 'Rejected'> = {
      STRONG: 'Shortlisted', KAV: 'KIV', REJECT: 'Rejected',
    };
    const decisionToClass: Record<string, 'STRONG' | 'KAV' | 'REJECT'> = {
      Shortlisted: 'STRONG', KIV: 'KAV', Rejected: 'REJECT',
    };
    if (data.classification && !data.decision) data.decision = classToDecision[data.classification] ?? 'KIV';
    if (data.decision && !data.classification) data.classification = decisionToClass[data.decision] ?? 'KAV';

    // Sync red_flags between top-level and evaluation
    if (!data.evaluation) data.evaluation = {} as any;
    if (!data.red_flags?.length && data.evaluation?.red_flags?.length) {
      data.red_flags = data.evaluation.red_flags;
    }
    if (!data.evaluation.red_flags?.length && data.red_flags?.length) {
      data.evaluation.red_flags = data.red_flags;
    }

    return data;
  }

  private buildPrompt(jobDescription: string, resumeText: string): string {
    return `You will receive a Job Description and a Candidate Resume.
Audit the candidate strictly as a Senior Recruitment Auditor. Follow ALL sections below.

══════════════════════════════════════════════════════
SECTION 1 — CANDIDATE EXTRACTION
══════════════════════════════════════════════════════
Extract from resume:
- Full Name → "name"
- Email → "email"
- Contact Number → "contact_number"
- Current/Most Recent Employer → "current_company"
- Role Category → "role_category" (one of: Executive/Leadership, Technical/IT/Engineering, Business/Sales/BA/BD, Finance/Accounts, Operations/Admin, Blue-Collar/Skilled/Support, Medical/Healthcare, Customer Service/BPO)

Also fill "candidate_profile":
- current_role, total_experience_years, relevant_experience_years
- key_skills (top 10), current_location, notice_period
- nationality, visa_type, visa_expiry, is_foreigner

══════════════════════════════════════════════════════
SECTION 2 — EXPERIENCE AUDIT
══════════════════════════════════════════════════════
- claimed_experience: extract claimed total years from resume
- calculated_experience: calculate actual years from Month-Year timelines
- difference: the gap between claimed and calculated
- verdict: "Match" | "Inflation" | "Missing"

══════════════════════════════════════════════════════
SECTION 3 — DATE FORMAT CHECK
══════════════════════════════════════════════════════
- month_year_used: true if ALL entries have Month+Year, false otherwise
- year_only_entries: list of job/education entries that only show year (not month)

══════════════════════════════════════════════════════
SECTION 4 — EXPERIENCE ORDER CHECK
══════════════════════════════════════════════════════
- proper_descending_order: true if latest job is first, false if not

══════════════════════════════════════════════════════
SECTION 5 — GAP ANALYSIS
══════════════════════════════════════════════════════
- total_missing_duration: e.g. "8 months unaccounted"
- exact_gaps: array of strings describing each gap (e.g. "Mar 2022 – Nov 2022: 8 months unexplained")

══════════════════════════════════════════════════════
SECTION 6 — JD MATCH ANALYSIS
══════════════════════════════════════════════════════
- match_percent: 0–100
- matching_skills: skills from JD that candidate has
- missing_skills: skills required by JD that candidate lacks

══════════════════════════════════════════════════════
SECTION 7 — SKILL AUTHENTICITY
══════════════════════════════════════════════════════
- verified: skills backed by recent (< 8 months ago) experience
- unverified: skills claimed but not demonstrated in recent roles
- outdated: skills not used in the last 8+ months

══════════════════════════════════════════════════════
SECTION 8 — EDUCATION CHECK
══════════════════════════════════════════════════════
- passout_year_present: true/false
- month_available: true/false

══════════════════════════════════════════════════════
SECTION 9 — SCORING (sum must = final_score)
══════════════════════════════════════════════════════
score_breakdown sub-scores:
- jd_relevance: 0–25
- recent_role_strength: 0–20
- experience_consistency: 0–20
- skill_authenticity_score: 0–10
- education_completeness: 0–10
- resume_structure: 0–15

Set "final_score" = sum of above. Also set "score" = same value.

══════════════════════════════════════════════════════
SECTION 10 — CLASSIFICATION & RECOMMENDATION
══════════════════════════════════════════════════════
Based on final_score:
- > 70: classification="STRONG", decision="Shortlisted", hiring_recommendation="Hire"
- 55–70: classification="KAV",    decision="KIV",         hiring_recommendation="Hold"
- < 55:  classification="REJECT", decision="Rejected",    hiring_recommendation="Reject"

══════════════════════════════════════════════════════
SECTION 11 — EXECUTIVE SUMMARY
══════════════════════════════════════════════════════
"executive_summary": 2–3 sentence hiring insight covering fit, main concerns, and recommendation.

══════════════════════════════════════════════════════
SECTION 12 — RED FLAGS
══════════════════════════════════════════════════════
"red_flags": array of specific concerns (missing months, experience mismatch, gaps, poor structure, etc.)
Also copy to "evaluation.red_flags".

══════════════════════════════════════════════════════
SECTION 13 — REQUIRED ACTIONS
══════════════════════════════════════════════════════
"required_actions": array of actions the recruiter must take before proceeding.
Examples: "Add Month-Year format to all roles", "Clarify gap Mar–Nov 2022", "Update resume in descending order"

══════════════════════════════════════════════════════
ADDITIONAL EVALUATION FIELDS
══════════════════════════════════════════════════════
Also fill "evaluation":
- candidate_strengths, candidate_weaknesses, career_gaps
- risk_level ("Low"/"Medium"/"High"/"Very High"), risk_explanation
- reward_level ("Low"/"Medium"/"High"/"Very High"), reward_explanation
- overall_fit_rating (0–10)
- justification (recruiter narrative)

══════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT JSON ONLY
══════════════════════════════════════════════════════
Respond ONLY with valid JSON. No explanations, markdown, or extra text.

{
  "name": "",
  "email": "",
  "contact_number": "",
  "current_company": "",
  "role_category": "",
  "final_score": 0,
  "score": 0,
  "classification": "STRONG",
  "decision": "Shortlisted",
  "hiring_recommendation": "Hire",
  "executive_summary": "",
  "experience_audit": {
    "claimed_experience": "",
    "calculated_experience": "",
    "difference": "",
    "verdict": "Match"
  },
  "date_format_check": {
    "month_year_used": true,
    "year_only_entries": []
  },
  "experience_order_check": {
    "proper_descending_order": true
  },
  "gap_analysis": {
    "total_missing_duration": "",
    "exact_gaps": []
  },
  "jd_match_analysis": {
    "match_percent": 0,
    "matching_skills": [],
    "missing_skills": []
  },
  "skill_authenticity": {
    "verified": [],
    "unverified": [],
    "outdated": []
  },
  "education_check": {
    "passout_year_present": true,
    "month_available": true
  },
  "red_flags": [],
  "required_actions": [],
  "evaluation": {
    "candidate_strengths": [],
    "candidate_weaknesses": [],
    "career_gaps": [],
    "red_flags": [],
    "risk_level": "",
    "risk_explanation": "",
    "reward_level": "",
    "reward_explanation": "",
    "overall_fit_rating": 0,
    "score_breakdown": {
      "jd_relevance": 0,
      "recent_role_strength": 0,
      "experience_consistency": 0,
      "skill_authenticity_score": 0,
      "education_completeness": 0,
      "resume_structure": 0
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

══════════════════════════════════════════════════════
JOB DESCRIPTION:
══════════════════════════════════════════════════════
${jobDescription}

══════════════════════════════════════════════════════
CANDIDATE RESUME:
══════════════════════════════════════════════════════
${resumeText}`;
  }

  mapDecisionToStage(decision: ResumeScreeningResult['decision']): string {
    const map: Record<string, string> = {
      Shortlisted: 'SCREENED',
      KIV: 'SCREENED',
      Rejected: 'REJECTED',
    };
    return map[decision] ?? 'SCREENED';
  }
}

