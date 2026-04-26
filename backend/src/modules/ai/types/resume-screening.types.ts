// Resume Screening AI Service — Senior Recruitment Auditor AI (v2, April 2026)

export interface ResumeScreeningInput {
  jobDescription: string;
  resumeText: string;
}

// Candidate profile extraction
export interface CandidateProfile {
  current_role: string;
  total_experience_years: string;
  relevant_experience_years: string;
  key_skills: string[];
  current_location: string;
  notice_period: string;
  nationality: string;
  visa_type: string;
  visa_expiry: string;
  is_foreigner: boolean;
}

// v2 Score breakdown — 6 weighted criteria
export interface ScoreBreakdown {
  jd_relevance: number;             // /25
  recent_role_strength: number;     // /20
  experience_consistency: number;   // /20
  skill_authenticity_score: number; // /10
  education_completeness: number;   // /10
  resume_structure: number;         // /15
  // Legacy compat (v1 fields)
  skill_match?: number;
  experience_relevance?: number;
  role_alignment?: number;
  stability?: number;
}

// Experience audit — claimed vs calculated
export interface ExperienceAudit {
  claimed_experience: string;
  calculated_experience: string;
  difference: string;
  verdict: 'Match' | 'Inflation' | 'Missing';
}

// Date format validation
export interface DateFormatCheck {
  month_year_used: boolean;
  year_only_entries: string[];
}

// Experience ordering
export interface ExperienceOrderCheck {
  proper_descending_order: boolean;
}

// Career gap analysis
export interface GapAnalysis {
  total_missing_duration: string;
  exact_gaps: string[];
}

// JD match
export interface JdMatchAnalysis {
  match_percent: number;
  matching_skills: string[];
  missing_skills: string[];
}

// Skill authenticity tiers
export interface SkillAuthenticity {
  verified: string[];
  unverified: string[];
  outdated: string[];
}

// Education completeness
export interface EducationCheck {
  passout_year_present: boolean;
  month_available: boolean;
}

// Evaluation block (v1 compat + v2 extensions)
export interface Evaluation {
  candidate_strengths: string[];
  candidate_weaknesses: string[];
  // Legacy v1 skill arrays
  high_match_skills?: string[];
  medium_match_skills?: string[];
  low_or_missing_match_skills?: string[];
  career_gaps: string[];
  red_flags: string[];
  risk_level: string;
  risk_explanation: string;
  reward_level: string;
  reward_explanation: string;
  overall_fit_rating: number;
  score_breakdown: ScoreBreakdown;
  justification: string;
}

export interface ResumeScreeningResult {
  // Core extraction
  name: string;
  email: string;
  contact_number: string;
  current_company: string;
  role_category: string;

  // Scores — both names supported
  score: number;       // final score /100
  final_score: number; // alias of score

  // Classification (v2)
  classification: 'STRONG' | 'KAV' | 'REJECT';
  hiring_recommendation: 'Hire' | 'Hold' | 'Reject';

  // Legacy decision (v1 compat)
  decision: 'Shortlisted' | 'KIV' | 'Rejected';

  // Audit sections (v2)
  executive_summary: string;
  experience_audit: ExperienceAudit;
  date_format_check: DateFormatCheck;
  experience_order_check: ExperienceOrderCheck;
  gap_analysis: GapAnalysis;
  jd_match_analysis: JdMatchAnalysis;
  skill_authenticity: SkillAuthenticity;
  education_check: EducationCheck;
  red_flags: string[];
  required_actions: string[];

  // Evaluation block
  evaluation: Evaluation;

  // Candidate profile
  candidate_profile: CandidateProfile;
}
