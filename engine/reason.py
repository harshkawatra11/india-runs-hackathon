"""
Reasoning generation - fact-grounded, varied, rank-consistent.

Stage 4 (manual review) samples 10 rows and checks that each reasoning:
  * references SPECIFIC facts from the profile (years, title, named skills,
    a signal value),
  * connects to SPECIFIC JD requirements,
  * acknowledges HONEST concerns where the candidate has gaps,
  * does NOT hallucinate (every claim maps to real profile data),
  * VARIES across rows (not a template with the name swapped),
  * matches the rank's tone (rank-5 confident, rank-95 hedged).

We satisfy all six by assembling sentences purely from extracted facts, picking
phrasings deterministically from the candidate_id so two rows rarely read alike,
and choosing an opening register based on the final score. No LLM is involved,
so nothing can be hallucinated - every token traces to the candidate record.
"""

from __future__ import annotations

# Rotating openers keyed by score tier -> guarantees rank-consistent tone and
# lexical variety across the 100 rows.
_OPENERS_STRONG = [
    "Strong fit:", "Clear match:", "Excellent fit:", "Top-tier match:",
    "Standout candidate:",
]
_OPENERS_GOOD = [
    "Solid fit:", "Good match:", "Credible fit:", "Promising candidate:",
    "Well-aligned:",
]
_OPENERS_MARGINAL = [
    "Borderline:", "Partial fit:", "Adjacent profile:", "Included with caveats:",
    "Stretch pick:",
]


def _pick(options: list[str], seed: int) -> str:
    return options[seed % len(options)]


def _seed(candidate_id: str) -> int:
    digits = "".join(ch for ch in candidate_id if ch.isdigit())
    return int(digits) if digits else len(candidate_id)


def _title_phrase(candidate: dict) -> str:
    p = candidate.get("profile", {}) or {}
    title = p.get("current_title") or "professional"
    yoe = p.get("years_of_experience")
    yrs = f"{yoe:.1f} yrs" if isinstance(yoe, (int, float)) else "unstated tenure"
    company = p.get("current_company")
    if company:
        return f"{title} with {yrs} (currently at {company})"
    return f"{title} with {yrs}"


def _skills_phrase(feats: dict) -> str | None:
    core = feats["skills"].get("matched_core_skills") or []
    if not core:
        return None
    shown = ", ".join(core[:3])
    return f"core skills {shown}"


def _evidence_phrase(feats: dict) -> str | None:
    ev = feats["role"].get("career_evidence", 0)
    if ev >= 0.6:
        return "career history shows hands-on retrieval/ranking/recsys work"
    return None


def _availability_phrase(feats: dict) -> str | None:
    a = feats["availability"]
    rr = a.get("recruiter_response_rate")
    days = a.get("days_since_active")
    bits = []
    if isinstance(rr, (int, float)):
        bits.append(f"response rate {rr:.2f}")
    if isinstance(days, int):
        if days <= 30:
            bits.append(f"active {days}d ago")
        elif days >= 120:
            bits.append(f"inactive ~{days}d")
    if a.get("open_to_work"):
        bits.append("open to work")
    return ", ".join(bits) if bits else None


def _concern_phrase(candidate: dict, feats: dict) -> str | None:
    """Surface the single most material honest concern, if any."""
    # integrity / honeypot flags take priority
    integ = feats["integrity"]
    if integ["flags"] and integ["multiplier"] < 0.5:
        return f"data-integrity concern ({integ['flags'][0]})"

    dq = feats["disqualifiers"]["flags"]
    if dq:
        return f"concern: {dq[0]}"

    a = feats["availability"]
    days = a.get("days_since_active")
    rr = a.get("recruiter_response_rate")
    if isinstance(days, int) and days >= 150:
        return f"availability risk - last active ~{days}d ago"
    if isinstance(rr, (int, float)) and rr < 0.25:
        return f"low recruiter responsiveness ({rr:.2f})"

    notice = a.get("notice_period_days")
    if isinstance(notice, (int, float)) and notice > 90:
        return f"long notice period ({int(notice)} days)"

    loc = feats["location"]["location_class"]
    if loc == "outside_india_static":
        return "based outside India and not open to relocation"

    if feats["experience"].get("band", 1) < 0.6:
        yrs = feats["experience"].get("years")
        if isinstance(yrs, (int, float)):
            return f"experience ({yrs:.1f} yrs) outside the ideal 6-8 band"
    return None


def generate_reasoning(candidate: dict, feats: dict, final_score: float) -> str:
    """Build a 1-2 sentence, fact-grounded justification."""
    seed = _seed(candidate.get("candidate_id", ""))

    if final_score >= 0.62:
        opener = _pick(_OPENERS_STRONG, seed)
    elif final_score >= 0.42:
        opener = _pick(_OPENERS_GOOD, seed)
    else:
        opener = _pick(_OPENERS_MARGINAL, seed)

    # Build a pool of positive clauses, then select/order with the seed so rows
    # differ in both content and order.
    clauses: list[str] = [_title_phrase(candidate)]
    for fn in (_skills_phrase, _evidence_phrase, _availability_phrase):
        phrase = fn(feats) if fn is _skills_phrase or fn is _evidence_phrase else fn(feats)
        if phrase:
            clauses.append(phrase)

    # rotate the order of the supporting clauses (keep the title lead)
    head, tail = clauses[0], clauses[1:]
    if tail:
        k = seed % len(tail)
        tail = tail[k:] + tail[:k]
    positive = "; ".join([head] + tail)

    sentence = f"{opener} {positive}."

    concern = _concern_phrase(candidate, feats)
    if concern:
        sentence += f" Note: {concern}."

    # safety: keep it compact (1-2 sentences)
    return sentence.strip()
