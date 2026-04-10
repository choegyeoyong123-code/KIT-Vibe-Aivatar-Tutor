import type { DetectedObject, VisualGroundingResult } from "@/lib/vision/types";

function asObjects(raw: unknown): DetectedObject[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (!o || typeof o !== "object") return null;
      const x = o as Record<string, unknown>;
      const label = String(x.label ?? "").trim();
      if (!label) return null;
      const confidence =
        typeof x.confidence === "number"
          ? Math.min(1, Math.max(0, x.confidence))
          : undefined;
      return {
        label,
        confidence,
        description:
          typeof x.description === "string" ? x.description : undefined,
        spatialHint:
          typeof x.spatialHint === "string" ? x.spatialHint : undefined,
      };
    })
    .filter(Boolean) as DetectedObject[];
}

export function parseVisualGroundingJson(raw: string): VisualGroundingResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const p = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      detectedObjects: asObjects(p.detectedObjects),
      ocrText: String(p.ocrText ?? "").trim(),
      contextualSummary: String(p.contextualSummary ?? "").trim(),
    };
  } catch {
    return {
      detectedObjects: [],
      ocrText: "",
      contextualSummary: cleaned.slice(0, 2000),
    };
  }
}

export function mockVisualGrounding(filename: string): VisualGroundingResult {
  return {
    detectedObjects: [
      {
        label: "(데모) 교육용 표본",
        confidence: 0.5,
        description: "GOOGLE_API_KEY 없이 반환된 목 데이터입니다.",
        spatialHint: "center",
      },
    ],
    ocrText: `[데모 OCR] ${filename}`,
    contextualSummary:
      "API 키를 설정하면 Gemini 1.5 Flash가 실제 객체·텍스트·맥락을 구조화합니다.",
  };
}
