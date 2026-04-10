export interface LlmUsageRecord {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  /** Provider prompt cache hit tokens (if available from usage headers) */
  cachedTokensHit?: number;
  /** End-to-end LLM call time in milliseconds */
  executionTimeMs?: number;
}
