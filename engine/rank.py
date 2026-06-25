"""
Ranking CLI - streams the candidate pool and emits a spec-exact top-100 CSV.

    python -m engine.rank --candidates candidates.jsonl --out submission.csv

Design goals (from submission_spec section 3):
  * CPU only, no network / hosted-LLM calls,
  * <= 5 minutes wall-clock, <= 16 GB RAM on the full 100k pool,
  * output: header + exactly 100 rows, unique ranks 1..100,
    score non-increasing with rank, ties broken by candidate_id ascending.

Semantic similarity is a blend of:
  * lexical TF-IDF cosine to the JD,
  * latent-semantic (TruncatedSVD / LSA) cosine - "beyond keywords" without a
    heavy model, fully offline and deterministic,
  * (optional) precomputed dense sentence-transformer cosine, loaded from a
    cached .npy produced offline by scripts/precompute_embeddings.py.

Everything else (role, skills, integrity, availability, ...) is per-candidate
and lives in the sibling modules.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import sys
import time
from pathlib import Path

import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize

from .features import candidate_text
from .reason import generate_reasoning
from .rubric import JD_QUERY_TEXT
from .score import build_features, compose_score

DEFAULT_DATA = (
    "[PUB] India_runs_data_and_ai_challenge/[PUB] India_runs_data_and_ai_challenge/"
    "India_runs_data_and_ai_challenge/candidates.jsonl"
)

# If this precomputed artifact exists it is used automatically, so the plain
# reproduce command yields the full hybrid (lexical + LSA + dense) with no extra
# flags; when it is absent the ranker falls back to lexical + LSA. Either path
# is CPU-only and network-free at rank time.
DEFAULT_EMBEDDINGS = "artifacts/dense_embeddings.npy"


def _open_stream(path: str):
    if path.endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8")
    return open(path, "r", encoding="utf-8")


def load_candidates(path: str):
    """Yield candidate dicts one at a time (constant memory over the file)."""
    with _open_stream(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def semantic_scores(texts: list[str], dense: np.ndarray | None,
                    dense_weight: float) -> np.ndarray:
    """Blend lexical TF-IDF, latent-semantic (LSA) and optional dense cosines."""
    corpus = [JD_QUERY_TEXT] + texts
    vec = TfidfVectorizer(
        sublinear_tf=True, ngram_range=(1, 2), min_df=2, max_df=0.6,
        max_features=60000, stop_words="english",
    )
    tfidf = vec.fit_transform(corpus)
    jd_vec = tfidf[0]
    cand_tfidf = tfidf[1:]

    # lexical cosine (rows are L2-normalised by TfidfVectorizer)
    lexical = np.asarray((cand_tfidf @ jd_vec.T).todense()).ravel()

    # latent-semantic cosine via TruncatedSVD (deterministic seed)
    k = min(200, tfidf.shape[1] - 1, tfidf.shape[0] - 1)
    if k >= 2:
        svd = TruncatedSVD(n_components=k, random_state=42)
        reduced = svd.fit_transform(tfidf)
        reduced = normalize(reduced)
        lsa = reduced[1:] @ reduced[0]
        lsa = np.clip(lsa, 0.0, None)
    else:
        lsa = lexical

    sem = 0.55 * lexical + 0.45 * lsa

    if dense is not None and dense_weight > 0:
        d = np.clip(dense, 0.0, None)
        sem = (1 - dense_weight) * sem + dense_weight * d

    # robust 0..1 scaling (95th percentile -> 1.0 so a few outliers don't crush
    # the rest of the distribution)
    hi = np.percentile(sem, 99) or 1.0
    return np.clip(sem / hi, 0.0, 1.0)


def load_dense(path: str | None, ids: list[str]):
    """Load precomputed dense cosine-to-JD scores, aligned to candidate ids."""
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        print(f"[warn] embeddings file {path} not found; using lexical+LSA only",
              file=sys.stderr)
        return None
    data = np.load(p, allow_pickle=True).item()
    sim = data.get("jd_cosine", {})  # {candidate_id: cosine}
    return np.array([float(sim.get(cid, 0.0)) for cid in ids], dtype=np.float32)


def rank(candidates_path: str, out_path: str, top_n: int = 100,
         embeddings_path: str | None = None, dense_weight: float = 0.5) -> dict:
    t0 = time.time()

    ids: list[str] = []
    texts: list[str] = []
    feats_list: list[dict] = []
    cards: list[dict] = []  # minimal facts needed for reasoning of survivors

    for cand in load_candidates(candidates_path):
        cid = cand.get("candidate_id")
        if not cid:
            continue
        feats = build_features(cand)
        ids.append(cid)
        texts.append(candidate_text(cand))
        feats_list.append(feats)
        p = cand.get("profile", {}) or {}
        cards.append({
            "candidate_id": cid,
            "profile": {
                "current_title": p.get("current_title"),
                "current_company": p.get("current_company"),
                "years_of_experience": p.get("years_of_experience"),
            },
        })

    n = len(ids)
    if n == 0:
        raise SystemExit("No candidates loaded - check --candidates path.")
    t_feat = time.time()

    dense = load_dense(embeddings_path, ids)
    sem = semantic_scores(texts, dense, dense_weight if dense is not None else 0.0)
    t_sem = time.time()

    scored = []
    for i in range(n):
        final, _ = compose_score(feats_list[i], float(sem[i]))
        scored.append((final, ids[i], i))

    # rank: score descending, then candidate_id ascending (spec tie-break)
    scored.sort(key=lambda x: (-x[0], x[1]))
    top = scored[:top_n]

    rows = []
    honeypots_in_top = 0
    for rank_pos, (score, cid, idx) in enumerate(top, start=1):
        reasoning = generate_reasoning(cards[idx], feats_list[idx], score)
        rows.append((cid, rank_pos, round(float(score), 6), reasoning))
        # cheap honeypot audit on survivors (re-derive from integrity multiplier)
        if feats_list[idx]["integrity"]["multiplier"] <= 0.12:
            honeypots_in_top += 1

    _write_csv(out_path, rows)
    t_done = time.time()

    stats = {
        "candidates": n,
        "written": len(rows),
        "honeypots_in_top": honeypots_in_top,
        "secs_features": round(t_feat - t0, 1),
        "secs_semantic": round(t_sem - t_feat, 1),
        "secs_total": round(t_done - t0, 1),
        "top_score": rows[0][2] if rows else None,
        "min_score": rows[-1][2] if rows else None,
        "used_dense": dense is not None,
    }
    return stats


def _write_csv(out_path: str, rows: list[tuple]) -> None:
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["candidate_id", "rank", "score", "reasoning"])
        for cid, rank_pos, score, reasoning in rows:
            w.writerow([cid, rank_pos, f"{score:.6f}", reasoning])


def main(argv=None):
    ap = argparse.ArgumentParser(description="Rank candidates for the Redrob JD.")
    ap.add_argument("--candidates", default=DEFAULT_DATA,
                    help="Path to candidates.jsonl[.gz]")
    ap.add_argument("--out", default="submission.csv", help="Output CSV path")
    ap.add_argument("--top", type=int, default=100, help="How many to rank")
    ap.add_argument("--embeddings", default=None,
                    help="Precomputed dense embeddings .npy (jd_cosine map). "
                         f"If omitted, auto-uses {DEFAULT_EMBEDDINGS} when present.")
    ap.add_argument("--no-dense", action="store_true",
                    help="Force lexical + LSA only, ignoring any embeddings artifact.")
    ap.add_argument("--dense-weight", type=float, default=0.5,
                    help="Weight of dense cosine in the semantic blend [0..1]")
    args = ap.parse_args(argv)

    embeddings = args.embeddings
    if not args.no_dense and embeddings is None and Path(DEFAULT_EMBEDDINGS).exists():
        embeddings = DEFAULT_EMBEDDINGS
        print(f"[info] using precomputed embeddings at {DEFAULT_EMBEDDINGS}")
    elif args.no_dense:
        embeddings = None

    stats = rank(args.candidates, args.out, args.top, embeddings, args.dense_weight)
    print(json.dumps(stats, indent=2))
    print(f"\nWrote {stats['written']} ranked rows to {args.out}")
    if stats["honeypots_in_top"]:
        print(f"[warn] {stats['honeypots_in_top']} suspected honeypot(s) in top "
              f"{args.top} - investigate before submitting.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
