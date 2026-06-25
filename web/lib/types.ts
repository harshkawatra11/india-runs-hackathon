// Candidate shape (subset of candidate_schema.json that the ranker reads).

export interface Skill {
  name: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  endorsements: number;
  duration_months?: number;
}

export interface Role {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  duration_months: number;
  is_current: boolean;
  industry: string;
  company_size: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: number;
  end_year: number;
  grade?: string | null;
  tier?: string;
}

export interface RedrobSignals {
  last_active_date?: string;
  open_to_work_flag?: boolean;
  recruiter_response_rate?: number;
  notice_period_days?: number;
  interview_completion_rate?: number;
  saved_by_recruiters_30d?: number;
  verified_email?: boolean;
  verified_phone?: boolean;
  skill_assessment_scores?: Record<string, number>;
  willing_to_relocate?: boolean;
  [key: string]: unknown;
}

export interface Candidate {
  candidate_id: string;
  profile: {
    anonymized_name?: string;
    headline?: string;
    summary?: string;
    location?: string;
    country?: string;
    years_of_experience?: number;
    current_title?: string;
    current_company?: string;
    current_industry?: string;
  };
  career_history: Role[];
  education: Education[];
  skills: Skill[];
  redrob_signals: RedrobSignals;
}

export interface ScoreBreakdown {
  base: number;
  components: Record<string, number>;
  penalty: number;
  availability_multiplier: number;
  integrity_multiplier: number;
  final: number;
}

export interface RankedRow {
  candidate_id: string;
  rank: number;
  score: number;
  reasoning: string;
  name?: string;
  title?: string;
  company?: string;
  years?: number;
  breakdown: ScoreBreakdown;
  matchedCoreSkills: string[];
  flags: string[];
  isHoneypot: boolean;
}
