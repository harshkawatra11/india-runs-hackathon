"""
Offline dense-embedding precompute (OPTIONAL enhancement).

The ranking step (engine/rank.py) is fully functional on lexical TF-IDF + LSA
alone and stays within the 5-minute / 16 GB / no-network budget. This script
adds an optional *dense* semantic signal using a small sentence-transformer,
computed ONCE, offline, and cached to disk. The submission spec explicitly
allows pre-computation to exceed the 5-minute window as long as the ranking
step that emits the CSV does not.

What it does:
  1. stream candidates.jsonl and build the same text blob engine.features uses,
  2. embed the JD and every candidate with all-MiniLM-L6-v2 on CPU,
  3. store cosine(candidate, JD) per candidate_id to artifacts/dense_embeddings.npy.

The ranker then loads that map with --embeddings and blends it into the
semantic score. If the file is absent, the ranker silently falls back to
lexical + LSA, so this step is never required to reproduce a valid submission.

Usage:
    python scripts/precompute_embeddings.py \
        --candidates candidates.jsonl \
        --out artifacts/dense_embeddings.npy \
        --model sentence-transformers/all-MiniLM-L6-v2
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np

# import the engine's text builder so the dense and lexical signals describe
# exactly the same candidate text.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine.features import candidate_text  # noqa: E402
from engine.rank import load_candidates  # noqa: E402
from engine.rubric import JD_QUERY_TEXT  # noqa: E402


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Precompute dense JD-cosine per candidate.")
    ap.add_argument("--candidates", required=True)
    ap.add_argument("--out", default="artifacts/dense_embeddings.npy")
    ap.add_argument("--model", default="sentence-transformers/all-MiniLM-L6-v2")
    ap.add_argument("--batch-size", type=int, default=256)
    args = ap.parse_args(argv)

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("sentence-transformers is not installed. Install it with:\n"
              "  pip install sentence-transformers\n"
              "The ranker works without this step (lexical + LSA fallback).",
              file=sys.stderr)
        return 1

    t0 = time.time()
    ids, texts = [], []
    for cand in load_candidates(args.candidates):
        cid = cand.get("candidate_id")
        if not cid:
            continue
        ids.append(cid)
        texts.append(candidate_text(cand))
    print(f"Loaded {len(ids)} candidates in {time.time() - t0:.1f}s")

    model = SentenceTransformer(args.model, device="cpu")
    jd_vec = model.encode([JD_QUERY_TEXT], normalize_embeddings=True)[0]

    cosines: dict[str, float] = {}
    t1 = time.time()
    for start in range(0, len(texts), args.batch_size):
        batch = texts[start:start + args.batch_size]
        emb = model.encode(batch, normalize_embeddings=True,
                           show_progress_bar=False, batch_size=args.batch_size)
        sims = emb @ jd_vec  # both L2-normalised -> cosine
        for cid, s in zip(ids[start:start + args.batch_size], sims):
            cosines[cid] = float(s)
        if start % (args.batch_size * 20) == 0:
            done = start + len(batch)
            print(f"  embedded {done}/{len(texts)} ({time.time() - t1:.0f}s)")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    np.save(out, {"jd_cosine": cosines, "model": args.model}, allow_pickle=True)
    print(f"Saved {len(cosines)} dense cosines to {out} "
          f"(total {time.time() - t0:.0f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
