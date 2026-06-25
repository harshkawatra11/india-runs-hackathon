// Sandbox ranking endpoint.
//
// Accepts a small candidate sample (<=100, per submission_spec 10.5) as JSON,
// runs the offline TypeScript ranker, and returns the ranked rows. No network
// or LLM calls — this mirrors the production engine's constraints.

import { NextResponse } from "next/server";
import { rankCandidates } from "@/lib/ranker";
import type { Candidate } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_SAMPLE = 100;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const candidates = extractCandidates(body);
  if (!candidates) {
    return NextResponse.json(
      { error: "Expected an array of candidates or { candidates: [...] }." },
      { status: 400 },
    );
  }
  if (candidates.length === 0) {
    return NextResponse.json({ error: "No candidates provided." }, { status: 400 });
  }
  if (candidates.length > MAX_SAMPLE) {
    return NextResponse.json(
      { error: `Sandbox accepts at most ${MAX_SAMPLE} candidates (got ${candidates.length}).` },
      { status: 413 },
    );
  }

  const t0 = Date.now();
  const topN = Math.min(candidates.length, MAX_SAMPLE);
  const ranked = rankCandidates(candidates, topN);
  const ms = Date.now() - t0;

  return NextResponse.json({
    count: candidates.length,
    ranked,
    honeypots_in_top: ranked.filter((r) => r.isHoneypot).length,
    elapsed_ms: ms,
  });
}

function extractCandidates(body: unknown): Candidate[] | null {
  if (Array.isArray(body)) return body as Candidate[];
  if (body && typeof body === "object" && Array.isArray((body as { candidates?: unknown }).candidates)) {
    return (body as { candidates: Candidate[] }).candidates;
  }
  return null;
}
