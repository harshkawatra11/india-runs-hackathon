import { ScoreDial } from "@/components/ui/dataviz";
import { Eyebrow } from "@/components/ui/primitives";

const PREVIEW = [
  { rank: "01", title: "Staff ML Engineer", company: "Paytm", score: 0.984, top: true },
  { rank: "02", title: "Senior AI Engineer", company: "Apple", score: 0.954 },
  { rank: "03", title: "Search Engineer", company: "Sarvam AI", score: 0.917 },
  { rank: "47", title: "HR Manager · 9 AI skills", company: "buried by title gate", score: 0.21, dim: true },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="container-page grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        {/* copy */}
        <div className="animate-fade-up">
          <Eyebrow>Redrob · Intelligent Candidate Discovery &amp; Ranking</Eyebrow>
          <h1 className="mt-5 font-display text-h1 font-semibold text-ink">
            The recruiter that reads
            <br />
            <span className="saffron-text italic">people</span>, not buzzwords.
          </h1>
          <p className="mt-6 max-w-xl text-body-lg text-ink-2">
            A deterministic, CPU-only, network-free engine reads{" "}
            <span className="text-ink">100,000 candidate profiles</span> against a nuanced
            Senior AI Engineer job description and returns an explainable top-100 shortlist in{" "}
            <span className="text-ink">~85 seconds</span> — beating keyword stuffers,
            consulting-only careers and impossible honeypot profiles, and defending every pick.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#sandbox" className="btn btn-primary">
              Try the live sandbox
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 1a.75.75 0 0 1 .75.75v9.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V1.75A.75.75 0 0 1 8 1Z"/>
              </svg>
            </a>
            <a href="#how" className="btn btn-ghost">How it works</a>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {[["100,000", "candidates ranked"], ["~85s", "on a laptop CPU"], ["0", "honeypots in top-100"], ["0", "LLM calls at rank time"]].map(([v, l]) => (
              <div key={l}>
                <dt className="font-display text-xl font-semibold tnum text-ink">{v}</dt>
                <dd className="text-[0.72rem] text-ink-3">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* instrument preview */}
        <div className="animate-fade-up [animation-delay:120ms]">
          <div className="surface shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <span className="eyebrow">Top of the shortlist</span>
              <span className="font-mono text-[0.68rem] text-ink-3">submission.csv</span>
            </div>
            <ul className="space-y-2">
              {PREVIEW.map((p) => (
                <li
                  key={p.rank}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    p.dim ? "border-bad/30 bg-bad/[0.04]" : p.top ? "border-saffron/30 bg-saffron/[0.05]" : "border-line bg-surface2/50"
                  }`}
                >
                  <span className={`font-mono text-sm font-semibold tnum ${p.top ? "saffron-text" : "text-ink-3"}`}>{p.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.86rem] font-medium text-ink">{p.title}</div>
                    <div className="truncate text-[0.7rem] text-ink-3">{p.company}</div>
                  </div>
                  <ScoreDial score={p.score} size={44} />
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-[0.72rem] text-ink-3">
              The “HR Manager with 9 AI skills” — the naïve cosine-search #1 — is correctly buried.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
