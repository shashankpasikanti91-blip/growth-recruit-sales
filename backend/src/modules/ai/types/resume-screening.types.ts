// Resume Screening AI Service
// Implements the strict evidence-based screening prompt defined in README.md

export interface ResumeScreeningInput {
  jobDescription: string;
  resumeText: string;
}

export interface CandidateProfile {
  full_name: string;
  email: string;
  contact_number: string;
  current_role: string;
  current_company: string;
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

export interface SkillMatch {
  matched_skills: string[];
  missing_skills: string[];
}

export interface ScoreBreakdown {
  skill_match: number;
  experience_relevance: number;
  role_alignment: number;
  stability: number;
}

export interface MatchAnalysis {
  skill_match: SkillMatch;
  experience_relevance: string;
  experience_recency: string;
  role_alignment: string;
  seniority_match: string;
  stability: string;
  career_gaps: string[];
  red_flags: string[];
}

export interface ResumeScreeningResult {
  candidate_profile: CandidateProfile;
  role_category: string;
  match_analysis: MatchAnalysis;
  score: number;
  score_breakdown: ScoreBreakdown;
  decision: 'Shortlisted' | 'KIV' | 'Rejected';
  summary: string;
}
