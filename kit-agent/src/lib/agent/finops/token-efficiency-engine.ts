import type { AgentFinOps } from "@/lib/agent/types";
import { usdCostForTokens } from "@/lib/agent/pricing";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";

/**
 * KIT 정적 페다고지·시스템 블록이 프롬프트 캐시 적중 시 절감되는 입력 비중(가정, CFO 시뮬).
 */
const PROMPT_CACHE_EFFECTIVE_INPUT_REDUCTION = 0.28;

type InjectionMetrics = {
  estimatedSavedTokens: number;
};

export interface MeasuredMetrics {
  actual_input_tokens: number;
  cached_tokens_hit: number;
  execution_time_ms: number;
}

export function calculateActualEfficiency(params: {
  modelId: string;
  usage: LlmUsageRecord;
  traditionalTokens: number;
}): {
  traditionalTokens: number;
  optimizedTokens: number;
  savingsPercentage: number;
  dollarsSaved: number;
  metrics: MeasuredMetrics;
} | null {
  const actual = params.usage.inputTokens;
  if (actual <= 0) return null;
  const cached = Math.max(0, params.usage.cachedTokensHit ?? 0);
  const execution = Math.max(0, params.usage.executionTimeMs ?? 0);
  const optimizedTokens = Math.max(1, actual - cached);
  const traditionalTokens = Math.max(params.traditionalTokens, optimizedTokens + 1);
  const savingsPercentage = Math.min(
    100,
    Math.max(
      0,
      Math.round(((traditionalTokens - optimizedTokens) / Math.max(1, traditionalTokens)) * 100),
    ),
  );
  const dollarsSaved = Math.max(
    0,
    usdCostForTokens(params.modelId, traditionalTokens, 0) -
      usdCostForTokens(params.modelId, optimizedTokens, 0),
  );
  return {
    traditionalTokens,
    optimizedTokens,
    savingsPercentage,
    dollarsSaved,
    metrics: {
      actual_input_tokens: actual,
      cached_tokens_hit: cached,
      execution_time_ms: execution,
    },
  };
}

/**
 * Hypothetical Full Cost vs Actual Optimized Cost (Variable Injection + Prompt Caching).
 */
export function computeTokenEfficiencyEngine(params: {
  usage: LlmUsageRecord;
  injection: InjectionMetrics | null;
}): AgentFinOps | null {
  const { usage, injection } = params;
  const modelId = usage.modelId;
  const actualInputTokens = usage.inputTokens;
  if (actualInputTokens <= 0) return null;

  const savedByVariableInjection = injection?.estimatedSavedTokens ?? 0;

  const traditionalTokens = actualInputTokens + savedByVariableInjection;

  let optimizedTokens = Math.max(
    1,
    Math.round(actualInputTokens * (1 - PROMPT_CACHE_EFFECTIVE_INPUT_REDUCTION)),
  );
  if (traditionalTokens > 1) {
    optimizedTokens = Math.min(optimizedTokens, traditionalTokens - 1);
  }

  const denom = Math.max(1, traditionalTokens);
  const savingsPercentage = Math.min(
    100,
    Math.max(0, Math.round(((traditionalTokens - optimizedTokens) / denom) * 100)),
  );

  const dollarTraditional = usdCostForTokens(modelId, traditionalTokens, 0);
  const dollarOptimized = usdCostForTokens(modelId, optimizedTokens, 0);
  const dollarsSaved = Math.max(0, dollarTraditional - dollarOptimized);

  const measured = calculateActualEfficiency({
    modelId,
    usage,
    traditionalTokens,
  });

  const efficiencySummary = buildFinOpsEfficiencySummary({
    projectedSavingsPct: savingsPercentage,
    measuredSavingsPct: measured?.savingsPercentage ?? null,
    hadVariableInjection: savedByVariableInjection > 0,
    measuredCacheHit: measured?.metrics.cached_tokens_hit ?? 0,
  });

  return {
    estimated_savings: {
      traditionalTokens,
      optimizedTokens,
      savingsPercentage,
      dollarsSaved,
    },
    measured_performance: measured,
    traditionalTokens,
    optimizedTokens,
    savingsPercentage,
    dollarsSaved,
    efficiencySummary,
  };
}

export function buildFinOpsEfficiencySummary(p: {
  projectedSavingsPct: number;
  measuredSavingsPct: number | null;
  hadVariableInjection: boolean;
  measuredCacheHit: number;
}): string {
  const measuredPart =
    p.measuredSavingsPct != null
      ? `Measured reality shows ${p.measuredSavingsPct}% efficiency with ${p.measuredCacheHit} cached prompt tokens hit.`
      : "Measured reality is unavailable (provider did not expose prompt cache headers).";
  if (p.hadVariableInjection) {
    return `Optimization Alert: Variable Injection projected ${p.projectedSavingsPct}% input-token savings by caching the base KIT pedagogy. ${measuredPart}`;
  }
  return `Optimization Alert: Prompt caching on the base KIT pedagogy projected ${p.projectedSavingsPct}% equivalent input-token savings. ${measuredPart}`;
}
