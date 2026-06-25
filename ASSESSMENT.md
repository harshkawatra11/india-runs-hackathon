# Problem Assessment — Redrob Intelligent Candidate Discovery & Ranking

An in-depth read of the challenge, the dataset, the evaluation, and the design
decisions that follow from them. This is the analysis the ranking engine is
built on.

---

## 1. What is actually being asked

From a pool of **100,000 candidate profiles** (`candidates.jsonl`, 487 MB
uncompressed), produce a **top-100 ranking** for a single, deliberately-nuanced
*Senior AI Engineer — Founding Team* job description, best-fit first, each row
carrying a 1–2 sentence justification.

Output is a CSV with `candidate_id,rank,score,reasoning` — exactly 100 data rows,
each rank `1..100` used once, **score non-increasing with rank**, ties broken by
`candidate_id` ascending. The format validator
(`validate_submission.py`) auto-rejects any violation before scoring.

This is **not** a filtering task. The organizers say it plainly: *"the right
answer is not find candidates whose skills section contains the most AI
keywords. That's a trap we've explicitly built into the dataset."*

## 2. How submissions are scored

```
composite = 0.50 · NDCG@10  +  0.30 · NDCG@50  +  0.15 · MAP  +  0.05 · P@10
```

Two consequences drive the whole design:

1. **The top is everything.** 80% of the score is NDCG@10 + NDCG@50 — the
   quality and *ordering* of the first 10, then the first 50. Getting rank 73
   slightly wrong barely matters; getting a honeypot or a stuffer into the top-10
   is catastrophic. So we optimise for **top-heavy precision and ordering**.
2. **Relevance is graded (tiers), not binary.** NDCG and MAP reward putting
   *more* relevant candidates *higher*. A continuous, well-separated score that
   tracks true fit beats a coarse bucketed one — hence a smooth multiplicative
   composition rather than hard cutoffs.

There is **no live leaderboard and no public partition** — you get one shot
against the full hidden ground truth. That rules out leaderboard-fitting and puts
a premium on a **principled, defensible** scoring function. It also means we
validate by *reasoning and methodology*, not by probing a score.

## 3. The data

Each candidate (see `candidate_schema.json`) has:

- **profile** — headline, summary, location/country, `years_of_experience`,
  current title/company/industry/size.
- **career_history** (1–10 roles) — company, title, dates, `duration_months`,
  `is_current`, industry, company size, free-text description.
- **education** (0–5) — institution, degree, field, years, grade, and an internal
  **tier** (`tier_1`…`tier_4`/`unknown`).
- **skills** — name, proficiency (`beginner…expert`), `endorsements`,
  `duration_months` (months actually used — **the key anti-stuffing field**).
- **certifications**, **languages**.
- **redrob_signals** — 23 behavioural signals: completeness, signup/last-active
  dates, open-to-work, profile views, applications, **recruiter response rate**,
  response time, per-skill assessment scores, connections, endorsements, notice
  period, salary expectation, work-mode, relocation, GitHub activity, search
  appearances, **saved-by-recruiters**, **interview completion rate**, offer
  acceptance, and email/phone/LinkedIn verification.

The 50-row `sample_candidates.json` confirms the texture: real, messy, mixed —
e.g. a Toronto "Backend Engineer" who is a data/ML hybrid, with a believable
narrative summary. The planted bad `sample_submission.csv` ranks an `HR Manager`
with 9 AI skills at #1 — a literal illustration of the trap.

## 4. Decoding the job description

The JD is the relevance rubric. Read carefully, it specifies:

**Strong positives**
- 5–9 years (a *soft* band; ideal ~6–8), with judgment over raw tenure.
- **Production** experience with embeddings retrieval (sentence-transformers,
  BGE, E5) **and** vector/hybrid search (FAISS, Pinecone, Weaviate, Qdrant,
  Milvus, OpenSearch, Elasticsearch).
- Has **shipped an end-to-end ranking / search / recommendation system** to real
  users at a **product company**.
- Designs **evaluation frameworks**: NDCG, MRR, MAP, offline-to-online, A/B.
- Strong Python; "scrappy product engineer who ships," tilted to shipper over
  researcher.

**Explicit disqualifiers ("we do NOT want")**
- Keyword-stuffers — *"all the AI keywords as skills but title is Marketing
  Manager."*
- Pure-research-only backgrounds with no production deployment.
- "AI experience" that is only recent (<12 mo) LangChain-calls-OpenAI, with no
  pre-LLM ML.
- Senior people who moved to "architecture/tech-lead" and **haven't coded in
  18 months**.
- **Title-chasers** — job-hopping every ~1.5 years for the next title.
- **Pure-consulting-only** careers (TCS, Infosys, Wipro, Accenture, Cognizant,
  Capgemini, …).
- Vision/speech/robotics specialists **without NLP/IR** exposure.

**Logistics**
- Pune/Noida preferred; Tier-1 Indian cities welcome; outside India case-by-case,
  **no visa sponsorship**; relocation willingness matters.
- Sub-30-day notice preferred; 30+ raises the bar.

**The participant note** seals it: a "Tier-5" candidate who built a recommender
at a product company but never wrote "RAG" **is a fit**; a perfect-keyword
"Marketing Manager" **is not**; and an unavailable perfect-on-paper candidate
should be **down-weighted**.

## 5. The traps, and how the ground truth treats them

| Trap | Ground-truth treatment | Detection signal we use |
|---|---|---|
| Keyword stuffer | low tier | non-eng title gate + untrusted skills (0 endorsement/usage) |
| Plain-language Tier-5 | **high** tier | career-description evidence of systems built |
| Behavioural twins (great paper, dead account) | down-weighted | availability multiplier (recency, response rate) |
| ~80 honeypots (impossible profiles) | **forced to tier 0**; >10% in top-100 ⇒ disqualified | integrity checks (date-span vs `duration_months`, stated YOE vs earliest role, expert-with-0-months) |

Honeypots are the sharpest constraint: they're a **hard gate**, not just a score
penalty. Our integrity module is therefore designed to be *general* (consistency
a recruiter would notice) rather than a brittle list of known cases.

## 6. Strategy and architecture

The design follows directly from §2–§5:

1. **Encode the JD as an auditable rubric** (`engine/rubric.py`) — weighted
   keyword sets, title gates, location tiers, a consulting-firm list, and
   disqualifier rules. This is "deep job understanding" made inspectable.
2. **Extract cheap, structured features per candidate** (`engine/features.py`):
   role-fit (title gate + career evidence), **skill-trust** (matched core skills
   weighted by `endorsements × duration_months × assessment_score`), experience
   band, company-type, location, education tier, plus disqualifier flags.
3. **Semantic relevance** beyond keywords: lexical **TF-IDF** + latent-semantic
   **LSA**, optionally blended with a **precomputed MiniLM dense** cosine — all
   offline so the timed step is network-free.
4. **Integrity** (`engine/integrity.py`) and **availability**
   (`engine/signals.py`) as **multiplicative modifiers**, so honeypots collapse
   and unavailable stars sink without distorting the relevance signal.
5. **Compose** (`engine/score.py`): `base × penalty × availability × integrity`,
   normalised to `(0,1]`.
6. **Reason** (`engine/reason.py`) from real facts only — varied,
   rank-consistent, never hallucinated.
7. **Rank & emit** (`engine/rank.py`): stream the 487 MB file at constant memory,
   sort with the spec tie-break, write and self-validate the CSV.

Why not "LLM-rerank the top-K"? The spec forbids network/LLM at rank time and
warns it won't scale — and the JD is hiring for systems thinking, not API glue.
A deterministic ranker is faster, reproducible, and **defensible at the
Stage-5 interview**, which is the real bar.

## 7. Compute budget

Hard limits: ≤ 5 min wall-clock, ≤ 16 GB RAM, **CPU-only, no GPU, no network**,
≤ 5 GB disk; reproduced in a sandboxed Docker container at Stage 3.

Measured on the full pool: **~98 s** total (≈28 s feature extraction + ≈69 s
TF-IDF/LSA), peak memory well under 16 GB. The optional dense embeddings are a
**pre-computation** (allowed to exceed the window); the ranking step that emits
the CSV loads a cached `.npy` and stays network-free.

## 8. The five evaluation stages, and how we clear each

1. **Format validation** — `validate_submission.py` passes (self-checked).
2. **Scoring** — top-heavy precision/ordering tuned for NDCG@10/50 + MAP + P@10.
3. **Code reproduction + honeypot check** — single reproduce command, in-budget,
   **0 honeypots** in top-100.
4. **Manual review** — fact-grounded, varied, rank-consistent reasoning; real git
   history; clean, original code (no per-candidate LLM calls).
5. **Defend-your-work interview** — every decision is in `rubric.py`/`score.py`
   and explainable; this document is the script.

## 9. Honest risks & limitations

- **Synthetic-data fit.** The rubric is tuned to the JD's stated intent, not to a
  hidden label set we cannot see. We mitigate by encoding the JD literally rather
  than guessing the generator.
- **Company graph is partial.** We recognise a curated set of product/consulting
  firms; unknown employers are treated neutrally (no penalty), avoiding unfair
  down-ranking.
- **Lexical/LSA vs dense.** The offline TF-IDF+LSA blend is robust and in-budget;
  the optional MiniLM dense pass is available for extra semantic nuance without
  breaking any constraint.
- **Title-as-gate trade-off.** Gating on title risks penalising a genuinely
  strong engineer with an unusual title; career-evidence scoring is the
  counterweight that lets substance override a plain title.
