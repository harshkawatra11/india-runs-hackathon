<div align="center">

# 🧭 india-runs-hackathon

### The AI recruiter that reasons **beyond keywords**

An explainable, deterministic, **CPU-only** candidate-ranking engine for the
**Redrob Intelligent Candidate Discovery & Ranking Challenge**.
It reads **100,000** candidate profiles against a nuanced *Senior AI Engineer*
job description and returns an expertly-ranked **top-100 shortlist** — with a
defensible, fact-grounded reason for every pick — in **~85 seconds** on a laptop
CPU with **no network and no LLM calls**.

[![CI](https://img.shields.io/badge/CI-engine%20tests%20%2B%20web%20build-7c5cff)](.github/workflows/ci.yml)
![CPU only](https://img.shields.io/badge/compute-CPU%20only-22d3ee)
![No network at rank time](https://img.shields.io/badge/network-off%20at%20rank%20time-34d399)
![Runtime](https://img.shields.io/badge/100k%20pool-~85s-fbbf24)
![Honeypots in top-100](https://img.shields.io/badge/honeypots%20in%20top--100-0-34d399)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## TL;DR

| | |
|---|---|
| **Pool size** | 100,000 candidates (`candidates.jsonl`, 487 MB) |
| **Output** | spec-exact top-100 CSV (`candidate_id,rank,score,reasoning`) |
| **Runtime (full pool)** | **~85 s** on CPU (hybrid w/ dense; ~98 s lexical fallback) |
| **Compute** | CPU-only, **no GPU**, **no network**, **no LLM calls** at rank time — well inside the 5-min / 16-GB budget |
| **Honeypots in top-100** | **0** |
| **Explainability** | every rank ships a fact-grounded, non-hallucinated, rank-consistent reason |
| **Live demo** | **[india-runs-hackathon.vercel.app](https://india-runs-hackathon.vercel.app)** — a Next.js sandbox running the *same* logic |

> The naïve approach — embed every profile, embed the JD, sort by cosine — is a
> **trap the organizers built on purpose**. This system is engineered to read the
> gap between what the JD *says* and what it *means*.

---

## The problem in one paragraph

Redrob is hiring a founding *Senior AI Engineer*. The JD is deliberately
human: it rewards people who **shipped real retrieval/ranking/recsys systems at
product companies**, and it explicitly **rejects** keyword-stuffers, pure
researchers, LangChain-only juniors, title-chasers, and entire-career
consulting profiles. The 100k pool is seeded with **traps**: candidates with all
the right AI keywords but the wrong job, brilliant-on-paper people who haven't
logged in for six months, and **~80 honeypots** with subtly impossible profiles.
Rank honeypots into your top-10 and you've proven your system can't read a
profile; put >10% in your top-100 and you're disqualified. **Judgment, not
filtering, is the whole game.**

## How we beat each trap

| Trap | Our defense |
|------|-------------|
| **Keyword stuffer** (`HR Manager` listing 9 AI skills) | **Title is a gate, not a feature.** A non-engineering current title collapses role-fit and triggers a disqualifier penalty. |
| **Lazy keyword stuffing** | **Skills are trusted only when endorsed *and* actually used** (`endorsements × duration_months × assessment_score`). A claimed "expert" skill with 0 endorsements and 0 months counts for almost nothing. |
| **Plain-language Tier-5** (built a recommender but never wrote "RAG") | **Career-evidence scoring** reads role descriptions for systems actually built, so substance beats vocabulary. |
| **Consulting-only careers** (TCS/Infosys/…) | A company-type classifier down-weights entire-career services/consulting profiles, exactly as the JD demands. |
| **Brilliant but unavailable** | A **behavioural availability multiplier** (last-active recency, recruiter response rate, open-to-work, notice period) modulates — never creates — the score. |
| **~80 honeypots** (8 yrs at a 3-yr-old company; expert in 10 skills with 0 months used) | A general **integrity check** flags impossible date spans, experience-math contradictions and zero-usage seniority, collapsing the score. **No special-casing** — just consistency a real recruiter would apply. |

---

## How it works

Six transparent, auditable stages. Every weight and rule lives in
[`engine/rubric.py`](engine/rubric.py) so a reviewer can read exactly what the
system believes the role rewards and penalises.

```
candidates.jsonl  (100,000 profiles, streamed line-by-line)
        │
        ▼
  FEATURE EXTRACTION ───┬── role / title gate            (engine/features.py)
                        ├── skill-trust  (endorse × duration × assessment)
                        ├── company type / location / experience band
  INTEGRITY CHECK ──────┤── honeypot consistency          (engine/integrity.py)
  AVAILABILITY ─────────┘── recency, response, open-to-work, notice (engine/signals.py)
        │
        ▼
  SEMANTIC ENGINE :  TF-IDF  +  LSA  ( + optional MiniLM dense, precomputed )
        │
        ▼
  SCORE COMPOSITION :  base × penalty × availability × integrity   (engine/score.py)
        │
        ▼
  RANK + tie-break → top-100 → grounded reasoning → submission.csv  (engine/rank.py)
                        │
                        └─► Next.js + Vercel sandbox (same logic, ported to TypeScript)
```

**The scoring formula:**

```
base   = 0.26·semantic + 0.24·role_fit + 0.20·skill_trust + 0.12·experience
       + 0.10·company   + 0.05·location + 0.03·education            ∈ [0,1]

final  = base × disqualifier_penalty × availability_multiplier × integrity_multiplier
```

The three modifiers are **multiplicative on purpose**: any single fatal problem
(an off-track title, a honeypot, a six-months-dead profile) collapses an
otherwise glossy candidate — the behaviour the JD explicitly asks for.

**Semantic similarity** is a hybrid that stays fully offline and deterministic:
lexical **TF-IDF** + latent-semantic **LSA** (`TruncatedSVD`) — and, optionally, a
**MiniLM dense** cosine *precomputed offline* and cached to disk, so the timed
ranking step never touches the network.

---

## Quickstart

```bash
# 1. install (core engine only — numpy + scikit-learn)
pip install -r requirements.txt

# 2. reproduce the submission CSV from the candidate pool (~85s, CPU, no network)
python -m engine.rank --candidates ./candidates.jsonl --out submission.csv

# 3. validate against the official format checker
python "[PUB] India_runs_data_and_ai_challenge/.../validate_submission.py" submission.csv
#   → Submission is valid.
```

> `candidates.jsonl` is the file shipped in the hackathon bundle (or `gunzip` the
> provided `.gz`). The ranker also accepts a `.jsonl.gz` path directly.

The repo ships a small **precomputed dense-embedding cache**
(`artifacts/dense_embeddings.npy`, 2.4 MB) which the ranker **auto-loads** to add
a MiniLM semantic signal — still fully offline at rank time. Two robust paths:

```bash
# default: full hybrid (lexical + LSA + dense), auto-uses the committed cache (~85s)
python -m engine.rank --candidates ./candidates.jsonl --out submission.csv

# fallback: lexical + LSA only, needs no artifact at all (~98s)
python -m engine.rank --candidates ./candidates.jsonl --out submission.csv --no-dense
```

To regenerate the cache from scratch (offline, ~1 hr on CPU — a pre-computation,
*not* part of the timed ranking step):

```bash
pip install sentence-transformers
python scripts/precompute_embeddings.py --candidates ./candidates.jsonl \
    --out artifacts/dense_embeddings.npy
```

---

## Results (full 100k run)

```
{ "candidates": 100000, "written": 100, "honeypots_in_top": 0, "used_dense": true,
  "secs_features": 40.8, "secs_semantic": 44.0, "secs_total": 85.4,
  "top_score": 0.984, "min_score": 0.795 }
```

A sample of the top of the shortlist (titles/companies are real values from the
pool; reasoning is generated verbatim by the engine):

| Rank | Score | Who | Why (engine-generated) |
|---|---|---|---|
| 1 | 0.984 | Staff ML Engineer, 7.0 yrs @ Paytm | core skills Semantic Search, Pinecone, BM25; hands-on retrieval/ranking work; response rate 0.95, active 29d ago, open to work |
| 2 | 0.954 | Senior AI Engineer, 5.9 yrs @ Apple | FAISS, OpenSearch, Weaviate; retrieval/ranking evidence; responsive, open to work |
| 5 | 0.907 | Search Engineer, 7.6 yrs @ Sarvam AI | Milvus, Semantic Search, Weaviate; strong availability |
| 11 | 0.890 | Senior AI Engineer, 7.9 yrs @ Meta | BM25, NLP, Python; retrieval/ranking evidence |

Meanwhile the sample dataset's planted **`HR Manager` with 9 AI skills** — the
"obvious" cosine-search #1 — is correctly **buried**.

---

## Explainability (built for Stage-4 review)

Every reasoning string is assembled **only** from the candidate's real fields —
years, current title, named matched skills, a concrete signal value — and an
**honest concern** when a gap exists. Because no LLM is involved, nothing can be
hallucinated: every claim traces to the profile. Reasonings are **varied** per
row (phrasing is seeded from the candidate id) and **rank-consistent** in tone
(rank-5 confident, rank-95 hedged). This directly satisfies the six manual-review
checks in the spec — specific facts, JD connection, honest concerns, no
hallucination, variation, rank consistency.

---

## Project structure

```
india-runs-hackathon/
├── engine/                     # the scored ranking engine (Python, CPU-only)
│   ├── rubric.py               #   JD encoded as weights / keyword sets / rules
│   ├── features.py             #   role-fit, skill-trust, company, location, …
│   ├── integrity.py            #   honeypot / impossible-profile detection
│   ├── signals.py              #   behavioural availability modifier
│   ├── score.py                #   score composition
│   ├── reason.py               #   fact-grounded, varied, rank-consistent text
│   ├── rank.py                 #   streaming CLI → spec-exact top-100 CSV
│   └── tests/                  #   pytest: honeypot, stuffer, tie-break, validity
├── scripts/
│   ├── precompute_embeddings.py#   OPTIONAL offline dense embeddings (MiniLM)
│   └── build_deck.py           #   fills the deck from the mandatory template
├── web/                        # Next.js 15 + Tailwind sandbox (Vercel)
│   ├── lib/ranker.ts           #   the scorer, faithfully ported to TypeScript
│   └── app/api/rank/route.ts   #   serverless ranking endpoint
├── deck/                       # india-runs-hackathon-deck.pptx (template-based)
├── submission_metadata.yaml    # portal metadata (fill the <PLACEHOLDERS>)
├── requirements.txt            # numpy + scikit-learn — all the rank step needs
└── README.md
```

## Testing

```bash
pip install -r requirements-dev.txt
python -m pytest -q          # 10 tests, ~2s
```

The suite encodes the JD's intent as assertions: honeypots collapse and lose to
real candidates, keyword-stuffers lose to engineers, consulting-only careers are
penalised, the CSV passes the **official validator**, scores are non-increasing,
and ties break by `candidate_id` ascending.

## Live demo / sandbox

The [`web/`](web/) app is the mandatory reproducibility sandbox **and** a
recruiter-facing showcase. It loads the 50-candidate sample, runs the same
scoring logic (ported to TypeScript) in a serverless function, shows every
candidate's factor breakdown, and exports a spec-formatted CSV.

```bash
cd web && npm install && npm run dev     # http://localhost:3000
```

Deploy to Vercel with `vercel --prod` (see [Deploying](#deploying) below).

## Pitch deck

[`deck/india-runs-hackathon-deck.pptx`](deck/) is built **from the mandatory
Redrob template** by [`scripts/build_deck.py`](scripts/build_deck.py) — the
template's branding, layout and fonts are left untouched; only the content
placeholders are filled. Regenerate with `python scripts/build_deck.py`.

---

## Compute compliance

| Constraint | Limit | This system |
|---|---|---|
| Runtime | ≤ 5 min | **~85 s** on CPU (hybrid) |
| Memory | ≤ 16 GB | comfortably under |
| Compute | CPU only | ✅ NumPy / scikit-learn, no GPU |
| Network | off | ✅ no API/LLM calls at rank time |
| Disk | ≤ 5 GB | a few hundred MB |
| Output | header + exactly 100 rows, unique ranks, non-increasing score, id tie-break | ✅ validator passes |

## Why this design

The JD prizes engineers who understand **retrieval and ranking fundamentals**
over framework hype, and warns that *"running an LLM call for each of 100,000
candidates will not fit the 5-minute CPU budget."* We took that literally:
a compact, deterministic ranker over precomputed features — explainable end to
end, reproducible bit-for-bit, and fast enough to be a real production system,
not a benchmark toy. That's exactly the "scrappy product engineer who ships"
profile the role is hiring for.

---

## Deploying

**GitHub**
```bash
git init && git add . && git commit -m "Redrob ranking engine + web + deck"
gh repo create india-runs-hackathon --public --source=. --push
```

**Vercel** (deploys the `web/` sandbox)
```bash
cd web && vercel --prod        # set Root Directory = web in the Vercel dashboard
```

Then drop the resulting URLs into [`submission_metadata.yaml`](submission_metadata.yaml)
(and the deck's *Submission Assets* slide).

<div align="center"><sub>Built for the India Runs Data &amp; AI Challenge · MIT licensed</sub></div>
