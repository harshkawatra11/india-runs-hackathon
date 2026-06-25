import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Redrob Ranker — Intelligent Candidate Discovery",
  description:
    "An explainable, CPU-only, network-free candidate ranking engine for the " +
    "Redrob Intelligent Candidate Discovery & Ranking Challenge. Ranks 100k " +
    "candidates against a nuanced JD in under 2 minutes — beating keyword " +
    "stuffers, consulting-only careers, and honeypot profiles.",
  keywords: [
    "candidate ranking", "information retrieval", "learning to rank",
    "recruiting", "Redrob", "AI engineer", "semantic search",
  ],
  openGraph: {
    title: "Redrob Ranker — Intelligent Candidate Discovery",
    description:
      "Explainable, CPU-only candidate ranking that reasons beyond keywords.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
