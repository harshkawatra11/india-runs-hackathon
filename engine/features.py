"""
Per-candidate feature extraction.

Everything here is cheap (no model inference) so it runs over 100k candidates in
seconds. Each function returns a sub-score in [0, 1] plus, where useful, small
facts the reasoning layer can quote.

The design follows the JD's own logic:
  * title is a gate against keyword-stuffers,
  * skills are only trusted when endorsed AND actually used (defuses stuffing),
  * company type separates product builders from pure services/consulting,
  * disqualifier flags encode the explicit "we do NOT want" section.
"""

from __future__ import annotations

from datetime import date

from . import rubric
from .rubric import (
    CONSULTING_SERVICES_FIRMS,
    EXP_IDEAL_HIGH,
    EXP_IDEAL_LOW,
    EXP_OK_HIGH,
    EXP_OK_LOW,
    INDIA_COUNTRY_NAMES,
    MODERATE_TITLE_TERMS,
    MUST_HAVE_SKILLS,
    NICE_TO_HAVE_SKILLS,
    NON_IC_OR_OFFTRACK_TITLES,
    PREFERRED_LOCATIONS,
    PRODUCT_TECH_FIRMS,
    REFERENCE_DATE,
    RESEARCH_ONLY_TITLES,
    STRONG_TITLE_TERMS,
    SUPPORTING_SKILLS,
    TIER1_INDIA_LOCATIONS,
)

_REF = date.fromisoformat(REFERENCE_DATE)

EDU_TIER_SCORE = {
    "tier_1": 1.0, "tier_2": 0.75, "tier_3": 0.5, "tier_4": 0.3, "unknown": 0.4,
}


def _contains_any(text: str, terms) -> bool:
    return any(t in text for t in terms)


def _count_matches(text: str, terms) -> int:
    return sum(1 for t in terms if t in text)


def candidate_text(candidate: dict) -> str:
    """Concatenated, lower-cased text blob used for semantic similarity."""
    p = candidate.get("profile", {}) or {}
    parts = [
        p.get("headline", ""), p.get("summary", ""), p.get("current_title", ""),
        p.get("current_industry", ""),
    ]
    for role in candidate.get("career_history", []) or []:
        parts.append(role.get("title", ""))
        parts.append(role.get("description", ""))
    for sk in candidate.get("skills", []) or []:
        parts.append(sk.get("name", ""))
    for edu in candidate.get("education", []) or []:
        parts.append(edu.get("field_of_study", ""))
    return " ".join(x for x in parts if x).lower()


# ---------------------------------------------------------------------------
# Role fit: title + career evidence of genuine ML / search / ranking work.
# ---------------------------------------------------------------------------
def role_fit(candidate: dict) -> tuple[float, dict]:
    p = candidate.get("profile", {}) or {}
    current_title = (p.get("current_title") or "").lower()
    career = candidate.get("career_history", []) or []

    # current-title classification
    if _contains_any(current_title, STRONG_TITLE_TERMS):
        title_score = 1.0
        title_class = "strong_ml"
    elif _contains_any(current_title, RESEARCH_ONLY_TITLES):
        title_score = 0.55
        title_class = "research"
    elif _contains_any(current_title, NON_IC_OR_OFFTRACK_TITLES):
        title_score = 0.10
        title_class = "off_track"
    elif _contains_any(current_title, MODERATE_TITLE_TERMS):
        title_score = 0.60
        title_class = "software"
    else:
        title_score = 0.30
        title_class = "other"

    # career evidence: did ANY past role carry a strong ML/search/ranking title
    # or describe building such a system? Rewards the "Tier 5" candidate whose
    # title is plain but whose history shows real systems work.
    evidence = 0.0
    build_terms = (
        "recommendation", "ranking", "search", "retrieval", "embedding",
        "relevance", "vector", "personalization", "semantic", "matching",
        "learning to rank", "recommender", "information retrieval",
    )
    for role in career:
        rtitle = (role.get("title") or "").lower()
        rdesc = (role.get("description") or "").lower()
        if _contains_any(rtitle, STRONG_TITLE_TERMS):
            evidence = max(evidence, 0.9)
        if _contains_any(rdesc, build_terms):
            # "built/designed/shipped a <ranking/search/recsys> system"
            verbs = ("built", "designed", "shipped", "developed", "owned", "led", "implemented")
            evidence = max(evidence, 0.85 if _contains_any(rdesc, verbs) else 0.6)

    score = 0.65 * title_score + 0.35 * evidence
    return score, {"title_class": title_class, "title_score": round(title_score, 2),
                   "career_evidence": round(evidence, 2)}


# ---------------------------------------------------------------------------
# Skill trust: matched core skills, weighted by how trustworthy each claim is.
# This is the primary defence against keyword stuffing.
# ---------------------------------------------------------------------------
_PROF_WEIGHT = {"expert": 1.0, "advanced": 0.85, "intermediate": 0.6, "beginner": 0.35}


def skill_trust(candidate: dict) -> tuple[float, dict]:
    skills = candidate.get("skills", []) or []
    sig = candidate.get("redrob_signals", {}) or {}
    assess = sig.get("skill_assessment_scores", {}) or {}
    assess_lc = {k.lower(): v for k, v in assess.items()}

    matched_core: list[str] = []
    trusted_value = 0.0
    nice_value = 0.0

    for sk in skills:
        name = (sk.get("name") or "").lower().strip()
        if not name:
            continue
        prof = (sk.get("proficiency") or "intermediate").lower()
        endorsements = sk.get("endorsements") or 0
        duration = sk.get("duration_months") or 0

        # trust factor: a skill is only as good as the evidence behind it.
        # endorsements + real months of use + (optional) assessment score.
        endorse_factor = min(endorsements / 25.0, 1.0)
        duration_factor = min(duration / 36.0, 1.0)
        assess_factor = None
        for akey, aval in assess_lc.items():
            if akey in name or name in akey:
                assess_factor = aval / 100.0
                break
        # a claimed skill with zero endorsements AND zero usage is barely trusted
        evidence = 0.45 * endorse_factor + 0.45 * duration_factor
        if assess_factor is not None:
            evidence = 0.7 * evidence + 0.3 * assess_factor
        trust = (0.35 + 0.65 * evidence) * _PROF_WEIGHT.get(prof, 0.6)

        is_core = name in MUST_HAVE_SKILLS or _contains_any(name, MUST_HAVE_SKILLS)
        is_nice = name in NICE_TO_HAVE_SKILLS or _contains_any(name, NICE_TO_HAVE_SKILLS)
        is_support = name in SUPPORTING_SKILLS or _contains_any(name, SUPPORTING_SKILLS)

        if is_core:
            matched_core.append(sk.get("name"))
            trusted_value += trust
        elif is_nice:
            nice_value += 0.5 * trust
        elif is_support:
            nice_value += 0.2 * trust

    # diminishing returns: 4-5 well-trusted core skills already saturate.
    core_component = 1.0 - pow(2.71828, -trusted_value / 2.2)
    nice_component = min(nice_value / 4.0, 1.0)
    score = min(1.0, 0.82 * core_component + 0.18 * nice_component)

    return score, {
        "matched_core_skills": matched_core[:8],
        "n_core": len(matched_core),
        "trusted_value": round(trusted_value, 2),
    }


# ---------------------------------------------------------------------------
# Experience: years band + recency of hands-on IC work.
# ---------------------------------------------------------------------------
def experience_fit(candidate: dict) -> tuple[float, dict]:
    p = candidate.get("profile", {}) or {}
    yoe = p.get("years_of_experience")
    if not isinstance(yoe, (int, float)):
        band = 0.4
    elif EXP_IDEAL_LOW <= yoe <= EXP_IDEAL_HIGH:
        band = 1.0
    elif EXP_OK_LOW <= yoe <= EXP_OK_HIGH:
        band = 0.85
    elif 3.0 <= yoe < EXP_OK_LOW:
        band = 0.55 + 0.30 * (yoe - 3.0) / (EXP_OK_LOW - 3.0)
    elif EXP_OK_HIGH < yoe <= 14.0:
        band = max(0.45, 0.85 - 0.06 * (yoe - EXP_OK_HIGH))
    elif yoe < 3.0:
        band = 0.30
    else:
        band = 0.35  # very senior - JD warns against pure "architect" drift

    # recency of hands-on code: is the current role an IC engineering role?
    current_title = (p.get("current_title") or "").lower()
    ic_now = _contains_any(current_title, STRONG_TITLE_TERMS | MODERATE_TITLE_TERMS)
    recency = 1.0 if ic_now else 0.6

    score = 0.8 * band + 0.2 * recency
    return score, {"years": yoe, "band": round(band, 2), "ic_now": ic_now}


# ---------------------------------------------------------------------------
# Company classification across the whole career.
# ---------------------------------------------------------------------------
def company_fit(candidate: dict) -> tuple[float, dict]:
    career = candidate.get("career_history", []) or []
    if not career:
        return 0.5, {"company_class": "unknown"}

    n = len(career)
    consulting = 0
    product = 0
    for role in career:
        comp = (role.get("company") or "").lower()
        ind = (role.get("industry") or "").lower()
        if _contains_any(comp, CONSULTING_SERVICES_FIRMS) or "it services" in ind or "consulting" in ind:
            consulting += 1
        if _contains_any(comp, PRODUCT_TECH_FIRMS) or "product" in ind or "saas" in ind:
            product += 1

    consulting_ratio = consulting / n
    if consulting_ratio >= 0.99:
        score, cls = 0.20, "consulting_only"
    elif product >= 1 and consulting_ratio < 0.5:
        score, cls = 0.95, "product_experience"
    elif consulting_ratio >= 0.6:
        score, cls = 0.45, "mostly_services"
    else:
        score, cls = 0.7, "mixed"

    return score, {"company_class": cls, "consulting_ratio": round(consulting_ratio, 2),
                   "product_roles": product}


# ---------------------------------------------------------------------------
# Location / relocation fit.
# ---------------------------------------------------------------------------
def location_fit(candidate: dict) -> tuple[float, dict]:
    p = candidate.get("profile", {}) or {}
    sig = candidate.get("redrob_signals", {}) or {}
    loc = (p.get("location") or "").lower()
    country = (p.get("country") or "").lower()
    relocate = bool(sig.get("willing_to_relocate"))

    if _contains_any(loc, PREFERRED_LOCATIONS):
        score, cls = 1.0, "preferred_city"
    elif _contains_any(loc, TIER1_INDIA_LOCATIONS):
        score, cls = 0.85, "tier1_india"
    elif country in INDIA_COUNTRY_NAMES:
        score, cls = 0.70 if not relocate else 0.78, "other_india"
    elif relocate:
        score, cls = 0.55, "outside_india_relocating"
    else:
        score, cls = 0.28, "outside_india_static"

    if cls in {"tier1_india", "other_india"} and relocate:
        score = min(1.0, score + 0.08)

    return score, {"location_class": cls, "willing_to_relocate": relocate}


def education_fit(candidate: dict) -> tuple[float, dict]:
    edu = candidate.get("education", []) or []
    if not edu:
        return 0.4, {"edu_tier": "none"}
    best = max(EDU_TIER_SCORE.get((e.get("tier") or "unknown"), 0.4) for e in edu)
    return best, {"edu_tier": round(best, 2)}


# ---------------------------------------------------------------------------
# Disqualifier flags -> multiplicative penalties (see rubric.PENALTY).
# ---------------------------------------------------------------------------
def disqualifiers(candidate: dict, feats: dict) -> tuple[float, list[str]]:
    p = candidate.get("profile", {}) or {}
    career = candidate.get("career_history", []) or []
    skills = candidate.get("skills", []) or []
    yoe = p.get("years_of_experience") or 0
    penalty = 1.0
    flags: list[str] = []

    # off-track current title (keyword stuffer in a non-eng seat)
    if feats["role"]["title_class"] == "off_track":
        penalty *= rubric.PENALTY["non_ic_title"]
        flags.append("current title is non-engineering")

    # entire career at services/consulting firms
    if feats["company"]["company_class"] == "consulting_only":
        penalty *= rubric.PENALTY["consulting_only"]
        flags.append("career entirely at services/consulting firms")

    # pure research, no product signal
    if feats["role"]["title_class"] == "research" and feats["company"]["product_roles"] == 0:
        penalty *= rubric.PENALTY["research_only"]
        flags.append("pure-research background without product deployment")

    # title-chasing: many short stints
    durations = [r.get("duration_months") or 0 for r in career]
    if len(career) >= 4 and durations:
        avg_tenure = sum(durations) / len(durations)
        if avg_tenure < 18:
            penalty *= rubric.PENALTY["title_chaser"]
            flags.append(f"short average tenure (~{avg_tenure:.0f} mo across {len(career)} roles)")

    # CV / speech / robotics without NLP / IR
    skill_names = " ".join((s.get("name") or "").lower() for s in skills)
    cv_terms = ("computer vision", "image classification", "opencv", "object detection",
                "speech recognition", "robotics", "slam", "lidar")
    nlp_terms = ("nlp", "natural language", "retrieval", "ranking", "search",
                 "embedding", "recommendation", "information retrieval", "llm")
    if _count_matches(skill_names, cv_terms) >= 2 and _count_matches(skill_names, nlp_terms) == 0:
        penalty *= rubric.PENALTY["cv_speech_only"]
        flags.append("vision/speech/robotics focus without NLP/IR")

    # LangChain-only junior: <3 yrs, framework-only, no real ML depth
    if yoe < 3 and ("langchain" in skill_names or "prompt engineering" in skill_names):
        core_n = feats["skills"]["n_core"]
        if core_n <= 1:
            penalty *= rubric.PENALTY["langchain_only_junior"]
            flags.append("junior, framework/prompt-only without retrieval/ranking depth")

    return penalty, flags
