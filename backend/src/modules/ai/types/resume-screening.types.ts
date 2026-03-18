// Resume Screening AI Service
// Implements the strict evidence-based screening prompt defined in README.md

export interface ResumeScreeningInput {
  jobDescription: string;
  resumeText: string;
}

export interface CandidateProfile {
  full_name: string;
  current_role: string;
  current_company: string;
  total_experience_years: string;
  relevant_experience_years: string;
  key_skills: string[];
  current_location: string;
  notice_period: string;
}

export interface SkillMatch {
  matched_skills: string[];
  missing_skills: string[];
}

export interface MatchAnalysis {
  skill_match: SkillMatch;
  experience_relevance: string;
  role_alignment: string;
  stability: string;
  red_flags: string[];
}

export interface ResumeScreeningResult {
  candidate_profile: CandidateProfile;
  match_analysis: MatchAnalysis;
  score: number;
  decision: 'Strong Shortlist' | 'Shortlist' | 'Keep in View (KIV)' | 'Rejected';
  summary: string;
}
