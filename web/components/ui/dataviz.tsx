"use client";

import { COMPONENT_LABELS, COMPONENT_WEIGHTS, scoreTier, TIER_META } from "@/lib/score-ui";
import { cx } from "@/components/ui/primitives";

/* ---- ScoreDial: a compact radial readout for a single score ------------- */
export function ScoreDial({ score, size = 64 }: { score: number; size?: number }) {
  const tier = TIER_META[scoreTier(score)];
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, score)) * circ;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--border))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tier.ring} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.8s var(--ease-out-expo)" }}
        />
      </svg>
      <span className="absolute font-mono text-[0.8rem] font-semibold tnum text-ink">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

/* ---- ScoreMeter: linear meter + value, tier-coloured -------------------- */
export function ScoreMeter({ score, showValue = true }: { score: number; showValue?: boolean }) {
  const tier = TIER_META[scoreTier(score)];
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-inset">
        <div
          className={cx("h-full rounded-full", tier.bar)}
          style={{ width: `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`,
                   transition: "width 0.8s var(--ease-out-expo)" }}
        />
      </div>
      {showValue && (
        <span className="w-12 shrink-0 text-right font-mono text-[0.8rem] font-semibold tnum text-ink-2">
          {score.toFixed(3)}
        </span>
      )}
    </div>
  );
}

/* ---- FactorBreakdown: the "why", made legible --------------------------- */
export function FactorBreakdown({
  components, penalty, availability, integrity,
}: {
  components: Record<string, number>;
  penalty: number; availability: number; integrity: number;
}) {
  const order = Object.keys(COMPONENT_WEIGHTS).filter((k) => k in components);
  const Mult = ({ label, value }: { label: string; value: number }) => {
    const off = value < 0.995;
    return (
      <div className="flex items-center justify-between rounded-md bg-inset px-2.5 py-1.5">
        <span className="text-[0.7rem] text-ink-3">{label}</span>
        <span className={cx("font-mono text-[0.74rem] font-semibold tnum",
          off ? (value < 0.5 ? "text-bad" : "text-warn") : "text-ink-2")}>
          ×{value.toFixed(2)}
        </span>
      </div>
    );
  };
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {order.map((k) => {
          const v = components[k];
          // contribution = value × weight, normalised against max weight for the bar
          const w = COMPONENT_WEIGHTS[k];
          return (
            <div key={k} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[0.72rem] text-ink-3">{COMPONENT_LABELS[k] ?? k}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-inset">
                <div className="h-full rounded-full bg-accent/80" style={{ width: `${Math.round(v * 100)}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-[0.7rem] tnum text-ink-2">{v.toFixed(2)}</span>
              <span className="hidden w-10 shrink-0 text-right font-mono text-[0.64rem] tnum text-ink-3 sm:block">
                w{w.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Mult label="penalty" value={penalty} />
        <Mult label="availability" value={availability} />
        <Mult label="integrity" value={integrity} />
      </div>
    </div>
  );
}
