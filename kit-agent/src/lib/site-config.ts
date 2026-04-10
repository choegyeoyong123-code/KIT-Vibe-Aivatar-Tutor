/** Public marketing / SEO strings — KIT Vibe-Coding (submission / judge preview) */

export const SITE_NAME = "KIT Vibe-Coding";
export const SITE_TITLE_DEFAULT = `${SITE_NAME} — AI-Native Learning Platform`;

export const SITE_DESCRIPTION =
  "Enterprise-style multimodal learning stack: LangGraph distillation, CFO/HITL governance, visual grounding, AI avatar lectures, and media studio — built for scale, demos, and contest evaluation.";

export const SITE_KEYWORDS = [
  "KIT",
  "Vibe-Coding",
  "AI-native learning",
  "LangGraph",
  "multimodal",
  "education technology",
  "scalability",
  "HITL",
  "Gemini",
  "Claude",
];

/** Canonical base URL for sitemap, OG, metadataBase (no trailing slash). */
export function siteBaseUrlString(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export function siteMetadataBase(): URL {
  return new URL(`${siteBaseUrlString()}/`);
}
