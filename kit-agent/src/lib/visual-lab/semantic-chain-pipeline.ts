import { Buffer } from "node:buffer";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import {
  getEducationalPersonaById,
  type EducationalPersonaId,
} from "@/constants/personas";
import {
  BehavioralLogicGraphSchema,
  Chain4UiBundleSchema,
  EducationalGapSynthesisSchema,
  type BehavioralLogicGraph,
  type Chain4UiBundle,
  type EducationalGapSynthesis,
} from "@/lib/visual-lab/semantic-chain-schema";

const VISION_MODEL =
  process.env.GOOGLE_SEMANTIC_VISION_MODEL ?? "gemini-1.5-pro";
const TEXT_MODEL =
  process.env.GOOGLE_SEMANTIC_TEXT_MODEL ?? "gemini-1.5-flash";

const CHAIN1_SYSTEM = `You are an AI Vision Specialist.
Task: Produce a **high-fidelity extraction** of the attached technical artifact (code, diagram, architecture).
Output: **Markdown only** (no JSON). Korean headings allowed.

Required sections (use these exact H2 titles):
## 1) Visible code lines or component names
- Bullet list: **every** readable identifier, box label, arrow label, class/function name, table cell text.
- For code: preserve line order as sub-bullets under a "Line N:" pattern when line breaks are visible.
- If text is illegible, write \`(판독 불가)\` for that fragment — do not invent.

## 2) Programming language or framework
- State detected language(s) / framework(s) with evidence (keywords, file extension hints in image, logos).
- If uncertain: \`(불확실: …)\`.

## 3) Hierarchical relationships
- Nested bullets describing containment / ownership / call direction / data direction as **shown**, not inferred behavior.

Rules:
- **Do not** interpret business meaning, performance, or security implications in this report.
- Focus on **100% faithful transcription** of what is visible.`;

const BEHAVIORAL_GRAPH_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ["logic_flow", "state_mutations", "critical_path"],
  properties: {
    logic_flow: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ["description"],
        properties: {
          step_id: { type: SchemaType.STRING, nullable: true },
          description: { type: SchemaType.STRING },
          from_node: { type: SchemaType.STRING, nullable: true },
          to_node: { type: SchemaType.STRING, nullable: true },
        },
      },
    },
    state_mutations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ["entity", "mutation_summary"],
        properties: {
          entity: { type: SchemaType.STRING },
          mutation_summary: { type: SchemaType.STRING },
          trigger: { type: SchemaType.STRING, nullable: true },
        },
      },
    },
    critical_path: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ["label", "decision_type"],
        properties: {
          label: { type: SchemaType.STRING },
          decision_type: { type: SchemaType.STRING },
          detail: { type: SchemaType.STRING, nullable: true },
        },
      },
    },
  },
};

const CHAIN3_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ["gaps"],
  properties: {
    gaps: {
      type: SchemaType.ARRAY,
      minItems: 3,
      maxItems: 3,
      items: {
        type: SchemaType.OBJECT,
        required: [
          "learning_objective",
          "common_misconception",
          "socratic_question",
        ],
        properties: {
          learning_objective: { type: SchemaType.STRING },
          common_misconception: { type: SchemaType.STRING },
          socratic_question: { type: SchemaType.STRING },
        },
      },
    },
  },
};

function stripFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json|tsx|typescript|ts|jsx)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

function normalizeMime(m: string): string {
  const s = m.trim().toLowerCase();
  if (s === "image/jpg") return "image/jpeg";
  return s || "image/png";
}

function mockChain1(): string {
  return [
    "## 1) Visible code lines or component names",
    "- (데모) `fetchUser`, `useEffect`, `API_URL` 라벨이 보이는 스냅샷을 가정합니다.",
    "",
    "## 2) Programming language or framework",
    "- TypeScript / React (불확실 시 실제 이미지로 대체)",
    "",
    "## 3) Hierarchical relationships",
    "- UI 컴포넌트 → 훅 → 네트워크 레이어 (이미지에 그려진 화살표 순서만 기술)",
  ].join("\n");
}

function mockGraph(): BehavioralLogicGraph {
  return {
    logic_flow: [
      {
        step_id: "1",
        description: "클라이언트가 API에 요청을 전송",
        from_node: "UI",
        to_node: "API",
      },
      {
        step_id: "2",
        description: "서버가 응답 본문을 구성",
        from_node: "API",
        to_node: "Client",
      },
    ],
    state_mutations: [
      {
        entity: "requestStatus",
        mutation_summary: "idle → loading → success | error",
        trigger: "fetch 호출 및 완료",
      },
    ],
    critical_path: [
      {
        label: "HTTP 오류 분기",
        decision_type: "if-else",
        detail: "status 코드에 따른 처리",
      },
      {
        label: "외부 서비스 호출",
        decision_type: "api",
        detail: "네트워크 경계",
      },
    ],
  };
}

function mockGaps(): EducationalGapSynthesis {
  return {
    gaps: [
      {
        learning_objective: "비동기 상태 전이를 순서도와 코드에 동시에 매핑한다.",
        common_misconception: "로딩 중에도 이전 성공 데이터를 안전하게 재사용할 수 있다고 가정한다.",
        socratic_question:
          "같은 버튼을 연속으로 눌렀을 때, 서버는 몇 번의 부수 효과를 기대하는 게 자연스러울까요?",
      },
      {
        learning_objective: "에러 경로에서 사용자에게 노출할 정보의 최소 집합을 정한다.",
        common_misconception: "스택 트레이스 전체를 그대로 보여주는 것이 투명성이라고 생각한다.",
        socratic_question:
          "운영자와 학습자가 각각 꼭 알아야 하는 정보는 어떻게 나누는 게 좋을까요?",
      },
      {
        learning_objective: "캐시와 소스 오브 트루스의 관계를 설명한다.",
        common_misconception: "캐시를 끄면 일관성 문제가 모두 사라진다고 본다.",
        socratic_question:
          "캐시가 없을 때 네트워크 비용은 어떤 모양으로 변하고, 그 대가로 얻는 것은 무엇인가요?",
      },
    ],
  };
}

function mockChain4(personaId: string, personaName: string): Chain4UiBundle {
  return {
    persona_id: personaId,
    listen_with_my_voice_script_placeholder:
      `[Listen with My Voice · 데모]\n안녕하세요, ${personaName} 톤으로 방금 퀴즈의 핵심을 짚어 드릴게요. 정답이었다면 작은 축하 인사를, 오답이었다면 같은 길을 함께 다시 걷자는 격려를 넣어 주세요. 실제 합성에는 영문 TTS 지침(userVoiceTtsInstructions)을 함께 전달합니다.`,
    component_tsx: `"use client";
import { motion } from "framer-motion";
/** 데모: 실제 키가 있으면 모델이 이 슬롯을 채웁니다. */
export default function DemoZenQuiz() {
  return (
    <motion.div whileTap={{ y: 2 }} className="rounded-2xl border p-4">
      <p>${personaName} 스타일 퀴즈 카드 플레이스홀더</p>
    </motion.div>
  );
}`,
    preview_items: [
      {
        id: "p1",
        stem: `${personaName}의 비유로, '로딩 상태'가 주방에서 어떤 역할과 가장 닮았을까요?`,
        choices: ["재료 손질 중 표시등", "완성 접시", "계산서"],
        correct_index: 0,
        persona_feedback_correct: "맞아요. 손질 중일 때 기대를 잡아 주는 게 로딩 UI와 같아요.",
        persona_feedback_wrong: "괜찮아요. 다시 생각해 보면, 완성 접시는 성공 응답에 더 가깝답니다.",
      },
    ],
  };
}

export async function runChain1VisualSemantic(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<{ markdown: string; demo: boolean; modelId: string }> {
  if (!process.env.GOOGLE_API_KEY) {
    return { markdown: mockChain1(), demo: true, modelId: "mock" };
  }
  const gen = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = gen.getGenerativeModel({
    model: VISION_MODEL,
    systemInstruction: CHAIN1_SYSTEM,
    generationConfig: { temperature: 0.05, maxOutputTokens: 8192 },
  });
  const res = await model.generateContent([
    {
      inlineData: {
        data: input.buffer.toString("base64"),
        mimeType: normalizeMime(input.mimeType),
      },
    },
    { text: "첨부 이미지에 대해 지시된 마크다운 보고서만 작성하세요." },
  ]);
  const markdown = (res.response.text() ?? "").trim() || mockChain1();
  return { markdown, demo: false, modelId: VISION_MODEL };
}

export async function runChain2BehavioralGraph(chain1Markdown: string): Promise<{
  graph: BehavioralLogicGraph;
  demo: boolean;
  modelId: string;
}> {
  if (!process.env.GOOGLE_API_KEY) {
    return { graph: mockGraph(), demo: true, modelId: "mock" };
  }
  const gen = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = gen.getGenerativeModel({
    model: TEXT_MODEL,
    systemInstruction: `You are a Technical Logic Architect.
Transform the extraction report into a **Behavioral Logic Graph** JSON only.
Focus on **flow** and **state changes** (data in → processing → out).
Mark **Critical Decision Points**: if-else, switch, API boundaries, loops.
Language for strings: **Korean** where natural; technical identifiers may stay as in source.
Output must match the JSON schema exactly.`,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: BEHAVIORAL_GRAPH_SCHEMA,
    },
  });
  const res = await model.generateContent(
    `Chain 1 Markdown Report:\n\n${chain1Markdown.slice(0, 120_000)}`,
  );
  const raw = res.response.text() ?? "{}";
  const graph = BehavioralLogicGraphSchema.parse(JSON.parse(raw));
  return { graph, demo: false, modelId: TEXT_MODEL };
}

export async function runChain3EducationalGaps(graph: BehavioralLogicGraph): Promise<{
  synthesis: EducationalGapSynthesis;
  demo: boolean;
  modelId: string;
}> {
  if (!process.env.GOOGLE_API_KEY) {
    return { synthesis: mockGaps(), demo: true, modelId: "mock" };
  }
  const gen = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = gen.getGenerativeModel({
    model: TEXT_MODEL,
    systemInstruction: `You are a Senior Educational Content Designer for a **Zen** learning product.
From the Behavioral Logic Graph, pick the **three** hardest concepts for a **junior developer**.
For each gap output:
- learning_objective
- common_misconception
- socratic_question (must **not** reveal the direct answer; guide reasoning)

JSON only. Exactly 3 gaps.`,
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: CHAIN3_SCHEMA,
    },
  });
  const res = await model.generateContent(
    `Behavioral Logic Graph:\n${JSON.stringify(graph).slice(0, 80_000)}`,
  );
  const raw = res.response.text() ?? "{}";
  const synthesis = EducationalGapSynthesisSchema.parse(JSON.parse(raw));
  return { synthesis, demo: false, modelId: TEXT_MODEL };
}

export async function runChain4UiBundle(input: {
  graph: BehavioralLogicGraph;
  synthesis: EducationalGapSynthesis;
  personaId: EducationalPersonaId;
}): Promise<{ bundle: Chain4UiBundle; demo: boolean; modelId: string }> {
  const persona = getEducationalPersonaById(input.personaId);
  const personaName = persona?.name ?? "튜터";
  const personaVoice = [
    persona?.shortDescription ?? "",
    persona?.emotionalLine ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!process.env.GOOGLE_API_KEY) {
    return {
      bundle: mockChain4(input.personaId, personaName),
      demo: true,
      modelId: "mock",
    };
  }

  const gen = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = gen.getGenerativeModel({
    model: TEXT_MODEL,
    systemInstruction: `You are a persona-driven UX engineer.
Generate **JSON only** (no markdown) with keys:
- component_tsx: string — a **self-contained** React function component named \`ZenPersonaQuiz\` using **framer-motion** (\`import { motion } from "framer-motion"\`) and **React** (\`import * as React from "react"\` or \`import { useState } from "react"\`).
  The component must encode the quiz from preview_items (or embed them as a const). Include tactile **whileTap={{ y: 2, scale: 0.99 }}** on choices; on wrong answer animate **x** shake keyframes; on correct a soft **boxShadow** pulse.
  Use only browser-safe code; no fetch in useEffect required.
- listen_with_my_voice_script_placeholder: Korean script (~20–35s spoken) summarizing the **correct** idea; end with a sentence slot for user-specific voice timbre via TTS instruction placeholder \`{{USER_VOICE_TTS_INSTRUCTIONS}}\`.
- preview_items: 2–4 multiple-choice items derived from the gaps (short stems, 3 choices each, correct_index 0-based).
- persona_id: string (echo "${input.personaId}")

Persona style to apply in stems/feedback: **${personaName}** — ${personaVoice}

Behavioral graph + gaps are authoritative for technical content.`,
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const payload = {
    behavioral_logic_graph: input.graph,
    educational_gaps: input.synthesis,
    current_persona: input.personaId,
    persona_display_name: personaName,
  };

  const res = await model.generateContent(JSON.stringify(payload).slice(0, 100_000));
  const raw = stripFence(res.response.text() ?? "{}");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      bundle: mockChain4(input.personaId, personaName),
      demo: true,
      modelId: TEXT_MODEL,
    };
  }
  const safe = Chain4UiBundleSchema.safeParse(parsed);
  if (!safe.success) {
    return {
      bundle: mockChain4(input.personaId, personaName),
      demo: true,
      modelId: TEXT_MODEL,
    };
  }
  return {
    bundle: { ...safe.data, persona_id: input.personaId },
    demo: false,
    modelId: TEXT_MODEL,
  };
}

export type SemanticChainFullResult = {
  chain1_markdown: string;
  chain2_graph: BehavioralLogicGraph;
  chain3_synthesis: EducationalGapSynthesis;
  chain4_bundle: Chain4UiBundle;
  demo: boolean;
  models: { chain1: string; chain2: string; chain3: string; chain4: string };
};

export async function runSemanticChainFull(input: {
  buffer: Buffer;
  mimeType: string;
  personaId: EducationalPersonaId;
}): Promise<SemanticChainFullResult> {
  const c1 = await runChain1VisualSemantic(input);
  const c2 = await runChain2BehavioralGraph(c1.markdown);
  const c3 = await runChain3EducationalGaps(c2.graph);
  const c4 = await runChain4UiBundle({
    graph: c2.graph,
    synthesis: c3.synthesis,
    personaId: input.personaId,
  });

  return {
    chain1_markdown: c1.markdown,
    chain2_graph: c2.graph,
    chain3_synthesis: c3.synthesis,
    chain4_bundle: c4.bundle,
    demo: c1.demo || c2.demo || c3.demo || c4.demo,
    models: {
      chain1: c1.modelId,
      chain2: c2.modelId,
      chain3: c3.modelId,
      chain4: c4.modelId,
    },
  };
}
