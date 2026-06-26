// Shared score → presentation mapping, so meters, dials and text agree.

export type Tier = "strong" | "good" | "mid" | "low";

export function scoreTier(score: number): Tier {
  if (score >= 0.62) return "strong";
  if (score >= 0.42) return "good";
  if (score >= 0.25) return "mid";
  return "low";
}

export const TIER_META: Record<Tier, { label: string; text: string; bar: string; ring: string }> = {
  strong: { label: "Strong fit", text: "text-tier-strong", bar: "bg-tier-strong", ring: "rgb(var(--tier-strong))" },
  good: { label: "Good fit", text: "text-tier-good", bar: "bg-tier-good", ring: "rgb(var(--tier-good))" },
  mid: { label: "Partial fit", text: "text-tier-mid", bar: "bg-tier-mid", ring: "rgb(var(--tier-mid))" },
  low: { label: "Adjacent", text: "text-tier-low", bar: "bg-tier-low", ring: "rgb(var(--tier-low))" },
};

// Human labels for the seven base components.
export const COMPONENT_LABELS: Record<string, string> = {
  semantic: "Semantic fit",
  role_fit: "Role & title",
  skill_trust: "Trusted skills",
  experience: "Experience",
  company: "Company type",
  location: "Location",
  education: "Education",
};

// Approximate weights (mirrors engine BASE_WEIGHTS) for the contribution view.
export const COMPONENT_WEIGHTS: Record<string, number> = {
  semantic: 0.26, role_fit: 0.24, skill_trust: 0.2, experience: 0.12,
  company: 0.1, location: 0.05, education: 0.03,
};
