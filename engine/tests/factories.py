"""Synthetic candidate builders for tests - small, explicit, no real data."""

from __future__ import annotations

import copy


def base_candidate(cid: str = "CAND_0000001") -> dict:
    """A plausible mid-strength candidate that all tests mutate from."""
    return {
        "candidate_id": cid,
        "profile": {
            "anonymized_name": "Test Person",
            "headline": "Software Engineer",
            "summary": "Builds backend systems and data pipelines.",
            "location": "Bangalore",
            "country": "India",
            "years_of_experience": 6.0,
            "current_title": "Software Engineer",
            "current_company": "Acme Corp",
            "current_company_size": "201-500",
            "current_industry": "Software",
        },
        "career_history": [
            {
                "company": "Acme Corp", "title": "Software Engineer",
                "start_date": "2021-01-01", "end_date": None,
                "duration_months": 66, "is_current": True, "industry": "Software",
                "company_size": "201-500", "description": "Backend services.",
            }
        ],
        "education": [
            {"institution": "Some University", "degree": "B.Tech",
             "field_of_study": "Computer Science", "start_year": 2014,
             "end_year": 2018, "grade": "8.0", "tier": "tier_2"}
        ],
        "skills": [
            {"name": "Python", "proficiency": "advanced", "endorsements": 20,
             "duration_months": 60},
        ],
        "certifications": [],
        "languages": [],
        "redrob_signals": {
            "profile_completeness_score": 90, "signup_date": "2022-01-01",
            "last_active_date": "2026-06-20", "open_to_work_flag": True,
            "profile_views_received_30d": 40, "applications_submitted_30d": 5,
            "recruiter_response_rate": 0.8, "avg_response_time_hours": 6,
            "skill_assessment_scores": {"Python": 85}, "connection_count": 300,
            "endorsements_received": 50, "notice_period_days": 30,
            "expected_salary_range_inr_lpa": {"min": 30, "max": 45},
            "preferred_work_mode": "hybrid", "willing_to_relocate": True,
            "github_activity_score": 60, "search_appearance_30d": 30,
            "saved_by_recruiters_30d": 8, "interview_completion_rate": 0.9,
            "offer_acceptance_rate": 0.5, "verified_email": True,
            "verified_phone": True, "linkedin_connected": True,
        },
    }


def strong_ml_candidate(cid: str = "CAND_0000002") -> dict:
    c = base_candidate(cid)
    c["profile"].update({
        "headline": "Senior ML Engineer | Search & Ranking",
        "summary": "Built embeddings-based retrieval and learning-to-rank "
                   "systems serving recommendations to millions at a product company.",
        "location": "Pune", "current_title": "Machine Learning Engineer",
        "current_company": "Flipkart", "current_industry": "E-commerce",
        "years_of_experience": 7.0,
    })
    c["career_history"] = [
        {"company": "Flipkart", "title": "Machine Learning Engineer",
         "start_date": "2020-01-01", "end_date": None, "duration_months": 78,
         "is_current": True, "industry": "E-commerce", "company_size": "10001+",
         "description": "Built and shipped a semantic search and recommendation "
                        "ranking system using embeddings and FAISS; designed NDCG "
                        "evaluation."},
    ]
    c["skills"] = [
        {"name": "Embeddings", "proficiency": "expert", "endorsements": 40, "duration_months": 60},
        {"name": "FAISS", "proficiency": "advanced", "endorsements": 30, "duration_months": 48},
        {"name": "Learning to Rank", "proficiency": "advanced", "endorsements": 25, "duration_months": 40},
        {"name": "Python", "proficiency": "expert", "endorsements": 50, "duration_months": 84},
        {"name": "NLP", "proficiency": "advanced", "endorsements": 35, "duration_months": 50},
    ]
    c["redrob_signals"]["skill_assessment_scores"] = {
        "Embeddings": 92, "FAISS": 88, "Python": 95, "NLP": 90}
    return c


def keyword_stuffer(cid: str = "CAND_0000003") -> dict:
    """All the AI keywords as skills, but a non-engineering title."""
    c = base_candidate(cid)
    c["profile"].update({
        "headline": "HR Manager | AI enthusiast",
        "current_title": "HR Manager", "current_industry": "Human Resources",
        "summary": "Human resources leader interested in AI.",
    })
    c["career_history"] = [
        {"company": "Acme Corp", "title": "HR Manager", "start_date": "2019-01-01",
         "end_date": None, "duration_months": 90, "is_current": True,
         "industry": "Human Resources", "company_size": "201-500",
         "description": "Managed recruitment and HR operations."},
    ]
    c["skills"] = [
        {"name": "Embeddings", "proficiency": "expert", "endorsements": 0, "duration_months": 0},
        {"name": "FAISS", "proficiency": "expert", "endorsements": 0, "duration_months": 0},
        {"name": "RAG", "proficiency": "expert", "endorsements": 0, "duration_months": 0},
        {"name": "LLM", "proficiency": "expert", "endorsements": 0, "duration_months": 0},
        {"name": "Vector Search", "proficiency": "expert", "endorsements": 0, "duration_months": 0},
    ]
    return c


def honeypot_impossible(cid: str = "CAND_0000004") -> dict:
    """Subtly impossible: claims 8 yrs but earliest role started 2 yrs ago,
    and a role claiming 96 months over a 24-month span."""
    c = strong_ml_candidate(cid)
    c["profile"]["years_of_experience"] = 8.0
    c["career_history"] = [
        {"company": "NewCo", "title": "Machine Learning Engineer",
         "start_date": "2024-06-01", "end_date": None, "duration_months": 96,
         "is_current": True, "industry": "Software", "company_size": "11-50",
         "description": "Built ranking systems."},
    ]
    # also: many expert skills with zero usage
    for s in c["skills"]:
        s["proficiency"] = "expert"
        s["duration_months"] = 0
    return c


def consulting_only(cid: str = "CAND_0000005") -> dict:
    c = strong_ml_candidate(cid)
    c["profile"].update({"current_company": "Infosys", "current_industry": "IT Services"})
    c["career_history"] = [
        {"company": "Infosys", "title": "Software Engineer", "start_date": "2018-01-01",
         "end_date": None, "duration_months": 100, "is_current": True,
         "industry": "IT Services", "company_size": "10001+",
         "description": "Worked on client projects."},
        {"company": "TCS", "title": "Systems Engineer", "start_date": "2016-01-01",
         "end_date": "2018-01-01", "duration_months": 24, "is_current": False,
         "industry": "IT Services", "company_size": "10001+",
         "description": "Client delivery."},
    ]
    return c


def make_pool(n: int = 120) -> list[dict]:
    """A pool with unique ids for end-to-end CSV/validator tests."""
    pool = []
    archetypes = [strong_ml_candidate, base_candidate, keyword_stuffer,
                  consulting_only]
    for i in range(n):
        cid = f"CAND_{i+1:07d}"
        c = copy.deepcopy(archetypes[i % len(archetypes)](cid))
        c["candidate_id"] = cid
        # nudge experience so scores differ a little
        c["profile"]["years_of_experience"] = 4.0 + (i % 7)
        pool.append(c)
    return pool
