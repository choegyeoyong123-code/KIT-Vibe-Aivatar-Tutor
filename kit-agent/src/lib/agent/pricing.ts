/**
 * USD / 1K tokens (대략적 공개 요금 — 운영 시 CFO_* 환경변수로 덮어쓰기).
 */
const DEFAULT: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  "gpt-4o": { inputPer1k: 0.0025, outputPer1k: 0.01 },
  "gpt-4o-mini": { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  "claude-3-5-sonnet-20241022": { inputPer1k: 0.003, outputPer1k: 0.015 },
  "gemini-1.5-pro": { inputPer1k: 0.00125, outputPer1k: 0.005 },
  "gemini-1.5-flash": { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  "gemini-2.0-flash": { inputPer1k: 0.0001, outputPer1k: 0.0004 },
  mock: { inputPer1k: 0, outputPer1k: 0 },
  "consensus-mock": { inputPer1k: 0, outputPer1k: 0 },
  "consensus-error": { inputPer1k: 0, outputPer1k: 0 },
  "creative-mock": { inputPer1k: 0, outputPer1k: 0 },
};

function envPer1m(name: string): number | undefined {
  const v = process.env[name];
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function usdCostForTokens(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const inPer1m = envPer1m("CFO_INPUT_USD_PER_1M_TOKENS");
  const outPer1m = envPer1m("CFO_OUTPUT_USD_PER_1M_TOKENS");
  if (inPer1m != null && outPer1m != null) {
    return (inputTokens / 1_000_000) * inPer1m + (outputTokens / 1_000_000) * outPer1m;
  }
  const row = DEFAULT[modelId] ?? DEFAULT["gpt-4o"];
  return (
    (inputTokens / 1000) * row.inputPer1k + (outputTokens / 1000) * row.outputPer1k
  );
}
