import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";
import type { CreativeIntent } from "@/lib/agent/creative/types";
import { buildCreativeEducationalPrompt } from "@/lib/agent/prompts/creative-educational";
import { applyProviderEnvAliases } from "@/lib/bootstrap-env";

applyProviderEnvAliases();

function readUsage(
  res: { usage_metadata?: { input_tokens?: number; output_tokens?: number } },
  modelId: string,
): LlmUsageRecord {
  const u = res.usage_metadata;
  return {
    inputTokens: u?.input_tokens ?? 0,
    outputTokens: u?.output_tokens ?? 0,
    modelId,
  };
}

const CLAUDE_CREATIVE =
  process.env.ANTHROPIC_CREATIVE_MODEL ?? "claude-3-5-sonnet-20241022";

/**
 * 크리에이티브 교육 콘텐츠(퀴즈·랩·쇼츠 대본). 기본 Claude 3.5 Sonnet, 없으면 OpenAI.
 */
export async function runCreativeEducationalLLM(input: {
  intent: CreativeIntent;
  visualContextJson: string;
  userGoal?: string;
}): Promise<{ text: string; usage: LlmUsageRecord }> {
  const { system, user } = buildCreativeEducationalPrompt(input);

  if (process.env.ANTHROPIC_API_KEY) {
    const model = new ChatAnthropic({
      model: CLAUDE_CREATIVE,
      temperature: 0.75,
      maxTokens: 4096,
    });
    const res = await model.invoke([
      new SystemMessage(system),
      new HumanMessage(user),
    ]);
    const text =
      typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    return { text, usage: readUsage(res, CLAUDE_CREATIVE) };
  }

  if (process.env.OPENAI_API_KEY) {
    const modelId =
      process.env.OPENAI_CREATIVE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o";
    const model = new ChatOpenAI({
      model: modelId,
      temperature: 0.75,
      modelKwargs: { response_format: { type: "json_object" } },
    });
    const res = await model.invoke([
      new SystemMessage(system),
      new HumanMessage(user),
    ]);
    const text =
      typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    return { text, usage: readUsage(res, modelId) };
  }

  const mock = {
    kind: input.intent,
    title: "(데모) 크리에이티브 출력",
    ...(input.intent === "quiz"
      ? {
          questions: [
            {
              id: "d1",
              prompt: "VISUAL_CONTEXT에 없는 사실을 지어내지 말아야 하는 이유는?",
              choices: ["학습 신뢰", "속도", "파일 크기", "색상"],
              correctAnswer: "학습 신뢰",
              explanation: "교육 정확도가 우선입니다.",
            },
          ],
        }
      : input.intent === "rap"
        ? {
            hook: "Yo — watch the frame, read the label, that’s the lesson!",
            verses: [
              "Artifacts on screen, text beside — connect the meaning, take the ride.",
              "No cap, just facts from the visual track, educational bars never whack.",
            ],
            teachingObjective: "객체와 주변 텍스트를 연결해 이해한다.",
          }
        : {
            estimatedDurationSec: 30,
            scenes: [
              {
                beat: "0-10s",
                narration: "화면 속 객체와 글자를 짚으며 핵심 용어를 소개합니다.",
                onScreenVisuals: "클로즈업 컷 + 라벨 하이라이트",
              },
            ],
          }),
  };
  return {
    text: JSON.stringify(mock),
    usage: { inputTokens: 300, outputTokens: 220, modelId: "creative-mock" },
  };
}
