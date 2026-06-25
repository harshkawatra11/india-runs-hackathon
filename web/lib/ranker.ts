// In-browser / serverless ranker — a faithful TypeScript port of the Python
// engine (engine/*.py). It runs entirely offline with no LLM calls, mirroring
// the production ranker so the sandbox demonstrates the real scoring logic.
//
// The one deliberate simplification: the semantic component uses lexical token
// overlap with the JD instead of corpus-wide TF-IDF/LSA. For a <=100-candidate
// sandbox that is faithful and instant; the scored 100k run uses the richer
// Python semantic blend.

import {
  AVAIL_MAX, AVAIL_MIN, BASE_WEIGHTS, CONSULTING_SERVICES_FIRMS, EXP_IDEAL_HIGH,
  EXP_IDEAL_LOW, EXP_OK_HIGH, EXP_OK_LOW, JD_QUERY_TEXT, MODERATE_TITLE_TERMS,
  MUST_HAVE_SKILLS, NICE_TO_HAVE_SKILLS, NON_IC_OR_OFFTRACK_TITLES, PENALTY,
  PREFERRED_LOCATIONS, PRODUCT_TECH_FIRMS, REFERENCE_DATE, RESEARCH_ONLY_TITLES,
  STRONG_TITLE_TERMS, SUPPORTING_SKILLS, TIER1_INDIA_LOCATIONS,
} from "./rubric";
import type { Candidate, RankedRow, ScoreBreakdown } from "./types";

const REF = new Date(REFERENCE_DATE);
const PROF_WEIGHT: Record<string, number> = {
  expert: 1.0, advanced: 0.85, intermediate: 0.6, beginner: 0.35,
};
const EDU_TIER: Record<string, number> = {
  tier_1: 1.0, tier_2: 0.75, tier_3: 0.5, tier_4: 0.3, unknown: 0.4,
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const containsAny = (text: string, terms: Iterable<string>) => {
  for (const t of terms) if (text.includes(t)) return true;
  return false;
};
const countMatches = (text: string, terms: string[]) =>
  terms.reduce((n, t) => (text.includes(t) ? n + 1 : n), 0);

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v.slice(0, 10));
  return isNaN(d.getTime()) ? null : d;
}
const monthsBetween = (a: Date, b: Date) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) +
  (b.getDate() - a.getDate()) / 30;

export function candidateText(c: Candidate): string {
  const p = c.profile || {};
  const parts: string[] = [
    p.headline || "", p.summary || "", p.current_title || "", p.current_industry || "",
  ];
  for (const r of c.career_history || []) { parts.push(r.title || "", r.description || ""); }
  for (const s of c.skills || []) parts.push(s.name || "");
  for (const e of c.education || []) parts.push(e.field_of_study || "");
  return parts.join(" ").toLowerCase();
}

// ---- semantic (lexical overlap with the JD) -------------------------------
const JD_TOKENS = new Set(
  JD_QUERY_TEXT.replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((t) => t.length > 2),
);
function semanticScore(c: Candidate): number {
  const toks = candidateText(c).replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)
    .filter((t) => t.length > 2);
  if (toks.length === 0) return 0;
  const uniq = new Set(toks);
  let hit = 0;
  for (const t of uniq) if (JD_TOKENS.has(t)) hit++;
  // overlap over JD vocabulary, softened so a partial match still scores
  return clamp(hit / 22, 0, 1);
}

// ---- role fit -------------------------------------------------------------
function roleFit(c: Candidate) {
  const title = (c.profile?.current_title || "").toLowerCase();
  let titleScore: number, titleClass: string;
  if (containsAny(title, STRONG_TITLE_TERMS)) { titleScore = 1.0; titleClass = "strong_ml"; }
  else if (containsAny(title, RESEARCH_ONLY_TITLES)) { titleScore = 0.55; titleClass = "research"; }
  else if (containsAny(title, NON_IC_OR_OFFTRACK_TITLES)) { titleScore = 0.1; titleClass = "off_track"; }
  else if (containsAny(title, MODERATE_TITLE_TERMS)) { titleScore = 0.6; titleClass = "software"; }
  else { titleScore = 0.3; titleClass = "other"; }

  let evidence = 0;
  const build = ["recommendation", "ranking", "search", "retrieval", "embedding",
    "relevance", "vector", "personalization", "semantic", "matching",
    "learning to rank", "recommender", "information retrieval"];
  const verbs = ["built", "designed", "shipped", "developed", "owned", "led", "implemented"];
  for (const r of c.career_history || []) {
    const rt = (r.title || "").toLowerCase();
    const rd = (r.description || "").toLowerCase();
    if (containsAny(rt, STRONG_TITLE_TERMS)) evidence = Math.max(evidence, 0.9);
    if (containsAny(rd, build)) evidence = Math.max(evidence, containsAny(rd, verbs) ? 0.85 : 0.6);
  }
  return { score: 0.65 * titleScore + 0.35 * evidence, titleClass, evidence };
}

// ---- skill trust ----------------------------------------------------------
function skillTrust(c: Candidate) {
  const assess: Record<string, number> = {};
  const raw = c.redrob_signals?.skill_assessment_scores || {};
  for (const k of Object.keys(raw)) assess[k.toLowerCase()] = raw[k];

  const matched: string[] = [];
  let trustedValue = 0, niceValue = 0;
  for (const s of c.skills || []) {
    const name = (s.name || "").toLowerCase().trim();
    if (!name) continue;
    const prof = (s.proficiency || "intermediate").toLowerCase();
    const endorse = Math.min((s.endorsements || 0) / 25, 1);
    const dur = Math.min((s.duration_months || 0) / 36, 1);
    let assessFactor: number | null = null;
    for (const ak of Object.keys(assess)) {
      if (ak.includes(name) || name.includes(ak)) { assessFactor = assess[ak] / 100; break; }
    }
    let evidence = 0.45 * endorse + 0.45 * dur;
    if (assessFactor !== null) evidence = 0.7 * evidence + 0.3 * assessFactor;
    const trust = (0.35 + 0.65 * evidence) * (PROF_WEIGHT[prof] ?? 0.6);

    const isCore = MUST_HAVE_SKILLS.has(name) || containsAny(name, MUST_HAVE_SKILLS);
    const isNice = NICE_TO_HAVE_SKILLS.has(name) || containsAny(name, NICE_TO_HAVE_SKILLS);
    const isSup = SUPPORTING_SKILLS.has(name) || containsAny(name, SUPPORTING_SKILLS);
    if (isCore) { matched.push(s.name); trustedValue += trust; }
    else if (isNice) niceValue += 0.5 * trust;
    else if (isSup) niceValue += 0.2 * trust;
  }
  const core = 1 - Math.exp(-trustedValue / 2.2);
  const nice = Math.min(niceValue / 4, 1);
  return { score: Math.min(1, 0.82 * core + 0.18 * nice), matched, nCore: matched.length };
}

// ---- experience -----------------------------------------------------------
function experienceFit(c: Candidate) {
  const yoe = c.profile?.years_of_experience;
  let band: number;
  if (typeof yoe !== "number") band = 0.4;
  else if (yoe >= EXP_IDEAL_LOW && yoe <= EXP_IDEAL_HIGH) band = 1.0;
  else if (yoe >= EXP_OK_LOW && yoe <= EXP_OK_HIGH) band = 0.85;
  else if (yoe >= 3 && yoe < EXP_OK_LOW) band = 0.55 + 0.3 * (yoe - 3) / (EXP_OK_LOW - 3);
  else if (yoe > EXP_OK_HIGH && yoe <= 14) band = Math.max(0.45, 0.85 - 0.06 * (yoe - EXP_OK_HIGH));
  else if (yoe < 3) band = 0.3;
  else band = 0.35;
  const title = (c.profile?.current_title || "").toLowerCase();
  const icNow = containsAny(title, STRONG_TITLE_TERMS) || containsAny(title, MODERATE_TITLE_TERMS);
  return { score: 0.8 * band + 0.2 * (icNow ? 1 : 0.6), years: yoe, icNow };
}

// ---- company --------------------------------------------------------------
function companyFit(c: Candidate) {
  const career = c.career_history || [];
  if (career.length === 0) return { score: 0.5, cls: "unknown", consultingRatio: 0, product: 0 };
  let consulting = 0, product = 0;
  for (const r of career) {
    const comp = (r.company || "").toLowerCase();
    const ind = (r.industry || "").toLowerCase();
    if (containsAny(comp, CONSULTING_SERVICES_FIRMS) || ind.includes("it services") || ind.includes("consulting")) consulting++;
    if (containsAny(comp, PRODUCT_TECH_FIRMS) || ind.includes("product") || ind.includes("saas")) product++;
  }
  const ratio = consulting / career.length;
  let score: number, cls: string;
  if (ratio >= 0.99) { score = 0.2; cls = "consulting_only"; }
  else if (product >= 1 && ratio < 0.5) { score = 0.95; cls = "product_experience"; }
  else if (ratio >= 0.6) { score = 0.45; cls = "mostly_services"; }
  else { score = 0.7; cls = "mixed"; }
  return { score, cls, consultingRatio: ratio, product };
}

// ---- location -------------------------------------------------------------
function locationFit(c: Candidate) {
  const loc = (c.profile?.location || "").toLowerCase();
  const country = (c.profile?.country || "").toLowerCase();
  const relocate = !!c.redrob_signals?.willing_to_relocate;
  let score: number, cls: string;
  if (containsAny(loc, PREFERRED_LOCATIONS)) { score = 1.0; cls = "preferred_city"; }
  else if (containsAny(loc, TIER1_INDIA_LOCATIONS)) { score = 0.85; cls = "tier1_india"; }
  else if (country === "india" || country === "in") { score = relocate ? 0.78 : 0.7; cls = "other_india"; }
  else if (relocate) { score = 0.55; cls = "outside_india_relocating"; }
  else { score = 0.28; cls = "outside_india_static"; }
  if ((cls === "tier1_india" || cls === "other_india") && relocate) score = Math.min(1, score + 0.08);
  return { score, cls, relocate };
}

function educationFit(c: Candidate) {
  const edu = c.education || [];
  if (edu.length === 0) return 0.4;
  return Math.max(...edu.map((e) => EDU_TIER[e.tier || "unknown"] ?? 0.4));
}

// ---- integrity / honeypot -------------------------------------------------
function assessIntegrity(c: Candidate): { mult: number; flags: string[] } {
  const flags: string[] = [];
  let hard = 0, soft = 0;
  const yoe = c.profile?.years_of_experience;
  let totalMonths = 0;
  let earliest: Date | null = null;
  for (const r of c.career_history || []) {
    const start = parseDate(r.start_date);
    const end = parseDate(r.end_date) || (r.is_current ? REF : null);
    const dur = r.duration_months;
    if (start && (!earliest || start < earliest)) earliest = start;
    if (typeof dur === "number") totalMonths += dur;
    if (start && end) {
      const span = monthsBetween(start, end);
      if (dur != null && span >= 0 && dur > span + 14) {
        hard++; flags.push(`role '${r.title || "?"}' claims ${Math.round(dur)} months but dates span only ~${Math.round(span)} months`);
      }
      if (end < start) { hard++; flags.push("a role ends before it starts"); }
    }
    if (start && start > REF) { hard++; flags.push("a role starts in the future"); }
  }
  if (typeof yoe === "number" && earliest) {
    const spanYrs = monthsBetween(earliest, REF) / 12;
    if (yoe > spanYrs + 2.5) {
      hard++; flags.push(`claims ${yoe.toFixed(1)} yrs experience but career history only spans ~${spanYrs.toFixed(1)} yrs`);
    }
  }
  if (typeof yoe === "number" && totalMonths > 0 && totalMonths / 12 > yoe + 6) {
    soft++; flags.push("overlapping roles sum to far more time than stated experience");
  }
  let seniorZero = 0;
  for (const s of c.skills || []) {
    const prof = (s.proficiency || "").toLowerCase();
    if ((prof === "advanced" || prof === "expert") && s.duration_months === 0) seniorZero++;
  }
  if (seniorZero >= 5) { hard++; flags.push(`${seniorZero} skills marked advanced/expert with 0 months of use`); }
  else if (seniorZero >= 3) { soft++; flags.push(`${seniorZero} 'advanced/expert' skills with 0 months of use`); }
  for (const e of c.education || []) {
    if (typeof e.start_year === "number" && typeof e.end_year === "number" && e.end_year < e.start_year) {
      soft++; flags.push("an education entry ends before it starts");
    }
  }
  let mult: number;
  if (hard >= 1) mult = hard >= 2 ? 0.04 : 0.1;
  else if (soft >= 2) mult = 0.35;
  else if (soft === 1) mult = 0.8;
  else mult = 1.0;
  return { mult, flags };
}

// ---- availability ---------------------------------------------------------
function availability(c: Candidate) {
  const sig = c.redrob_signals || {};
  const parts: Record<string, number> = {};
  const la = parseDate(sig.last_active_date);
  const days = la ? Math.round((REF.getTime() - la.getTime()) / 86400000) : null;
  if (days === null) parts.recency = 0.5;
  else if (days <= 7) parts.recency = 1.0;
  else if (days <= 30) parts.recency = 0.9;
  else if (days <= 90) parts.recency = 0.65;
  else if (days <= 180) parts.recency = 0.35;
  else parts.recency = 0.12;
  const rr = sig.recruiter_response_rate;
  parts.response = typeof rr === "number" ? clamp(rr, 0, 1) : 0.5;
  parts.open = sig.open_to_work_flag ? 1.0 : 0.45;
  const notice = sig.notice_period_days;
  parts.notice = typeof notice === "number"
    ? notice <= 30 ? 1.0 : notice <= 60 ? 0.8 : notice <= 90 ? 0.6 : 0.4 : 0.6;
  const icr = sig.interview_completion_rate;
  parts.interview = typeof icr === "number" ? clamp(icr, 0, 1) : 0.6;
  const saved = (sig.saved_by_recruiters_30d as number) || 0;
  const verified = 0.5 * (sig.verified_email ? 1 : 0) + 0.5 * (sig.verified_phone ? 1 : 0);
  parts.trust = 0.6 * clamp(saved / 20, 0, 1) + 0.4 * verified;
  const w = { recency: 0.34, response: 0.24, open: 0.16, notice: 0.1, interview: 0.1, trust: 0.06 };
  const blend = (Object.keys(w) as (keyof typeof w)[]).reduce((a, k) => a + parts[k] * w[k], 0);
  return { mult: AVAIL_MIN + (AVAIL_MAX - AVAIL_MIN) * blend, days, rr, open: !!sig.open_to_work_flag, notice };
}

// ---- disqualifiers --------------------------------------------------------
function disqualifiers(c: Candidate, role: ReturnType<typeof roleFit>,
  company: ReturnType<typeof companyFit>, skills: ReturnType<typeof skillTrust>) {
  let penalty = 1.0;
  const flags: string[] = [];
  const yoe = c.profile?.years_of_experience || 0;
  if (role.titleClass === "off_track") { penalty *= PENALTY.non_ic_title; flags.push("current title is non-engineering"); }
  if (company.cls === "consulting_only") { penalty *= PENALTY.consulting_only; flags.push("career entirely at services/consulting firms"); }
  if (role.titleClass === "research" && company.product === 0) { penalty *= PENALTY.research_only; flags.push("pure-research background without product deployment"); }
  const durs = (c.career_history || []).map((r) => r.duration_months || 0);
  if ((c.career_history || []).length >= 4 && durs.length) {
    const avg = durs.reduce((a, b) => a + b, 0) / durs.length;
    if (avg < 18) { penalty *= PENALTY.title_chaser; flags.push(`short average tenure (~${avg.toFixed(0)} mo across ${durs.length} roles)`); }
  }
  const skillNames = (c.skills || []).map((s) => (s.name || "").toLowerCase()).join(" ");
  const cv = ["computer vision", "image classification", "opencv", "object detection", "speech recognition", "robotics", "slam", "lidar"];
  const nlp = ["nlp", "natural language", "retrieval", "ranking", "search", "embedding", "recommendation", "information retrieval", "llm"];
  if (countMatches(skillNames, cv) >= 2 && countMatches(skillNames, nlp) === 0) { penalty *= PENALTY.cv_speech_only; flags.push("vision/speech/robotics focus without NLP/IR"); }
  if (yoe < 3 && (skillNames.includes("langchain") || skillNames.includes("prompt engineering")) && skills.nCore <= 1) {
    penalty *= PENALTY.langchain_only_junior; flags.push("junior, framework/prompt-only without retrieval/ranking depth");
  }
  return { penalty, flags };
}

// ---- compose + reason -----------------------------------------------------
const OPENERS_STRONG = ["Strong fit:", "Clear match:", "Excellent fit:", "Top-tier match:", "Standout candidate:"];
const OPENERS_GOOD = ["Solid fit:", "Good match:", "Credible fit:", "Promising candidate:", "Well-aligned:"];
const OPENERS_MARGINAL = ["Borderline:", "Partial fit:", "Adjacent profile:", "Included with caveats:", "Stretch pick:"];
const seedOf = (id: string) => { const d = id.replace(/\D/g, ""); return d ? parseInt(d, 10) : id.length; };
const pick = (a: string[], s: number) => a[s % a.length];

function reasoning(c: Candidate, ctx: ReasonCtx, finalScore: number): string {
  const seed = seedOf(c.candidate_id);
  const opener = finalScore >= 0.62 ? pick(OPENERS_STRONG, seed)
    : finalScore >= 0.42 ? pick(OPENERS_GOOD, seed) : pick(OPENERS_MARGINAL, seed);
  const p = c.profile || {};
  const yrs = typeof p.years_of_experience === "number" ? `${p.years_of_experience.toFixed(1)} yrs` : "unstated tenure";
  const head = p.current_company
    ? `${p.current_title || "professional"} with ${yrs} (currently at ${p.current_company})`
    : `${p.current_title || "professional"} with ${yrs}`;
  const tail: string[] = [];
  if (ctx.matched.length) tail.push(`core skills ${ctx.matched.slice(0, 3).join(", ")}`);
  if (ctx.evidence >= 0.6) tail.push("career history shows hands-on retrieval/ranking/recsys work");
  const availBits: string[] = [];
  if (typeof ctx.rr === "number") availBits.push(`response rate ${ctx.rr.toFixed(2)}`);
  if (typeof ctx.days === "number") {
    if (ctx.days <= 30) availBits.push(`active ${ctx.days}d ago`);
    else if (ctx.days >= 120) availBits.push(`inactive ~${ctx.days}d`);
  }
  if (ctx.open) availBits.push("open to work");
  if (availBits.length) tail.push(availBits.join(", "));
  let rotated = tail;
  if (tail.length) { const k = seed % tail.length; rotated = tail.slice(k).concat(tail.slice(0, k)); }
  let sentence = `${opener} ${[head, ...rotated].join("; ")}.`;
  const concern = concernPhrase(c, ctx);
  if (concern) sentence += ` Note: ${concern}.`;
  return sentence;
}

interface ReasonCtx {
  matched: string[]; evidence: number; rr?: number; days: number | null; open: boolean;
  notice?: number; integrityFlags: string[]; integrityMult: number; dqFlags: string[];
  locClass: string; expBand: number; years?: number;
}

function concernPhrase(c: Candidate, ctx: ReasonCtx): string | null {
  if (ctx.integrityFlags.length && ctx.integrityMult < 0.5) return `data-integrity concern (${ctx.integrityFlags[0]})`;
  if (ctx.dqFlags.length) return `concern: ${ctx.dqFlags[0]}`;
  if (typeof ctx.days === "number" && ctx.days >= 150) return `availability risk - last active ~${ctx.days}d ago`;
  if (typeof ctx.rr === "number" && ctx.rr < 0.25) return `low recruiter responsiveness (${ctx.rr.toFixed(2)})`;
  if (typeof ctx.notice === "number" && ctx.notice > 90) return `long notice period (${Math.round(ctx.notice)} days)`;
  if (ctx.locClass === "outside_india_static") return "based outside India and not open to relocation";
  if (ctx.expBand < 0.6 && typeof ctx.years === "number") return `experience (${ctx.years.toFixed(1)} yrs) outside the ideal 6-8 band`;
  return null;
}

export function scoreCandidate(c: Candidate): RankedRow {
  const sem = semanticScore(c);
  const role = roleFit(c);
  const skills = skillTrust(c);
  const exp = experienceFit(c);
  const company = companyFit(c);
  const loc = locationFit(c);
  const edu = educationFit(c);
  const integ = assessIntegrity(c);
  const avail = availability(c);
  const dq = disqualifiers(c, role, company, skills);

  const components: Record<string, number> = {
    semantic: clamp(sem, 0, 1), role_fit: role.score, skill_trust: skills.score,
    experience: exp.score, company: company.score, location: loc.score, education: edu,
  };
  const base = Object.keys(BASE_WEIGHTS).reduce((a, k) => a + components[k] * BASE_WEIGHTS[k], 0);
  const final = clamp(base * dq.penalty * avail.mult * integ.mult, 0, 1);

  const breakdown: ScoreBreakdown = {
    base: round(base, 4), components: mapRound(components, 4), penalty: round(dq.penalty, 3),
    availability_multiplier: round(avail.mult, 3), integrity_multiplier: round(integ.mult, 3),
    final: round(final, 6),
  };
  const ctx: ReasonCtx = {
    matched: skills.matched, evidence: role.evidence, rr: avail.rr ?? undefined, days: avail.days,
    open: avail.open, notice: avail.notice ?? undefined, integrityFlags: integ.flags,
    integrityMult: integ.mult, dqFlags: dq.flags, locClass: loc.cls, expBand: exp.score,
    years: exp.years ?? undefined,
  };
  return {
    candidate_id: c.candidate_id, rank: 0, score: round(final, 6),
    reasoning: reasoning(c, ctx, final), name: c.profile?.anonymized_name,
    title: c.profile?.current_title, company: c.profile?.current_company,
    years: c.profile?.years_of_experience, breakdown, matchedCoreSkills: skills.matched,
    flags: [...dq.flags, ...integ.flags], isHoneypot: integ.mult <= 0.12,
  };
}

export function rankCandidates(cands: Candidate[], topN = 100): RankedRow[] {
  const scored = cands.map(scoreCandidate);
  scored.sort((a, b) => (b.score - a.score) || (a.candidate_id < b.candidate_id ? -1 : 1));
  return scored.slice(0, topN).map((r, i) => ({ ...r, rank: i + 1 }));
}

export function toCsv(rows: RankedRow[]): string {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = ["candidate_id,rank,score,reasoning"];
  for (const r of rows) lines.push(`${r.candidate_id},${r.rank},${r.score.toFixed(6)},${esc(r.reasoning)}`);
  return lines.join("\n");
}

function round(x: number, n: number) { const f = 10 ** n; return Math.round(x * f) / f; }
function mapRound(o: Record<string, number>, n: number) {
  const out: Record<string, number> = {};
  for (const k of Object.keys(o)) out[k] = round(o[k], n);
  return out;
}
