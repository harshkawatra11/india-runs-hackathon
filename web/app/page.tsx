import RankExplorer from "@/components/RankExplorer";
import { Hero } from "@/components/Hero";
import { Reveal } from "@/components/ui/Reveal";
import { Badge, SectionHeader, Stat, Surface } from "@/components/ui/primitives";
import { Wordmark } from "@/components/ui/Wordmark";

const PROOF = [
  { v: "~85s", l: "Full 100k pool", s: "vs the 5-minute budget" },
  { v: "< 16GB", l: "Peak memory", s: "CPU only · no GPU" },
  { v: "0", l: "Honeypots in top-100", s: "general consistency checks" },
  { v: "0", l: "Network / LLM calls", s: "at rank time" },
];

const TRAPS = [
  { t: "Keyword stuffers", w: "Title is a gate", d: "An “HR Manager” listing 9 AI skills loses to a real ML engineer. Skills are trusted only when endorsed and actually used." },
  { t: "Plain-language Tier-5s", w: "Evidence beats vocabulary", d: "A candidate who built a recommender at a product company but never wrote “RAG” still surfaces — career evidence wins." },
  { t: "Consulting-only careers", w: "Down-weighted", d: "Entire-career services/consulting profiles are penalised, exactly as the JD’s “we do NOT want” section demands." },
  { t: "~80 honeypots", w: "Caught by math", d: "8 years at a 3-year-old company; “expert” in 10 skills with 0 months used — collapsed by integrity checks, not special-casing." },
];

const PIPELINE = [
  { t: "JD → Rubric", d: "The job description encoded as weighted keyword sets, title gates, location tiers and disqualifier rules — fully auditable." },
  { t: "Feature extraction", d: "Per-candidate evidence: title class, career signals, trusted-skill match, company type, experience band." },
  { t: "Integrity check", d: "Date-span, experience-math and zero-usage consistency tests collapse impossible honeypot profiles." },
  { t: "Availability modifier", d: "Recency, recruiter response rate, open-to-work and notice period modulate — never create — the score." },
  { t: "Score composition", d: "Weighted base × disqualifier penalty × availability × integrity → a single, separable (0,1] score." },
  { t: "Grounded reasoning", d: "A 1–2 sentence justification assembled from real facts — varied, rank-consistent, never hallucinated." },
];

const RESULTS = [
  { rank: "01", who: "Staff ML Engineer · Paytm", note: "Semantic Search, Pinecone, BM25; retrieval/ranking evidence; response 0.95, active 29d", score: 0.984 },
  { rank: "02", who: "Senior AI Engineer · Apple", note: "FAISS, OpenSearch, Weaviate; retrieval evidence; responsive, open to work", score: 0.954 },
  { rank: "05", who: "Search Engineer · Sarvam AI", note: "Milvus, Semantic Search, Weaviate; strong availability", score: 0.907 },
  { rank: "11", who: "Senior AI Engineer · Meta", note: "BM25, NLP, Python; retrieval/ranking evidence", score: 0.890 },
];

export default function Home() {
  return (
    <main>
      <Hero />

      {/* proof band */}
      <section className="container-page py-6">
        <Reveal>
          <p className="mb-4 text-center text-caption text-ink-3">As measured on the full 100,000-candidate pool</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PROOF.map((m) => (
              <Stat key={m.l} value={m.v} label={m.l} sub={m.s} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* traps */}
      <section id="traps" className="container-page scroll-mt-20 py-20">
        <Reveal>
          <SectionHeader
            eyebrow="The real challenge"
            title="The dataset is full of traps"
            lead="It isn’t a filtering problem — it’s judgment. The pool is seeded with profiles designed to fool a naïve embedding search. Reading the gap between what the JD says and what it means is the whole game."
          />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {TRAPS.map((t, i) => (
            <Reveal key={t.t} delay={i * 0.06}>
              <Surface hover className="h-full">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-h4 font-semibold text-ink">{t.t}</h3>
                  <Badge tone="accent">{t.w}</Badge>
                </div>
                <p className="mt-2 text-body text-ink-2">{t.d}</p>
              </Surface>
            </Reveal>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="scroll-mt-20 bg-bg2 py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeader
              eyebrow="Architecture"
              title="Six transparent stages"
              lead="Every weight and rule is auditable — a reviewer can read exactly what the system believes the role rewards and penalises."
            />
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PIPELINE.map((s, i) => (
              <Reveal key={s.t} delay={(i % 3) * 0.06}>
                <Surface hover className="h-full">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 font-mono text-sm font-semibold text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-medium text-ink">{s.t}</h3>
                  </div>
                  <p className="mt-3 text-[0.86rem] leading-relaxed text-ink-2">{s.d}</p>
                </Surface>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-inset p-5">
              <code className="block whitespace-nowrap font-mono text-[0.82rem] text-ink-2">
                <span className="text-ink-3">final</span> ={" "}
                <span className="text-accent">base</span>(semantic, role, skill-trust, experience, company, location, education){" "}
                <span className="text-saffron">×</span> penalty{" "}
                <span className="text-saffron">×</span> availability{" "}
                <span className="text-saffron">×</span> integrity
              </code>
            </div>
          </Reveal>
        </div>
      </section>

      {/* sandbox */}
      <section id="sandbox" className="container-page scroll-mt-20 py-20">
        <Reveal>
          <SectionHeader
            eyebrow="Run it yourself"
            title="Live ranking sandbox"
            lead="The mandatory reproducibility sandbox — it runs the same scoring logic as the scored 100k engine on a 50-candidate sample, end-to-end, with no LLM calls, and exports a spec-formatted CSV."
          />
        </Reveal>
        <Reveal delay={0.08} className="mt-8">
          <RankExplorer />
        </Reveal>
      </section>

      {/* results */}
      <section id="results" className="scroll-mt-20 bg-bg2 py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeader
              eyebrow="Outcome"
              title="Who rises to the top"
              lead="On the full pool, the top-100 are senior AI / ML / Search / NLP engineers at product companies and AI startups — 6–8 years, real retrieval/ranking evidence, and strong availability."
            />
          </Reveal>
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Reveal>
              <Surface className="p-0">
                <ul>
                  {RESULTS.map((r, i) => (
                    <li key={r.rank} className={`flex items-start gap-4 p-4 ${i > 0 ? "border-t border-line" : ""}`}>
                      <span className="font-mono text-sm font-semibold tnum text-ink-3">{r.rank}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-ink">{r.who}</div>
                        <div className="mt-0.5 text-[0.78rem] text-ink-3">{r.note}</div>
                      </div>
                      <span className="font-mono text-sm font-semibold tnum text-tier-strong">{r.score.toFixed(3)}</span>
                    </li>
                  ))}
                </ul>
              </Surface>
            </Reveal>
            <Reveal delay={0.08}>
              <Surface className="h-full">
                <span className="eyebrow">Why it holds up</span>
                <ul className="mt-4 space-y-3 text-[0.86rem] text-ink-2">
                  {[
                    "Scored by NDCG@10/50 + MAP + P@10 — tuned for top-heavy precision and ordering.",
                    "Validator passes: exactly 100 rows, unique ranks, non-increasing score, id tie-break.",
                    "Reproduced from a single command inside the 5-min / 16GB / no-network budget.",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0" aria-hidden>
                        <circle cx="8" cy="8" r="7" className="stroke-good/40" strokeWidth="1.5" />
                        <path d="m5 8 2 2 4-4" className="stroke-good" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </Surface>
            </Reveal>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-line py-12">
        <div className="container-page flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-md text-[0.8rem] text-ink-3">
              Built for the India Runs Data &amp; AI Challenge. CPU-only · no network at rank time · fully reproducible.
            </p>
          </div>
          <div className="flex gap-3">
            <a href="https://github.com/harshkawatra11/india-runs-hackathon" target="_blank" rel="noreferrer" className="btn btn-ghost !py-2 !text-[0.8rem]">
              GitHub repo
            </a>
            <a href="#sandbox" className="btn btn-primary !py-2 !text-[0.8rem]">Run the sandbox</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
