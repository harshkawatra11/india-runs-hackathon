"use client";

import { useCallback, useMemo, useState } from "react";
import { toCsv } from "@/lib/ranker";
import type { Candidate, RankedRow } from "@/lib/types";

type Status = "idle" | "loading" | "ranking" | "done" | "error";

function scoreColor(s: number) {
  if (s >= 0.62) return "text-good";
  if (s >= 0.42) return "text-warn";
  return "text-muted";
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-slate-300">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export default function RankExplorer() {
  const [status, setStatus] = useState<Status>("idle");
  const [rows, setRows] = useState<RankedRow[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [honeypots, setHoneypots] = useState(0);
  const [error, setError] = useState<string>("");
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const runRanking = useCallback(async () => {
    setStatus("loading");
    setError("");
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
      setRows(data.ranked);
      setElapsed(data.elapsed_ms);
      setHoneypots(data.honeypots_in_top);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
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

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Live ranking sandbox</h3>
          <p className="text-sm text-muted">
            Runs the offline ranker on the 50 sample candidates — entirely in a
            serverless function, no LLM calls.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-primary"
            onClick={runRanking}
            disabled={status === "loading" || status === "ranking"}
          >
            {status === "loading" || status === "ranking" ? "Ranking…" : "Run ranking"}
          </button>
          {status === "done" && (
            <button className="btn-ghost" onClick={downloadCsv}>
              Download CSV
            </button>
          )}
        </div>
      </div>

      {status === "done" && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="pill">{rows.length} ranked</span>
          <span className="pill">⚡ {elapsed} ms</span>
          <span className="pill">
            {honeypots === 0 ? "✅ 0 honeypots in top" : `⚠ ${honeypots} honeypots`}
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter by title, company, skill…"
            className="ml-auto w-56 rounded-lg border border-line bg-panel2 px-3 py-1 text-xs text-slate-200 outline-none focus:border-accent"
          />
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
          {error}
        </p>
      )}

      {status === "done" && (
        <div className="thin-scroll mt-4 max-h-[28rem] overflow-y-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-panel2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2 hidden sm:table-cell">Why</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isOpen = open === r.candidate_id;
                return (
                  <tr
                    key={r.candidate_id}
                    className="cursor-pointer border-t border-line align-top hover:bg-panel2/50"
                    onClick={() => setOpen(isOpen ? null : r.candidate_id)}
                  >
                    <td className="px-3 py-2 font-mono text-muted">{r.rank}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-white">
                        {r.title || "—"}
                        {r.isHoneypot && (
                          <span className="ml-2 rounded bg-bad/20 px-1.5 py-0.5 text-[10px] text-bad">
                            honeypot
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        {r.company} · {typeof r.years === "number" ? `${r.years.toFixed(1)} yrs` : ""} ·{" "}
                        <span className="font-mono">{r.candidate_id}</span>
                      </div>
                      {r.matchedCoreSkills.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.matchedCoreSkills.slice(0, 4).map((s) => (
                            <span key={s} className="pill !text-[10px] !text-accent2">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {isOpen && (
                        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                          {Object.entries(r.breakdown.components).map(([k, v]) => (
                            <Bar key={k} label={k} value={v as number} />
                          ))}
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                            <span>penalty ×{r.breakdown.penalty}</span>
                            <span>availability ×{r.breakdown.availability_multiplier}</span>
                            <span>integrity ×{r.breakdown.integrity_multiplier}</span>
                          </div>
                          {r.flags.length > 0 && (
                            <ul className="mt-1 list-inside list-disc text-[11px] text-warn">
                              {r.flags.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={`px-3 py-2 font-mono ${scoreColor(r.score)}`}>
                      {r.score.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 hidden max-w-md text-xs text-slate-300 sm:table-cell">
                      {r.reasoning}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {status === "idle" && (
        <p className="mt-6 text-center text-sm text-muted">
          Press <span className="text-accent">Run ranking</span> to score the
          sample pool and inspect every candidate&apos;s factor breakdown.
        </p>
      )}
    </div>
  );
}
