import { applyRegexPiiMask } from "@/lib/privacy/pii-regex";

const SCRUB_ATTR = "data-privacy-scrub";

function setScrubUi(active: boolean) {
  if (typeof document === "undefined") return;
  if (active) document.documentElement.setAttribute(SCRUB_ATTR, "1");
  else document.documentElement.removeAttribute(SCRUB_ATTR);
}

export type PiiShieldResult = {
  text: string;
  regexHits: number;
  llmApplied: boolean;
};

/**
 * Visual Lab / Media Studio 등에서 외부 AI API로 보내기 직전 호출.
 * 정규식 1차 후, 옵션이면 `/api/privacy/pii-scan`으로 LLM 2차.
 */
export async function sanitizeForAiOutbound(
  input: string,
  options?: { useClientLlmScan?: boolean },
): Promise<PiiShieldResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { text: "", regexHits: 0, llmApplied: false };
  }
  const { text: rx, replacements } = applyRegexPiiMask(trimmed);
  const wantScan =
    options?.useClientLlmScan === true ||
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_PII_CLIENT_SCAN === "1");

  if (!wantScan || typeof fetch === "undefined") {
    return { text: rx, regexHits: replacements, llmApplied: false };
  }

  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 12_000);
    const res = await fetch("/api/privacy/pii-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rx, useLlm: true }),
      signal: ac.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      return { text: rx, regexHits: replacements, llmApplied: false };
    }
    const data = (await res.json()) as {
      sanitized?: string;
      llmApplied?: boolean;
    };
    return {
      text: typeof data.sanitized === "string" ? data.sanitized : rx,
      regexHits: replacements,
      llmApplied: Boolean(data.llmApplied),
    };
  } catch {
    return { text: rx, regexHits: replacements, llmApplied: false };
  }
}

export async function shieldStringFields<T extends Record<string, unknown>>(
  payload: T,
  keys: (keyof T)[],
  options?: { useClientLlmScan?: boolean },
): Promise<T> {
  setScrubUi(true);
  try {
    const out = { ...payload };
    for (const k of keys) {
      const v = out[k];
      if (typeof v === "string" && v.trim()) {
        const { text } = await sanitizeForAiOutbound(v, options);
        out[k] = text as T[keyof T];
      }
    }
    return out;
  } finally {
    setScrubUi(false);
  }
}
