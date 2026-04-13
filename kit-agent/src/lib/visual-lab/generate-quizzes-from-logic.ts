import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ZenQuizPackSchema,
  type LogicGraphJson,
  type ZenQuizPack,
} from "@/lib/visual-lab/logic-graph-schema";

const QUIZ_MODEL = process.env.GOOGLE_ZEN_QUIZ_MODEL ?? "gemini-1.5-flash";

const QUIZ_SYSTEM = `You are an educational UX content designer for software learners.
Output **only** valid JSON (no markdown fences) matching this shape:
{
  "quizzes": [
    { "type":"fill_blank", "id": string, "prompt": string, "code_template": string (use _____ for blanks),
      "acceptable_answers": string[], "buddy_hint": string, "detective_deep_dive": string },
    { "type":"flow_sequence", "id": string, "prompt": string, "steps": string[] (>=2),
      "correct_order": number[] (permutation of indices 0..steps.length-1),
      "buddy_hint": string, "detective_deep_dive": string },
    { "type":"analogy_match", "id": string, "prompt": string, "technical_term": string,
      "correct_analogy": string, "distractors": string[] (>=1 wrong analogies),
      "buddy_hint": string, "detective_deep_dive": string }
  ]
}
Rules:
- Exactly **3** quizzes, **one of each type**, order: fill_blank, flow_sequence, analogy_match.
- buddy_hint: warm, concise Korean — "Buddy" 페르소나처럼 격려·힌트.
- detective_deep_dive: Korean — "Detective" 페르소나처럼 논리·증거·오개념 교정.
- Ground all content in the provided logic JSON; do not invent libraries not implied there.
- acceptable_answers: lowercase/trim tolerant matching (include key variants).
- analogy_match must tie to the **selected persona flavor** in the user payload (e.g. cooking ↔ modules if persona says so).`;

function mockQuizPack(logic: LogicGraphJson): ZenQuizPack {
  const e0 = logic.key_entities[0]?.name ?? "엔티티 A";
  return {
    quizzes: [
      {
        type: "fill_blank",
        id: "qb1",
        prompt: `${e0}와 관련된 기본 문법을 완성하세요.`,
        code_template: `const _____ = await fetch('/api/health');`,
        acceptable_answers: ["res", "response", "r"],
        buddy_hint: "한 칸만 비워 두었어요. 네트워크 응답을 담는 이름을 떠올려 봐요!",
        detective_deep_dive:
          "`fetch`는 Promise를 반환하므로 `await`로 풀면 Response 객체가 됩니다. 변수명은 팀 컨벤션에 맞추되 의미가 드러나게 짓는 것이 핵심입니다.",
      },
      {
        type: "flow_sequence",
        id: "qb2",
        prompt: "다음 단계를 올바른 실행 순서로 맞춰 보세요.",
        steps: ["요청 검증", "비즈니스 로직", "영속화", "응답 반환"],
        correct_order: [0, 1, 2, 3],
        buddy_hint: "사용자 입력이 먼저 안전해져야 그다음이 의미 있어요.",
        detective_deep_dive:
          "검증 없이 로직으로 들어가면 불변식이 깨질 수 있습니다. 저장은 부수효과이므로 로직 확정 후가 안전합니다.",
      },
      {
        type: "analogy_match",
        id: "qb3",
        prompt: `${logic.core_logic.slice(0, 80)}… 맥락에서 '${e0}'에 가장 가까운 비유를 고르세요.`,
        technical_term: e0,
        correct_analogy: "주방에서 준비된 재료 상자",
        distractors: ["무작위 난수", "CSS 색상 코드"],
        buddy_hint: "그림 속 역할을 일상으로 옮겨 보면 감이 와요.",
        detective_deep_dive:
          "비유는 **구조적 대응**이 있어야 합니다. 저장·전달 역할이면 '상자/파이프' 계열이, 순수 계산이면 다른 비유가 맞습니다.",
      },
    ],
  };
}

function stripJsonFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

async function runGeminiJson(userPayload: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY 없음");

  const gen = new GoogleGenerativeAI(apiKey);
  const model = gen.getGenerativeModel({
    model: QUIZ_MODEL,
    systemInstruction: QUIZ_SYSTEM,
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const res = await model.generateContent(userPayload);
  return res.response.text() ?? "";
}

export async function generateQuizzesFromLogicGraph(input: {
  logic: LogicGraphJson;
  /** 페르소나 기반 비유 시드 (예: metaphor_mage → 요리·동화) */
  personaAnalogySeed?: string;
  /** 토론 에이전트 피드백으로 재생성 시 주입 */
  repairNotes?: string[];
}): Promise<{ pack: ZenQuizPack; demo: boolean; modelId: string }> {
  if (!process.env.GOOGLE_API_KEY) {
    return { pack: mockQuizPack(input.logic), demo: true, modelId: "mock" };
  }

  const payload = {
    logic_graph: input.logic,
    persona_analogy_seed:
      input.personaAnalogySeed ??
      "학습자 친화 비유: 일상 도구·요리·여행에 비유해 구조를 설명합니다.",
    repair_notes: input.repairNotes ?? [],
  };

  let raw = stripJsonFence(await runGeminiJson(JSON.stringify(payload)));
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("퀴즈 JSON 파싱 실패");
  }

  const first = ZenQuizPackSchema.safeParse(parsed);
  if (first.success) {
    return { pack: first.data, demo: false, modelId: QUIZ_MODEL };
  }

  const repair = await runGeminiJson(
    JSON.stringify({
      ...payload,
      validation_errors: first.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      instruction: "Fix JSON to satisfy schema. Same 3 quiz types.",
    }),
  );
  raw = stripJsonFence(repair);
  parsed = JSON.parse(raw);
  const second = ZenQuizPackSchema.parse(parsed);
  return { pack: second, demo: false, modelId: QUIZ_MODEL };
}
