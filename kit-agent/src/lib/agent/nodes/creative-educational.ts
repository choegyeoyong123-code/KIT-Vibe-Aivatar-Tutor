import type { CreativeIntent } from "@/lib/agent/creative/types";
import { runCreativeEducationalLLM } from "@/lib/agent/llm-creative";
import type { VisualGroundingResult } from "@/lib/vision/types";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";

/**
 * Phase 2: 시각 맥락 요약을 사용자 의도(퀴즈·랩·쇼츠 대본)에 맞는 JSON으로 변환.
 * 기본 모델: Claude 3.5 Sonnet (`ANTHROPIC_API_KEY`).
 */
export async function generateCreativeEducationalContent(input: {
  contextualSummary: string;
  visualGrounding?: VisualGroundingResult | null;
  intent: CreativeIntent;
  userGoal?: string;
}): Promise<{ text: string; usage: LlmUsageRecord }> {
  const visualContextJson = input.visualGrounding
    ? JSON.stringify(
        {
          detectedObjects: input.visualGrounding.detectedObjects,
          ocrText: input.visualGrounding.ocrText,
          contextualSummary: input.visualGrounding.contextualSummary,
        },
        null,
        0,
      )
    : JSON.stringify(
        { contextualSummary: input.contextualSummary },
        null,
        0,
      );
  return runCreativeEducationalLLM({
    intent: input.intent,
    visualContextJson,
    userGoal: input.userGoal,
  });
}
