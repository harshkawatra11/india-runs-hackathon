"""
Score composition.

We separate "per-candidate" features (computed in features.py, integrity.py,
signals.py) from the one global, corpus-dependent feature: semantic similarity
to the JD (TF-IDF / dense), which rank.py computes in a vectorised pass and
injects here.

Final score:

    base       = weighted sum of [semantic, role, skill_trust, experience,
                                  company, location, education]   in [0, 1]
    final      = base * disqualifier_penalty
                      * availability_multiplier
                      * integrity_multiplier

The three multipliers encode, respectively, the JD's "we do NOT want" section,
its "are they actually available" note, and the honeypot defence. Keeping them
multiplicative means any single fatal problem (honeypot, off-track title) can
collapse an otherwise glossy profile - exactly the behaviour the JD asks for.
"""

from __future__ import annotations

from . import features as F
from .integrity import assess_integrity
from .rubric import BASE_WEIGHTS
from .signals import availability


def build_features(candidate: dict) -> dict:
    """Compute every per-candidate sub-score and fact (no corpus dependency)."""
    role_s, role_f = F.role_fit(candidate)
    skill_s, skill_f = F.skill_trust(candidate)
    exp_s, exp_f = F.experience_fit(candidate)
    comp_s, comp_f = F.company_fit(candidate)
    loc_s, loc_f = F.location_fit(candidate)
    edu_s, edu_f = F.education_fit(candidate)

    feats = {
        "role": {**role_f, "score": role_s},
        "skills": {**skill_f, "score": skill_s},
        "experience": {**exp_f, "score": exp_s},
        "company": {**comp_f, "score": comp_s},
        "location": {**loc_f, "score": loc_s},
        "education": {**edu_f, "score": edu_s},
    }

    penalty, dq_flags = F.disqualifiers(candidate, feats)
    avail_mult, avail_summary = availability(candidate)
    integ_mult, integ_flags = assess_integrity(candidate)

    feats["disqualifiers"] = {"penalty": penalty, "flags": dq_flags}
    feats["availability"] = {"multiplier": avail_mult, **avail_summary}
    feats["integrity"] = {"multiplier": integ_mult, "flags": integ_flags}
    return feats


def compose_score(feats: dict, semantic: float) -> tuple[float, dict]:
    """Combine per-candidate features with the injected semantic similarity."""
    components = {
        "semantic": max(0.0, min(1.0, semantic)),
        "role_fit": feats["role"]["score"],
        "skill_trust": feats["skills"]["score"],
        "experience": feats["experience"]["score"],
        "company": feats["company"]["score"],
        "location": feats["location"]["score"],
        "education": feats["education"]["score"],
    }
    base = sum(components[k] * BASE_WEIGHTS[k] for k in BASE_WEIGHTS)

    penalty = feats["disqualifiers"]["penalty"]
    avail = feats["availability"]["multiplier"]
    integ = feats["integrity"]["multiplier"]

    final = base * penalty * avail * integ
    # keep strictly within (0, 1]; availability can boost slightly above base.
    final = max(0.0, min(1.0, final))

    breakdown = {
        "base": round(base, 4),
        "components": {k: round(v, 4) for k, v in components.items()},
        "penalty": round(penalty, 3),
        "availability_multiplier": round(avail, 3),
        "integrity_multiplier": round(integ, 3),
        "final": round(final, 6),
    }
    return final, breakdown
