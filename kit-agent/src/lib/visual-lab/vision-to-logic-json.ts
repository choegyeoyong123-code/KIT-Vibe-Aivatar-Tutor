import { Buffer } from "node:buffer";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { LogicGraphJsonSchema, type LogicGraphJson } from "@/lib/visual-lab/logic-graph-schema";

const VISION_LOGIC_MODEL =
  process.env.GOOGLE_VISION_LOGIC_MODEL ?? "gemini-1.5-pro";

const LOGIC_GRAPH_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ["core_logic", "key_entities", "logic_gaps"],
  properties: {
    core_logic: {
      type: SchemaType.STRING,
      description:
        "한국어로, 이미지에 보이는 시스템·코드의 핵심 동작을 2~5문장으로 요약. 추측은 '불확실'로 표기.",
    },
    key_entities: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ["name", "role"],
        properties: {
          name: { type: SchemaType.STRING },
          role: { type: SchemaType.STRING },
          detail: { type: SchemaType.STRING, nullable: true },
        },
      },
      description: "변수·함수·컴포넌트·모듈·데이터 저장소 등 식별 가능한 요소",
    },
    logic_gaps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ["gap"],
        properties: {
          gap: {
            type: SchemaType.STRING,
            description: "학습자가 오해하거나 실수하기 쉬운 지점 (한국어)",
          },
          severity: {
            type: SchemaType.STRING,
            description: "optional: low | medium | high",
            nullable: true,
          },
        },
      },
      description: "오개념·경계 조건·누락된 단계 등",
    },
  },
};

const SYSTEM_INSTRUCTION = `You are a precise vision analyst for technical education.
Rules:
- Output language for all string fields: **Korean**.
- Only describe what is **legible** in the image. If text is unreadable, say so inside core_logic or omit that entity.
- key_entities: concrete names/symbols visible OR clearly inferable from diagram labels (no invented APIs).
- logic_gaps: at least one gap must relate to **student misconceptions** (e.g. off-by-one, null handling, async ordering).
- You MUST return JSON matching the response schema exactly. No markdown, no code fences, no extra keys.`;

function mockLogicGraph(): LogicGraphJson {
  return {
    core_logic:
      "데모 모드입니다. 실제 이미지 분석을 위해 GOOGLE_API_KEY와 Gemini 1.5 Pro 접근을 설정하세요. 다이어그램이 있다면 데이터 흐름과 컴포넌트 경계를 먼저 읽습니다.",
    key_entities: [
      { name: "Client", role: "요청 주체", detail: "UI 또는 API 소비자" },
      { name: "Server", role: "처리 주체", detail: "비즈니스 로직" },
      { name: "DB", role: "저장소", detail: "영속 데이터" },
    ],
    logic_gaps: [
      {
        gap: "인증·권한 단계가 생략되면 중간자 공격에 취약해질 수 있음을 학습자가 놓치기 쉽습니다.",
        severity: "high",
      },
      {
        gap: "에러 경로와 재시도 정책이 다이어그램에 없으면 실패 시 동작을 과대평가하기 쉽습니다.",
        severity: "medium",
      },
    ],
  };
}

export async function parseDiagramToLogicJson(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<{ logic: LogicGraphJson; demo: boolean; modelId: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { logic: mockLogicGraph(), demo: true, modelId: "mock" };
  }

  const mime = input.mimeType?.trim() || "image/png";
  const gen = new GoogleGenerativeAI(apiKey);
  const model = gen.getGenerativeModel({
    model: VISION_LOGIC_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: LOGIC_GRAPH_RESPONSE_SCHEMA,
    },
  });

  const result = await model.generateContent([
    {
      inlineData: {
        data: input.buffer.toString("base64"),
        mimeType: mime === "image/jpg" ? "image/jpeg" : mime,
      },
    },
    {
      text: "위 이미지를 분석하여 스키마에 맞는 JSON만 반환하세요.",
    },
  ]);

  const raw = result.response.text()?.trim() ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini가 유효한 JSON을 반환하지 않았습니다.");
  }

  const logic = LogicGraphJsonSchema.parse(parsed);
  return { logic, demo: false, modelId: VISION_LOGIC_MODEL };
}
