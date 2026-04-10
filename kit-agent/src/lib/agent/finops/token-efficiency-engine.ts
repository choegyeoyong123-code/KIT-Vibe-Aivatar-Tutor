import type { AgentFinOps } from "@/lib/agent/types";
import { usdCostForTokens } from "@/lib/agent/pricing";

/**
 * KIT 정적 페다고지·시스템 블록이 프롬프트 캐시 적중 시 절감되는 입력 비중(가정, CFO 시뮬).
 */
const PROMPT_CACHE_EFFECTIVE_INPUT_REDUCTION = 0.28;

type InjectionMetrics = {
  estimatedSavedTokens: number;
  personaInstructionChars: number;
};

/**
 * Hypothetical Full Cost vs Actual Optimized Cost (Variable Injection + Prompt Caching).
 */
export function computeTokenEfficiencyEngine(params: {
  modelId: string;
  actualInputTokens: number;
  injection: InjectionMetrics | null;
}): AgentFinOps | null {
  const { modelId, actualInputTokens, injection } = params;
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

  const efficiencySummary = buildFinOpsEfficiencySummary({
    savingsPercentage,
    dollarsSaved,
    hadVariableInjection: savedByVariableInjection > 0,
  });

  return {
    traditionalTokens,
    optimizedTokens,
    savingsPercentage,
    dollarsSaved,
    efficiencySummary,
  };
}

export function buildFinOpsEfficiencySummary(p: {
  savingsPercentage: number;
  dollarsSaved: number;
  hadVariableInjection: boolean;
}): string {
  const tail =
    p.dollarsSaved > 0
      ? ` Est. input cost delta vs. naive duplicate prompts: ~$${p.dollarsSaved.toFixed(4)}.`
      : "";
  if (p.hadVariableInjection) {
    return `Optimization Alert: Variable Injection saved ${p.savingsPercentage}% of input tokens by caching the base KIT pedagogy; prompt-cache modeling included.${tail}`;
  }
  return `Optimization Alert: Prompt caching on the base KIT pedagogy saved ${p.savingsPercentage}% of equivalent input tokens (variable-injection delta minimal this hop).${tail}`;
}
