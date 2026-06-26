"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ScoreDial, FactorBreakdown } from "@/components/ui/dataviz";
import { Badge, cx } from "@/components/ui/primitives";
import { scoreTier, TIER_META } from "@/lib/score-ui";
import type { RankedRow } from "@/lib/types";

export function CandidateCard({
  row, open, onToggle,
}: { row: RankedRow; open: boolean; onToggle: () => void }) {
  const tier = TIER_META[scoreTier(row.score)];
  const isTop = row.rank === 1;

  return (
    <motion.li
      layout
      className={cx(
        "surface overflow-hidden p-0",
        row.isHoneypot && "border-bad/40",
        isTop && !row.isHoneypot && "border-saffron/40",
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-surface2/60"
      >
        {/* rank */}
        <div className="flex w-9 shrink-0 flex-col items-center pt-0.5">
          <span className={cx("font-mono text-lg font-semibold tnum",
            isTop ? "saffron-text" : "text-ink-3")}>
            {String(row.rank).padStart(2, "0")}
          </span>
        </div>

        {/* identity */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-display text-[1.02rem] font-semibold text-ink">
              {row.title || "Unknown role"}
            </span>
            {isTop && !row.isHoneypot && <Badge tone="saffron">Top match</Badge>}
            {row.isHoneypot && <Badge tone="bad">honeypot · buried</Badge>}
          </div>
          <div className="mt-0.5 text-caption text-ink-3">
            {row.company}
            {typeof row.years === "number" && <> · {row.years.toFixed(1)} yrs</>}
            {" · "}
            <span className="font-mono">{row.candidate_id}</span>
          </div>

          {row.matchedCoreSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.matchedCoreSkills.slice(0, 5).map((s) => (
                <span key={s} className="rounded-md border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[0.66rem] font-medium text-accent">
                  {s}
                </span>
              ))}
            </div>
          )}

          <p className="mt-2.5 text-[0.84rem] leading-relaxed text-ink-2">{row.reasoning}</p>
        </div>

        {/* score */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ScoreDial score={row.score} />
          <span className={cx("text-[0.64rem] font-semibold uppercase tracking-wide", tier.text)}>
            {tier.label}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Why this rank</span>
                <span className="font-mono text-[0.7rem] text-ink-3">
                  base {row.breakdown.base.toFixed(3)} → final {row.breakdown.final.toFixed(3)}
                </span>
              </div>
              <FactorBreakdown
                components={row.breakdown.components}
                penalty={row.breakdown.penalty}
                availability={row.breakdown.availability_multiplier}
                integrity={row.breakdown.integrity_multiplier}
              />
              {row.flags.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {row.flags.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[0.72rem] text-warn">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="mt-0.5 shrink-0">
                        <path d="M8 1.5 15 14H1L8 1.5Zm0 4.2a.8.8 0 0 0-.8.8v2.8a.8.8 0 0 0 1.6 0V6.5a.8.8 0 0 0-.8-.8Zm0 5.1a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z"/>
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
