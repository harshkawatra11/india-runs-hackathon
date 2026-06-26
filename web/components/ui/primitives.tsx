import type { ReactNode } from "react";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ---- Eyebrow / section label ------------------------------------------- */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("eyebrow", className)}>
      <span className="h-px w-6 bg-line-strong" aria-hidden />
      {children}
    </span>
  );
}

/* ---- Section header ----------------------------------------------------- */
export function SectionHeader({
  eyebrow, title, lead, align = "left",
}: {
  eyebrow: string; title: ReactNode; lead?: ReactNode; align?: "left" | "center";
}) {
  return (
    <header className={cx("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <Eyebrow className={align === "center" ? "justify-center" : ""}>{eyebrow}</Eyebrow>
      <h2 className="mt-4 font-display text-h2 font-semibold text-ink">{title}</h2>
      {lead && <p className="mt-3 text-body-lg text-ink-2">{lead}</p>}
    </header>
  );
}

/* ---- Surface card ------------------------------------------------------- */
export function Surface({
  children, className = "", hover = false, raised = false, as: Tag = "div",
}: {
  children: ReactNode; className?: string; hover?: boolean; raised?: boolean;
  as?: "div" | "article" | "li";
}) {
  return (
    <Tag
      className={cx(
        "surface p-5 sm:p-6",
        raised && "shadow-md",
        hover && "surface-hover",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ---- Badge -------------------------------------------------------------- */
const BADGE: Record<string, string> = {
  neutral: "border-line bg-surface2 text-ink-2",
  accent: "border-accent/30 bg-accent/10 text-accent",
  good: "border-good/30 bg-good/10 text-good",
  warn: "border-warn/30 bg-warn/10 text-warn",
  bad: "border-bad/30 bg-bad/10 text-bad",
  saffron: "border-saffron/30 bg-saffron/10 text-saffron",
};
export function Badge({
  children, tone = "neutral", className = "",
}: { children: ReactNode; tone?: keyof typeof BADGE | string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold",
        BADGE[tone] ?? BADGE.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---- Stat --------------------------------------------------------------- */
export function Stat({
  value, label, sub, accent = false,
}: { value: ReactNode; label: string; sub?: string; accent?: boolean }) {
  return (
    <div className="surface surface-hover p-5">
      <div
        className={cx(
          "font-display text-[2rem] font-semibold leading-none tnum sm:text-[2.4rem]",
          accent ? "saffron-text" : "text-ink",
        )}
      >
        {value}
      </div>
      <div className="mt-2.5 text-caption font-medium text-ink-2">{label}</div>
      {sub && <div className="mt-0.5 text-[0.7rem] text-ink-3">{sub}</div>}
    </div>
  );
}

export { cx };
