# Redrob Ranker — web sandbox

A Next.js 15 + Tailwind app that doubles as:

1. a **recruiter-facing showcase** of the ranking engine, and
2. the **mandatory reproducibility sandbox** (submission_spec §10.5) — it accepts
   a ≤100-candidate sample, runs the ranking end-to-end with no network/LLM, and
   exports a spec-formatted CSV.

The scoring logic in [`lib/ranker.ts`](lib/ranker.ts) is a faithful TypeScript
port of the Python engine, so the demo reasons the same way the scored 100k
ranker does. The ranking runs in a serverless route
([`app/api/rank/route.ts`](app/api/rank/route.ts)).

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build
```

## Deploy to Vercel

```bash
vercel --prod
```

In the Vercel dashboard, set the project's **Root Directory** to `web` so it
builds this app (the repository root holds the Python engine).
