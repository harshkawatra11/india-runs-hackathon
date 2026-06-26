export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="6" y="18" width="4.4" height="8" rx="1.6" className="fill-accent/60" />
        <rect x="13.8" y="12" width="4.4" height="14" rx="1.6" className="fill-accent/85" />
        <rect x="21.6" y="6" width="4.4" height="20" rx="1.6" className="fill-saffron" />
      </svg>
      <span className="font-display text-[1.05rem] font-semibold tracking-tight text-ink">
        Redrob<span className="text-ink-3">/</span>Ranker
      </span>
    </span>
  );
}
