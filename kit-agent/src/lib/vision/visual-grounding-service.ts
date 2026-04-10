import { GoogleGenerativeAI } from "@google/generative-ai";
import { FileState, GoogleAIFileManager } from "@google/generative-ai/server";
import type { VisualGroundingResult } from "@/lib/vision/types";
import {
  mockVisualGrounding,
  parseVisualGroundingJson,
} from "@/lib/vision/parse-grounding-json";

const GROUNDING_PROMPT = `You are a senior vision engineer using visual grounding for museum and classroom media.

Tasks:
1) Identify specific salient objects (artifacts, exhibits, instruments, diagrams, UI elements on slides).
2) Transcribe ALL legible on-screen text in reading order (OCR).
3) Write a concise contextualSummary (2–5 sentences) for a learner: what matters educationally, how objects relate to the text.

Return JSON only (no markdown fences):
{
  "detectedObjects": [
    { "label": "string", "confidence": 0.0-1.0, "description": "string", "spatialHint": "e.g. upper-left|center|lower-right" }
  ],
  "ocrText": "string",
  "contextualSummary": "string"
}`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveVisionModel(): string {
  return process.env.GOOGLE_VISION_MODEL ?? "gemini-1.5-flash";
}

function isVideoMime(mime: string, filename: string): boolean {
  if (mime.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|mpeg|mpg)$/i.test(filename);
}

function isImageMime(mime: string, filename: string): boolean {
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(filename);
}

/**
 * 이미지 또는 짧은 영상에 대해 시각 그라운딩 JSON을 생성합니다.
 * 영상은 Files API 업로드 후 동일 모델로 분석합니다.
 */
export async function analyzeVisualGrounding(input: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<VisualGroundingResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return mockVisualGrounding(input.filename);
  }

  const mime = input.mimeType || "application/octet-stream";
  const modelName = resolveVisionModel();
  const gen = new GoogleGenerativeAI(apiKey);
  const model = gen.getGenerativeModel({ model: modelName });

  if (isImageMime(mime, input.filename)) {
    const result = await model.generateContent([
      {
        inlineData: {
          data: input.buffer.toString("base64"),
          mimeType: mime || "image/png",
        },
      },
      { text: GROUNDING_PROMPT },
    ]);
    const text = result.response.text() ?? "{}";
    return parseVisualGroundingJson(text);
  }

  if (isVideoMime(mime, input.filename)) {
    const fm = new GoogleAIFileManager(apiKey);
    const upload = await fm.uploadFile(input.buffer, {
      mimeType: mime || "video/mp4",
      displayName: input.filename.slice(0, 200),
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
      const result = await model.generateContent([
        {
          fileData: {
            fileUri: upload.file.uri,
            mimeType: upload.file.mimeType,
          },
        },
        { text: GROUNDING_PROMPT },
      ]);
      const text = result.response.text() ?? "{}";
      return parseVisualGroundingJson(text);
    } finally {
      await fm.deleteFile(upload.file.name).catch(() => {});
    }
  }

  throw new Error(
    "지원하지 않는 미디어입니다. image/* 또는 video/mp4 등을 사용하세요.",
  );
}
