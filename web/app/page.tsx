import RankExplorer from "@/components/RankExplorer";

const PIPELINE = [
  { k: "rubric", t: "JD → Rubric", d: "The job description encoded as weighted keyword sets, title gates, location tiers and disqualifier rules." },
  { k: "features", t: "Feature extraction", d: "Per-candidate evidence: title class, career signals, trusted-skill match, company type, experience band." },
  { k: "integrity", t: "Integrity check", d: "Date-span, experience-math and zero-usage consistency tests collapse impossible honeypot profiles." },
  { k: "signals", t: "Availability modifier", d: "Recency, recruiter response rate, open-to-work and notice period modulate — not create — the score." },
  { k: "score", t: "Score composition", d: "Weighted base × disqualifier penalty × availability × integrity → a single (0,1] score." },
  { k: "reason", t: "Grounded reasoning", d: "1–2 sentence justification assembled from real facts — varied, rank-consistent, never hallucinated." },
];

const TRAPS = [
  { t: "Keyword stuffers", d: "An “HR Manager” listing 9 AI skills loses to a real ML engineer — title is a gate, and skills are only trusted when endorsed and actually used." },
  { t: "Plain-language Tier-5s", d: "A candidate who built a recommender at a product company but never wrote “RAG” still surfaces — career evidence beats buzzwords." },
  { t: "Consulting-only careers", d: "Entire-career services/consulting profiles are down-weighted, exactly as the JD’s “we do NOT want” section demands." },
  { t: "~80 honeypots", d: "8 years at a 3-year-old company; “expert” in 10 skills with 0 months used — caught by general consistency checks, not special-casing." },
];

const METRICS = [
  { v: "100,000", l: "candidates ranked" },
  { v: "~98 s", l: "full-pool runtime (CPU)" },
  { v: "0", l: "honeypots in top-100" },
  { v: "0", l: "network / LLM calls at rank time" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      {/* hero */}
      <section className="animate-fade-up">
        <span className="pill">Redrob · Intelligent Candidate Discovery &amp; Ranking</span>
        <h1 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-6xl">
          The AI recruiter that reasons
          <br />
          <span className="gradient-text">beyond keywords.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          A deterministic, CPU-only, network-free ranking engine that reads
          100,000 candidate profiles against a nuanced Senior AI Engineer job
          description — and returns an explainable top-100 shortlist in under two
          minutes. It beats keyword stuffers, consulting-only careers and
          impossible honeypot profiles, and explains every decision.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="#sandbox" className="btn-primary">Try the live sandbox ↓</a>
          <a href="#how" className="btn-ghost">How it works</a>
        </div>
      </section>

      {/* metrics */}
      <section className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.l} className="card p-5 text-center">
            <div className="text-2xl font-bold text-white sm:text-3xl">{m.v}</div>
            <div className="mt-1 text-xs text-muted">{m.l}</div>
          </div>
        ))}
      </section>

      {/* the problem / traps */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-white">The dataset is full of traps</h2>
        <p className="mt-2 max-w-3xl text-slate-300">
          The challenge isn&apos;t filtering — it&apos;s judgment. The pool is
          seeded with profiles designed to fool a naïve embedding search. Reading
          the gap between what the JD <em>says</em> and what it <em>means</em> is
          the whole game.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {TRAPS.map((t) => (
            <div key={t.t} className="card p-5">
              <h3 className="font-semibold text-white">{t.t}</h3>
              <p className="mt-1.5 text-sm text-muted">{t.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mt-16 scroll-mt-8">
        <h2 className="text-2xl font-semibold text-white">How it works</h2>
        <p className="mt-2 max-w-3xl text-slate-300">
          Six transparent stages. Every weight and rule is auditable — a reviewer
          can read exactly what the system believes the role rewards and
          penalises.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PIPELINE.map((s, i) => (
            <div key={s.k} className="card p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 font-mono text-sm text-accent">
                  {i + 1}
                </span>
                <h3 className="font-semibold text-white">{s.t}</h3>
              </div>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="card mt-5 p-5">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">Scoring formula:</span>{" "}
            <code className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-xs text-accent2">
              final = base(semantic, role, skill-trust, experience, company,
              location, education) × penalty × availability × integrity
            </code>
          </p>
        </div>
      </section>

      {/* sandbox */}
      <section id="sandbox" className="mt-16 scroll-mt-8">
        <h2 className="text-2xl font-semibold text-white">Live ranking sandbox</h2>
        <p className="mt-2 max-w-3xl text-slate-300">
          The mandatory reproducibility sandbox. It runs the same scoring logic
          as the scored 100k engine on a 50-candidate sample, end-to-end, and
          lets you download a spec-formatted CSV.
        </p>
        <div className="mt-6">
          <RankExplorer />
        </div>
      </section>

      {/* footer */}
      <footer className="mt-20 border-t border-line pt-8 text-sm text-muted">
        <p>
          Built for the India Runs Data &amp; AI Challenge. The ranking engine,
          tests and reproduction command live in the{" "}
          <code className="font-mono text-accent2">india-runs-hackathon</code>{" "}
          repository. CPU-only · no network at rank time · fully reproducible.
        </p>
      </footer>
    </main>
  );
}
