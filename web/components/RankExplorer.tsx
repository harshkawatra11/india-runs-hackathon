"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { CandidateCard } from "@/components/CandidateCard";
import { Badge, cx } from "@/components/ui/primitives";
import { toCsv } from "@/lib/ranker";
import type { Candidate, RankedRow } from "@/lib/types";

type Status = "idle" | "loading" | "ranking" | "done" | "error";

const COMPUTE_STEPS = [
  "Loading 50-candidate sample…",
  "Extracting role, skill-trust & company signals…",
  "Running integrity checks for honeypots…",
  "Composing scores · base × penalty × availability × integrity…",
  "Ranking & generating grounded reasoning…",
];

export default function RankExplorer() {
  const [status, setStatus] = useState<Status>("idle");
  const [rows, setRows] = useState<RankedRow[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [honeypots, setHoneypots] = useState(0);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [step, setStep] = useState(0);

  const runRanking = useCallback(async () => {
    setStatus("loading");
    setError("");
    setOpen(null);
    setStep(0);
    // step the choreography for a felt-sense of computation
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, COMPUTE_STEPS.length - 1)), 230);
    try {
      const res = await fetch("/sample_candidates.json");
      const candidates: Candidate[] = await res.json();
      setStatus("ranking");
      const apiRes = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates }),
      });
      if (!apiRes.ok) {
        const j = await apiRes.json().catch(() => ({}));
        throw new Error(j.error || `Ranking failed (${apiRes.status})`);
      }
      const data = await apiRes.json();
      // ensure the choreography is felt (min ~0.9s) before the reveal
      await new Promise((r) => setTimeout(r, 600));
      setRows(data.ranked);
      setElapsed(data.elapsed_ms);
      setHoneypots(data.honeypots_in_top);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    } finally {
      clearInterval(ticker);
    }
  }, []);

  const downloadCsv = useCallback(() => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redrob_ranking_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.candidate_id.toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.company || "").toLowerCase().includes(q) ||
        r.matchedCoreSkills.some((s) => s.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const busy = status === "loading" || status === "ranking";

  return (
    <div className="surface overflow-hidden p-0 shadow-lg">
      {/* control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface2/50 px-5 py-4">
        <div className="flex items-center gap-2 font-mono text-[0.78rem] text-ink-3">
          <span className="h-2 w-2 rounded-full bg-bad/70" />
          <span className="h-2 w-2 rounded-full bg-warn/70" />
          <span className="h-2 w-2 rounded-full bg-good/70" />
          <span className="ml-2">redrob-ranker · sandbox</span>
        </div>
        <div className="flex items-center gap-2">
          {status === "done" && (
            <button className="btn btn-ghost !py-2 !text-[0.8rem]" onClick={downloadCsv}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 1a.75.75 0 0 1 .75.75v6.69l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.53a.75.75 0 0 1 1.06-1.06l1.97 1.97V1.75A.75.75 0 0 1 8 1ZM2.75 11a.75.75 0 0 1 .75.75v1.5c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-1.5a.75.75 0 0 1 .75-.75Z"/>
              </svg>
              Download CSV
            </button>
          )}
          <button className="btn btn-primary !py-2 !text-[0.8rem]" onClick={runRanking} disabled={busy}>
            {busy ? "Ranking…" : status === "done" ? "Re-run" : "Run ranking"}
            {!busy && (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M4.5 2.5v11l9-5.5-9-5.5Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* body */}
      <div className="p-5">
        {/* idle */}
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-grid pointer-events-none absolute h-40 w-full max-w-md opacity-40" aria-hidden />
            <p className="max-w-sm text-body text-ink-2">
              Press <span className="font-semibold text-accent">Run ranking</span> to score the
              50-candidate sample with the same engine logic — then open any card to see the
              factor-level <span className="text-ink">“why.”</span>
            </p>
          </div>
        )}

        {/* compute choreography */}
        {busy && (
          <div className="py-14">
            <div className="relative mx-auto h-px max-w-md overflow-hidden bg-line">
              <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse-soft bg-accent" />
            </div>
            <div className="mx-auto mt-8 max-w-md space-y-2.5">
              {COMPUTE_STEPS.map((s, i) => (
                <div key={i} className={cx("flex items-center gap-3 font-mono text-[0.78rem] transition-opacity",
                  i <= step ? "opacity-100" : "opacity-30")}>
                  <span className={cx("grid h-4 w-4 place-items-center rounded-full text-[9px]",
                    i < step ? "bg-good/20 text-good" : i === step ? "bg-accent/20 text-accent" : "bg-surface2 text-ink-3")}>
                    {i < step ? "✓" : i === step ? "•" : ""}
                  </span>
                  <span className={i <= step ? "text-ink-2" : "text-ink-3"}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* error */}
        {status === "error" && (
          <p className="rounded-lg border border-bad/40 bg-bad/10 p-4 text-body text-bad">{error}</p>
        )}

        {/* results */}
        {status === "done" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="accent">{rows.length} ranked</Badge>
              <Badge tone="neutral">⚡ {elapsed} ms</Badge>
              <Badge tone={honeypots === 0 ? "good" : "bad"}>
                {honeypots === 0 ? "0 honeypots in top" : `${honeypots} honeypots`}
              </Badge>
              <div className="relative ml-auto">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="filter by title, company, skill…"
                  className="input w-60 !py-1.5 text-[0.78rem]"
                  aria-label="Filter candidates"
                />
              </div>
            </div>

            <motion.ul layout className="thin-scroll max-h-[34rem] space-y-2.5 overflow-y-auto pr-1">
              <AnimatePresence>
                {filtered.map((r, i) => (
                  <motion.div
                    key={r.candidate_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: Math.min(i * 0.025, 0.5), ease: [0.16, 1, 0.3, 1] }}
                  >
                    <CandidateCard
                      row={r}
                      open={open === r.candidate_id}
                      onToggle={() => setOpen(open === r.candidate_id ? null : r.candidate_id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <li className="py-10 text-center text-body text-ink-3">No candidates match “{query}”.</li>
              )}
            </motion.ul>
          </>
        )}
      </div>
    </div>
  );
}
