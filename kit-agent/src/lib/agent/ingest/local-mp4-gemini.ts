import { GoogleGenerativeAI } from "@google/generative-ai";
import { FileState, GoogleAIFileManager } from "@google/generative-ai/server";

const ANALYSIS_PROMPT = `You are analyzing a KIT (Korea University of Technology and Education style) lecture video.
Return plain text in two sections with these exact headings:

### Transcript-style summary
(Spoken content / narration in order, key terms in Korean where heard.)

### Visual & slide cues
(Diagrams, equations on board, slide titles, on-screen text, demos.)

No marketing, no social media CTAs. If audio is unclear, say "(inaudible)".`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 로컬 mp4 바이너리 → Gemini 1.5 Pro 멀티모달 분석 → 대본형 요약 + 시각 단서.
 * OPENAI 전용 환경에서는 GOOGLE_API_KEY를 추가하거나, UI에서 수동 대본을 입력하세요.
 */
export async function buildMasterContextFromLocalMp4(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<{ transcriptBlock: string; visualBlock: string; raw: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    const msg =
      "[비디오] GOOGLE_API_KEY가 없어 Gemini 멀티모달 분석을 건너뜁니다. PDF·수동 대본을 사용하세요.";
    return {
      transcriptBlock: msg,
      visualBlock: "",
      raw: msg,
    };
  }

  const modelName = process.env.GOOGLE_VIDEO_MODEL ?? "gemini-1.5-pro";
  const fm = new GoogleAIFileManager(apiKey);
  const upload = await fm.uploadFile(buffer, {
    mimeType: mimeType || "video/mp4",
    displayName: filename.slice(0, 200),
  });

  let file = await fm.getFile(upload.file.name);
  for (let i = 0; i < 60 && file.state !== FileState.ACTIVE; i++) {
    await sleep(2000);
    file = await fm.getFile(upload.file.name);
  }
  if (file.state !== FileState.ACTIVE) {
    await fm.deleteFile(upload.file.name).catch(() => {});
    throw new Error(`Gemini 파일 처리 대기 시간 초과: ${file.state}`);
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
      { text: ANALYSIS_PROMPT },
    ]);
    const raw = result.response.text() ?? "";
    const parts = raw.split("### Visual");
    const transcriptBlock = parts[0]?.trim() ?? raw;
    const visualBlock =
      parts.length > 1 ? `### Visual${parts[1]}`.trim() : "";
    return { transcriptBlock, visualBlock, raw };
  } finally {
    await fm.deleteFile(upload.file.name).catch(() => {});
  }
}
