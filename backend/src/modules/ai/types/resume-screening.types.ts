// Resume Screening AI Service — Multi-industry prompt (all role types)

export interface ResumeScreeningInput {
  jobDescription: string;
  resumeText: string;
}

// Rich candidate extraction
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

// Weighted scoring
export interface ScoreBreakdown {
  skill_match: number;        // /35
  experience_relevance: number; // /30
  role_alignment: number;     // /20
  stability: number;          // /15
}

// User-specified evaluation block
export interface Evaluation {
  candidate_strengths: string[];
  candidate_weaknesses: string[];
  high_match_skills: string[];
  medium_match_skills: string[];
  low_or_missing_match_skills: string[];
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
  // Top-level quick-access fields
  name: string;
  email: string;
  contact_number: string;
  current_company: string;
  role_category: string;
  score: number;
  decision: 'Shortlisted' | 'KIV' | 'Rejected';
  evaluation: Evaluation;
  // Rich extraction
  candidate_profile: CandidateProfile;
}
