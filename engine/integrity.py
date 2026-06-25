"""
Profile integrity / honeypot detection.

The dataset hides ~80 honeypots: "subtly impossible profiles (e.g. 8 years of
experience at a company founded 3 years ago; 'expert' proficiency in 10 skills
with 0 years used)". Ranking a honeypot in the top 100 hurts; >10% in the top
100 is an outright disqualification.

We do NOT special-case known honeypots. Instead we run cheap, general
consistency checks that a *real* recruiter reading the profile would apply, and
return a penalty multiplier plus the human-readable reasons that triggered it.

A candidate accrues "impossibility evidence". A single soft inconsistency is
tolerated (real data is messy); multiple or hard contradictions collapse the
score so the profile cannot surface near the top.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from .rubric import REFERENCE_DATE

_REF = date.fromisoformat(REFERENCE_DATE)


def _parse_date(value: Any) -> date | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _months_between(start: date, end: date) -> float:
    return (end.year - start.year) * 12 + (end.month - start.month) + (end.day - start.day) / 30.0


def assess_integrity(candidate: dict) -> tuple[float, list[str]]:
    """Return (penalty_multiplier in (0, 1], list_of_flags).

    1.0 means "no integrity concerns". Values approaching ~0.03 mean
    "almost certainly a honeypot / fabricated profile".
    """
    flags: list[str] = []
    hard = 0   # contradictions that are essentially impossible
    soft = 0   # individually-explainable oddities

    profile = candidate.get("profile", {}) or {}
    career = candidate.get("career_history", []) or []
    skills = candidate.get("skills", []) or []
    education = candidate.get("education", []) or []

    yoe = profile.get("years_of_experience")

    # --- 1. duration_months must agree with the actual start/end span --------
    total_role_months = 0.0
    earliest_start: date | None = None
    for role in career:
        start = _parse_date(role.get("start_date"))
        end = _parse_date(role.get("end_date")) or (_REF if role.get("is_current") else None)
        dur = role.get("duration_months")
        if start and (earliest_start is None or start < earliest_start):
            earliest_start = start
        if isinstance(dur, (int, float)):
            total_role_months += dur
        if start and end:
            span = _months_between(start, end)
            if dur is not None and span >= 0:
                # claimed tenure wildly exceeds the calendar span between the
                # dates -> "8 years at a company that span only allows 3".
                if dur > span + 14:
                    hard += 1
                    flags.append(
                        f"role '{role.get('title','?')}' claims {int(dur)} months "
                        f"but dates span only ~{int(span)} months"
                    )
            if end < start:
                hard += 1
                flags.append("a role ends before it starts")
        if start and start > _REF:
            hard += 1
            flags.append("a role starts in the future")

    # --- 2. stated years_of_experience vs career timeline --------------------
    if isinstance(yoe, (int, float)) and earliest_start is not None:
        career_span_years = _months_between(earliest_start, _REF) / 12.0
        # claims many years of experience but the earliest job is recent
        if yoe > career_span_years + 2.5:
            hard += 1
            flags.append(
                f"claims {yoe:.1f} yrs experience but career history only spans "
                f"~{career_span_years:.1f} yrs"
            )
    if isinstance(yoe, (int, float)) and total_role_months > 0:
        # sum of role tenures hugely exceeds plausible working life
        if total_role_months / 12.0 > yoe + 6:
            soft += 1
            flags.append("overlapping roles sum to far more time than stated experience")

    # --- 3. "expert in N skills with 0 months used" --------------------------
    senior_zero_use = 0
    for sk in skills:
        prof = (sk.get("proficiency") or "").lower()
        dur = sk.get("duration_months")
        if prof in {"advanced", "expert"} and isinstance(dur, (int, float)) and dur == 0:
            senior_zero_use += 1
    if senior_zero_use >= 5:
        hard += 1
        flags.append(f"{senior_zero_use} skills marked advanced/expert with 0 months of use")
    elif senior_zero_use >= 3:
        soft += 1
        flags.append(f"{senior_zero_use} 'advanced/expert' skills with 0 months of use")

    # --- 4. education sanity -------------------------------------------------
    for edu in education:
        sy, ey = edu.get("start_year"), edu.get("end_year")
        if isinstance(sy, int) and isinstance(ey, int) and ey < sy:
            soft += 1
            flags.append("an education entry ends before it starts")

    # --- 5. a single skill claiming more use than the whole career ----------
    if total_role_months > 0:
        for sk in skills:
            dur = sk.get("duration_months")
            if isinstance(dur, (int, float)) and dur > total_role_months + 18:
                soft += 1
                flags.append(
                    f"skill '{sk.get('name','?')}' claims more usage than the "
                    f"entire career length"
                )
                break

    # --- combine -------------------------------------------------------------
    # Hard contradictions are near-fatal; soft ones erode gradually.
    if hard >= 1:
        multiplier = 0.04 if hard >= 2 else 0.10
    elif soft >= 2:
        multiplier = 0.35
    elif soft == 1:
        multiplier = 0.80
    else:
        multiplier = 1.0

    return multiplier, flags


def is_honeypot(candidate: dict, threshold: float = 0.12) -> bool:
    """Convenience boolean used by tests / reporting."""
    multiplier, _ = assess_integrity(candidate)
    return multiplier <= threshold
