"""
Behavioural availability modifier.

The JD is explicit: "a perfect-on-paper candidate who hasn't logged in for 6
months and has a 5% recruiter response rate is, for hiring purposes, not
actually available. Down-weight them appropriately."

So the 23 redrob_signals do not create a candidate's score - they *modulate*
it. A strong profile with poor availability is discounted; a strong profile
that is active, responsive and open-to-work gets a small boost.

Returns a multiplier in roughly [AVAIL_MIN, AVAIL_MAX] plus a compact summary
dict that the reasoning layer can quote ("response rate 0.82, active 4 days ago").
"""

from __future__ import annotations

from datetime import date

from .rubric import AVAIL_MAX, AVAIL_MIN, REFERENCE_DATE

_REF = date.fromisoformat(REFERENCE_DATE)


def _days_since(value) -> int | None:
    if not value or not isinstance(value, str):
        return None
    try:
        d = date.fromisoformat(value[:10])
    except ValueError:
        return None
    return (_REF - d).days


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def availability(candidate: dict) -> tuple[float, dict]:
    sig = candidate.get("redrob_signals", {}) or {}

    # Each sub-score is in [0, 1]; we then map their weighted blend onto the
    # [AVAIL_MIN, AVAIL_MAX] multiplier band.
    parts: dict[str, float] = {}

    # 1. Recency of activity (most important availability signal).
    days = _days_since(sig.get("last_active_date"))
    if days is None:
        parts["recency"] = 0.5
    elif days <= 7:
        parts["recency"] = 1.0
    elif days <= 30:
        parts["recency"] = 0.9
    elif days <= 90:
        parts["recency"] = 0.65
    elif days <= 180:
        parts["recency"] = 0.35
    else:
        parts["recency"] = 0.12

    # 2. Recruiter responsiveness.
    rr = sig.get("recruiter_response_rate")
    parts["response"] = _clamp(float(rr), 0.0, 1.0) if isinstance(rr, (int, float)) else 0.5

    # 3. Explicitly open to work.
    parts["open"] = 1.0 if sig.get("open_to_work_flag") else 0.45

    # 4. Notice period (JD prefers sub-30-day; >90 raises the bar).
    notice = sig.get("notice_period_days")
    if isinstance(notice, (int, float)):
        if notice <= 30:
            parts["notice"] = 1.0
        elif notice <= 60:
            parts["notice"] = 0.8
        elif notice <= 90:
            parts["notice"] = 0.6
        else:
            parts["notice"] = 0.4
    else:
        parts["notice"] = 0.6

    # 5. Follow-through: do they actually complete interviews they start?
    icr = sig.get("interview_completion_rate")
    parts["interview"] = _clamp(float(icr), 0.0, 1.0) if isinstance(icr, (int, float)) else 0.6

    # 6. Demand / verification (light touch - recruiters saving them, verified).
    saved = sig.get("saved_by_recruiters_30d") or 0
    demand = _clamp(saved / 20.0, 0.0, 1.0)
    verified = 0.5 * bool(sig.get("verified_email")) + 0.5 * bool(sig.get("verified_phone"))
    parts["trust"] = 0.6 * demand + 0.4 * verified

    weights = {
        "recency": 0.34,
        "response": 0.24,
        "open": 0.16,
        "notice": 0.10,
        "interview": 0.10,
        "trust": 0.06,
    }
    blend = sum(parts[k] * w for k, w in weights.items())

    multiplier = AVAIL_MIN + (AVAIL_MAX - AVAIL_MIN) * blend

    summary = {
        "days_since_active": days,
        "recruiter_response_rate": rr if isinstance(rr, (int, float)) else None,
        "open_to_work": bool(sig.get("open_to_work_flag")),
        "notice_period_days": notice if isinstance(notice, (int, float)) else None,
        "availability_blend": round(blend, 3),
        "availability_multiplier": round(multiplier, 3),
    }
    return multiplier, summary
