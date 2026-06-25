"""
Engine behaviour tests.

These encode the JD's intent as assertions:
  * honeypots collapse and never out-score real candidates,
  * keyword-stuffers in non-eng titles lose to genuine engineers,
  * consulting-only careers are down-weighted,
  * the CSV is spec-valid (validator passes), ties break by id ascending,
  * scores are non-increasing with rank.
"""

from __future__ import annotations

import csv
import importlib.util
import json
from pathlib import Path

import pytest

from engine.integrity import assess_integrity, is_honeypot
from engine.rank import rank
from engine.reason import generate_reasoning
from engine.score import build_features, compose_score
from engine.tests import factories as fac

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR_PATH = (
    ROOT / "[PUB] India_runs_data_and_ai_challenge"
    / "[PUB] India_runs_data_and_ai_challenge"
    / "India_runs_data_and_ai_challenge" / "validate_submission.py"
)


def _final(candidate, semantic=0.5):
    feats = build_features(candidate)
    score, _ = compose_score(feats, semantic)
    return score, feats


# --------------------------------------------------------------------------- #
# Honeypot / integrity
# --------------------------------------------------------------------------- #
def test_honeypot_detected():
    hp = fac.honeypot_impossible()
    mult, flags = assess_integrity(hp)
    assert mult <= 0.12, f"honeypot not collapsed (mult={mult}, flags={flags})"
    assert is_honeypot(hp)
    assert flags, "honeypot should report human-readable flags"


def test_clean_profile_not_flagged():
    clean = fac.strong_ml_candidate()
    mult, _ = assess_integrity(clean)
    assert mult == 1.0


def test_honeypot_loses_to_real_candidate():
    hp_score, _ = _final(fac.honeypot_impossible(), semantic=0.9)
    real_score, _ = _final(fac.strong_ml_candidate(), semantic=0.9)
    assert hp_score < real_score
    assert hp_score < 0.1


# --------------------------------------------------------------------------- #
# Keyword stuffing / title gate
# --------------------------------------------------------------------------- #
def test_keyword_stuffer_beaten_by_engineer():
    stuffer_score, sf = _final(fac.keyword_stuffer(), semantic=0.85)
    eng_score, _ = _final(fac.strong_ml_candidate(), semantic=0.85)
    assert stuffer_score < eng_score
    assert "current title is non-engineering" in sf["disqualifiers"]["flags"]


def test_skill_trust_discounts_zero_usage():
    # the stuffer's 5 "expert" skills all have 0 endorsements & 0 months used
    _, sf = _final(fac.keyword_stuffer())
    _, ef = _final(fac.strong_ml_candidate())
    assert sf["skills"]["score"] < ef["skills"]["score"]


# --------------------------------------------------------------------------- #
# Company classification
# --------------------------------------------------------------------------- #
def test_consulting_only_penalised():
    _, cf = _final(fac.consulting_only())
    assert cf["company"]["company_class"] == "consulting_only"
    assert "career entirely at services/consulting firms" in cf["disqualifiers"]["flags"]


# --------------------------------------------------------------------------- #
# Reasoning quality
# --------------------------------------------------------------------------- #
def test_reasoning_is_grounded_and_varied():
    cands = [fac.strong_ml_candidate(f"CAND_{i:07d}") for i in (1, 2, 3)]
    # vary years so reasoning differs
    for i, c in enumerate(cands):
        c["profile"]["years_of_experience"] = 6.0 + i
    texts = []
    for c in cands:
        score, feats = _final(c, 0.8)
        texts.append(generate_reasoning(c, feats, score))
    # grounded: mentions the real title
    assert all("Machine Learning Engineer" in t for t in texts)
    # varied: not all identical
    assert len(set(texts)) == len(texts)


def test_reasoning_flags_concern_for_weak_candidate():
    stuffer = fac.keyword_stuffer()
    score, feats = _final(stuffer, 0.3)
    text = generate_reasoning(stuffer, feats, score)
    assert "Note:" in text  # honest concern surfaced


# --------------------------------------------------------------------------- #
# End-to-end CSV / validator / ordering
# --------------------------------------------------------------------------- #
def _load_validator():
    spec = importlib.util.spec_from_file_location("validate_submission", VALIDATOR_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture()
def pool_file(tmp_path):
    pool = fac.make_pool(120)
    p = tmp_path / "pool.jsonl"
    with open(p, "w", encoding="utf-8") as f:
        for c in pool:
            f.write(json.dumps(c) + "\n")
    return p


def test_submission_is_spec_valid(pool_file, tmp_path):
    out = tmp_path / "team_test.csv"
    stats = rank(str(pool_file), str(out), top_n=100)
    assert stats["written"] == 100

    validator = _load_validator()
    errors = validator.validate_submission(str(out))
    assert errors == [], f"validator errors: {errors}"


def test_scores_non_increasing_and_tiebreak(pool_file, tmp_path):
    out = tmp_path / "team_test.csv"
    rank(str(pool_file), str(out), top_n=100)
    with open(out, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    scores = [float(r["score"]) for r in rows]
    assert all(scores[i] >= scores[i + 1] for i in range(len(scores) - 1))
    # ranks are 1..100 unique
    ranks = sorted(int(r["rank"]) for r in rows)
    assert ranks == list(range(1, 101))
    # tie-break: equal adjacent scores must be candidate_id ascending
    for i in range(len(rows) - 1):
        if float(rows[i]["score"]) == float(rows[i + 1]["score"]):
            assert rows[i]["candidate_id"] < rows[i + 1]["candidate_id"]
