import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  AgentVerdictSchema,
  type AgentVerdict,
  type LogicGraphJson,
  type ZenQuizPack,
} from "@/lib/visual-lab/logic-graph-schema";

const CRITIC_MODEL =
  process.env.DEBATE_CRITIC_MODEL ?? "claude-3-5-sonnet-20241022";
const EDUCATOR_MODEL =
  process.env.DEBATE_EDUCATOR_MODEL ?? "gemini-1.5-flash";

export type QuizDebateResult = {
  critic: AgentVerdict & { modelId: string };
  educator: AgentVerdict & { modelId: string };
  bothApprove: boolean;
  demo: boolean;
};

function stripJsonFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

function parseVerdict(text: string, label: string): AgentVerdict {
  const raw = stripJsonFence(
    typeof text === "string" ? text : JSON.stringify(text),
  );
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw new Error(`${label}: JSON 파싱 실패`);
  }
  return AgentVerdictSchema.parse(obj);
}

const CRITIC_SYSTEM = `You are Agent A — **The Critic** (technical accuracy).
Review the quiz pack against the logic graph. Look for:
- Factually wrong or unsupported statements vs the logic graph
- Broken code templates, impossible flow orders, or misleading analogies

Return ONLY JSON: {"approve": boolean, "notes": string[]} (Korean notes ok).
If any technical inaccuracy exists, approve=false with concrete notes.`;

const EDUCATOR_SYSTEM = `You are Agent B — **The Educator** (Zen learning experience).
Review difficulty, clarity, and cognitive load for a calm "Zen" session:
- Not too many jargon jumps per item; hints should scaffold without spoiling
- buddy_hint should be warm; detective_deep_dive should teach, not shame

Return ONLY JSON: {"approve": boolean, "notes": string[]} (Korean notes ok).
If the set feels too harsh, noisy, or exam-like for Zen practice, approve=false.`;

function mockApprove(): QuizDebateResult {
  return {
    critic: {
      approve: true,
      notes: ["데모: 기술 검증을 건너뜁니다."],
      modelId: "mock-critic",
    },
    educator: {
      approve: true,
      notes: ["데모: 난이도 검증을 건너뜁니다."],
      modelId: "mock-educator",
    },
    bothApprove: true,
    demo: true,
  };
}

export async function runQuizAgentDebate(input: {
  logic: LogicGraphJson;
  pack: ZenQuizPack;
}): Promise<QuizDebateResult> {
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasGoogle = Boolean(process.env.GOOGLE_API_KEY);
  if (!hasAnthropic || !hasGoogle) {
    return mockApprove();
  }

  const payload = JSON.stringify(
    { logic_graph: input.logic, quiz_pack: input.pack },
    null,
    2,
  );

  const critic = new ChatAnthropic({
    model: CRITIC_MODEL,
    temperature: 0.1,
    maxTokens: 1200,
  });
  const criticRes = await critic.invoke([
    new SystemMessage(CRITIC_SYSTEM),
    new HumanMessage(payload),
  ]);
  const criticText =
    typeof criticRes.content === "string"
      ? criticRes.content
      : JSON.stringify(criticRes.content);
  const criticVerdict = parseVerdict(criticText, "Critic");

  const educator = new ChatGoogleGenerativeAI({
    model: EDUCATOR_MODEL,
    temperature: 0.15,
    json: true,
  });
  const eduRes = await educator.invoke([
    new SystemMessage(EDUCATOR_SYSTEM),
    new HumanMessage(payload),
  ]);
  const eduText =
    typeof eduRes.content === "string"
      ? eduRes.content
      : JSON.stringify(eduRes.content);
  const educatorVerdict = parseVerdict(eduText, "Educator");

  const bothApprove = criticVerdict.approve && educatorVerdict.approve;

  return {
    critic: { ...criticVerdict, modelId: CRITIC_MODEL },
    educator: { ...educatorVerdict, modelId: EDUCATOR_MODEL },
    bothApprove,
    demo: false,
  };
}
