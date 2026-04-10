import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";

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

export interface ConsensusLLMResult {
  text: string;
  usage: LlmUsageRecord;
}

/**
 * 2차(저비용) LLM — 주 모델 요약의 교육적 환각 여부를 감사합니다.
 */
export async function runConsensusAuditorLLM(
  system: string,
  user: string,
): Promise<ConsensusLLMResult> {
  if (process.env.OPENAI_API_KEY) {
    const modelId = process.env.CONSENSUS_MODEL ?? "gpt-4o-mini";
    const model = new ChatOpenAI({
      model: modelId,
      temperature: 0.1,
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
  if (process.env.GOOGLE_API_KEY) {
    const modelId = process.env.CONSENSUS_GOOGLE_MODEL ?? "gemini-2.0-flash";
    const model = new ChatGoogleGenerativeAI({
      model: modelId,
      temperature: 0.1,
    });
    const res = await model.invoke([
      new SystemMessage(system),
      new HumanMessage(user),
    ]);
    const text =
      typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    return { text, usage: readUsage(res, modelId) };
  }
  return {
    text: JSON.stringify({
      trustScore: 88,
      educationHallucinations: [],
      groundedEnough: true,
      refinementInstructions: "",
    }),
    usage: { inputTokens: 200, outputTokens: 120, modelId: "consensus-mock" },
  };
}
