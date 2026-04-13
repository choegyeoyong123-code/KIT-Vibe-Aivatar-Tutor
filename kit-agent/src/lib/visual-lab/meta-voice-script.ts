import { GoogleGenerativeAI } from "@google/generative-ai";
import { MetaVoiceScriptSchema, type MetaVoiceScript } from "@/lib/visual-lab/logic-graph-schema";

/** Logic JSON + Voice DNA + SSML이 필요하면 `synthesizeRaceChainedAudioScript` 및 `POST /api/visual/race-audio-script` 참고. */

const META_MODEL = process.env.GOOGLE_META_VOICE_MODEL ?? "gemini-1.5-flash";

const SYSTEM = `You write **spoken Korean** scripts for a short audio recap (~30 seconds when read aloud).
Rules:
- JSON only, no markdown. Schema:
  {"script": string, "estimated_seconds": number (25-32), "tone": "buddy_encouraging" | "explorer_celebratory"}
- If user_was_correct is true → tone=explorer_celebratory (짧은 축하 + 개념 강화)
- If false → tone=buddy_encouraging (실수 정상화 + 다음 시도 격려 + 핵심 교정)
- Mention **Listen with My Voice** / 사용자 음색 합성 지침이 있다면 한 문장으로 자연스럽게 녹여낼 것 (과장 금지).
- script: 4~8문장, 존댓말, TTS에 무리 없는 구두점.`;

function mockScript(input: { userWasCorrect: boolean }): MetaVoiceScript {
  return {
    estimated_seconds: 28,
    tone: input.userWasCorrect ? "explorer_celebratory" : "buddy_encouraging",
    script: input.userWasCorrect
      ? "잘했어요! 방금 맞힌 개념은 학습 흐름의 핵심 축이에요. 같은 패턴으로 다음 다이어그램도 빠르게 읽어 내려가 봅시다. 작은 승리를 모으면 큰 그림이 선명해져요."
      : "여기서 헷갈리는 건 아주 흔해요. 오답은 뇌가 연결을 다시 매핑하는 신호예요. 정답 설명을 천천히 따라 가며, 다음엔 한 단계만 더 주의를 두면 충분해요. 포기하지 말고 같은 길을 한 번 더 걸어가요.",
  };
}

export async function buildMetaCognitionVoiceScript(input: {
  userWasCorrect: boolean;
  quizSummary: string;
  correctExplanation: string;
  coreLogic: string;
  /** Media Studio · 내 목소리 TTS에 넘길 영문 지침 (선택) */
  userVoiceTtsInstructions?: string | null;
}): Promise<{ result: MetaVoiceScript; demo: boolean; modelId: string }> {
  if (!process.env.GOOGLE_API_KEY) {
    return {
      result: mockScript({
        userWasCorrect: input.userWasCorrect,
      }),
      demo: true,
      modelId: "mock",
    };
  }

  const gen = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = gen.getGenerativeModel({
    model: META_MODEL,
    systemInstruction: SYSTEM,
    generationConfig: {
      temperature: 0.45,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });

  const user = JSON.stringify({
    user_was_correct: input.userWasCorrect,
    quiz_summary: input.quizSummary,
    correct_explanation: input.correctExplanation,
    core_logic: input.coreLogic,
    user_voice_tts_instructions: input.userVoiceTtsInstructions ?? null,
  });

  const res = await model.generateContent(user);
  const raw = res.response.text()?.trim() ?? "";
  const parsed = MetaVoiceScriptSchema.parse(JSON.parse(raw));
  return { result: parsed, demo: false, modelId: META_MODEL };
}
