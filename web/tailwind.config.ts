import type { Config } from "tailwindcss";

/** token -> rgb(var) helper so opacity utilities (bg-accent/10) work. */
const c = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"),
        bg2: c("bg-2"),
        surface: c("surface"),
        surface2: c("surface-2"),
        inset: c("inset"),
        line: c("border"),
        "line-strong": c("border-strong"),
        ink: c("text"),
        "ink-2": c("text-2"),
        "ink-3": c("text-3"),
        accent: c("accent"),
        accent2: c("accent-2"),
        saffron: c("saffron"),
        good: c("good"),
        warn: c("warn"),
        bad: c("bad"),
        "tier-low": c("tier-low"),
        "tier-mid": c("tier-mid"),
        "tier-good": c("tier-good"),
        "tier-strong": c("tier-strong"),
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        // editorial scale (~1.25 ratio), tuned line-heights + tracking
        caption: ["0.78rem", { lineHeight: "1.45rem", letterSpacing: "0.01em" }],
        body: ["0.95rem", { lineHeight: "1.65rem" }],
        "body-lg": ["1.075rem", { lineHeight: "1.8rem" }],
        h4: ["1.2rem", { lineHeight: "1.7rem", letterSpacing: "-0.01em" }],
        h3: ["1.55rem", { lineHeight: "1.9rem", letterSpacing: "-0.015em" }],
        h2: ["2.15rem", { lineHeight: "2.4rem", letterSpacing: "-0.02em" }],
        h1: ["clamp(2.6rem, 6vw, 4.25rem)", { lineHeight: "1.04", letterSpacing: "-0.03em" }],
        display: ["clamp(3.2rem, 8vw, 6rem)", { lineHeight: "0.98", letterSpacing: "-0.035em" }],
      },
      borderRadius: {
        sm: "var(--r-sm)", md: "var(--r-md)", lg: "var(--r-lg)",
        xl: "var(--r-xl)", "2xl": "var(--r-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)",
        glow: "var(--glow-accent)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)", expo: "var(--ease-out-expo)",
      },
      maxWidth: { content: "72rem" },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(900%)" },
        },
        "pulse-soft": {
          "0%,100%": { opacity: "1" }, "50%": { opacity: "0.55" },
        },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-up": "fade-up 0.6s var(--ease-out-expo) both",
        "fade-in": "fade-in 0.5s ease-out both",
        scan: "scan 1.1s var(--ease-out) infinite",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
