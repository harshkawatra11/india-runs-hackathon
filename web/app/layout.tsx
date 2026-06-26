import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://india-runs-hackathon.vercel.app"),
  title: "Redrob Ranker — the AI recruiter that reads people, not buzzwords",
  description:
    "An explainable, CPU-only, network-free ranking engine that reads 100,000 " +
    "candidate profiles against a nuanced Senior AI Engineer job description and " +
    "returns a top-100 shortlist in ~85 seconds — beating keyword stuffers, " +
    "consulting-only careers and impossible honeypot profiles, and explaining " +
    "every decision.",
  keywords: [
    "candidate ranking", "information retrieval", "learning to rank",
    "recruiting", "talent intelligence", "Redrob", "semantic search",
  ],
  authors: [{ name: "india-runs-hackathon" }],
  openGraph: {
    title: "Redrob Ranker — reasons beyond keywords",
    description:
      "Explainable, CPU-only candidate ranking. 100,000 profiles in ~85s, 0 honeypots.",
    url: "https://india-runs-hackathon.vercel.app",
    siteName: "Redrob Ranker",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Redrob Ranker" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
