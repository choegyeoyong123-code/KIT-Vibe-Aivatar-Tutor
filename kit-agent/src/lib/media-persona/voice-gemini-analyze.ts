import { GoogleGenerativeAI } from "@google/generative-ai";
import { FileState, GoogleAIFileManager } from "@google/generative-ai/server";

const VOICE_JSON_PROMPT = `You are an expert audio analyst. Listen to the short voice sample and extract prosody for TTS conditioning.

Return a single JSON object only (no markdown fences), keys:
- "pitch_hz_estimate": number or null (rough fundamental if inferable)
- "pitch_qualitative": string (e.g. "mid-high female", "low male baritone")
- "tone_descriptors": string[] (3-6 adjectives)
- "speaking_rate": string ("slow"|"moderate"|"fast")
- "tts_instructions_en": string (one English paragraph: concrete instructions for a neural TTS to mimic pitch range, timbre, cadence, and emotional baseline — not a transcript of words spoken)

Keep tts_instructions_en under 600 characters.`;

export type VoiceAnalysisResult = {
  pitchHzEstimate: number | null;
  pitchQualitative: string;
  toneDescriptors: string[];
  speakingRate: string;
  ttsInstructionsEn: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseVoiceJson(raw: string): VoiceAnalysisResult {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  let jsonStr = cleaned;
  if (!jsonStr.startsWith("{")) {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) jsonStr = m[0];
  }
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  const desc = parsed.tone_descriptors;
  return {
    pitchHzEstimate:
      typeof parsed.pitch_hz_estimate === "number"
        ? parsed.pitch_hz_estimate
        : null,
    pitchQualitative: String(parsed.pitch_qualitative ?? ""),
    speakingRate: String(parsed.speaking_rate ?? "moderate"),
    toneDescriptors: Array.isArray(desc)
      ? desc.map((x) => String(x))
      : [],
    ttsInstructionsEn: String(parsed.tts_instructions_en ?? "").slice(0, 800),
  };
}

/**
 * Gemini 1.5 Pro 멀티모달 오디오 → 피치·톤 요약 + TTS용 영문 지침.
 * 업로드 파일은 분석 후 즉시 삭제합니다.
 */
export async function analyzeVoiceSampleWithGemini(input: {
  buffer: Buffer;
  mimeType: string;
  filename?: string;
}): Promise<VoiceAnalysisResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY가 설정되어 있지 않아 음성 분석을 수행할 수 없습니다.");
  }

  const modelName =
    process.env.GOOGLE_VOICE_ANALYSIS_MODEL ?? "gemini-1.5-pro";
  const fm = new GoogleAIFileManager(apiKey);
  const mime = input.mimeType || "audio/webm";
  const upload = await fm.uploadFile(input.buffer, {
    mimeType: mime,
    displayName: (input.filename ?? "voice-sample").slice(0, 200),
  });

  let file = await fm.getFile(upload.file.name);
  for (let i = 0; i < 45 && file.state !== FileState.ACTIVE; i++) {
    await sleep(1500);
    file = await fm.getFile(upload.file.name);
  }
  if (file.state !== FileState.ACTIVE) {
    await fm.deleteFile(upload.file.name).catch(() => {});
    throw new Error(`음성 파일 처리 대기 시간 초과: ${file.state}`);
  }

  try {
    const gen = new GoogleGenerativeAI(apiKey);
    const model = gen.getGenerativeModel({ model: modelName });
    const result = await model.generateContent([
      {
        fileData: {
          fileUri: upload.file.uri,
          mimeType: upload.file.mimeType,
        },
      },
      { text: VOICE_JSON_PROMPT },
    ]);
    const text = result.response.text() ?? "{}";
    return parseVoiceJson(text);
  } finally {
    await fm.deleteFile(upload.file.name).catch(() => {});
  }
}

export function mockVoiceAnalysisForDemo(): VoiceAnalysisResult {
  return {
    pitchHzEstimate: 185,
    pitchQualitative: "중간 높이, 밝은 공명",
    toneDescriptors: ["친근함", "명료함", "안정적 리듬", "부드러운 onset"],
    speakingRate: "moderate",
    ttsInstructionsEn:
      "Speak in Korean with a clear, warm mid-range pitch and steady pacing. " +
      "Use gentle upward inflection at phrase boundaries, avoid monotone, and keep consonants crisp without harshness.",
  };
}
