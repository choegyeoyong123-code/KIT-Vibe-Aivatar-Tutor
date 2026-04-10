import { randomUUID } from "crypto";
import type { MultimodalMaterial } from "@/lib/agent/types";
import { extractPdfForKitMaterial } from "@/lib/pdf/extract-kit-material";
import { buildMasterContextFromLocalMp4 } from "@/lib/agent/ingest/local-mp4-gemini";

export type VideoContextMap = Record<
  string,
  { transcript?: string; visualCues?: string }
>;

export type IngestAgentMaterialsResult =
  | { ok: true; materials: MultimodalMaterial[] }
  | { ok: false; error: string; status: number };

/**
 * /api/agent/run 및 run-stream 에서 공유하는 FormData → 멀티모달 자료 파싱.
 */
export async function ingestAgentMaterialsFromFormData(
  form: FormData,
): Promise<IngestAgentMaterialsResult> {
  let videoContexts: VideoContextMap = {};
  const vc = form.get("videoContexts");
  if (typeof vc === "string" && vc.trim()) {
    try {
      videoContexts = JSON.parse(vc) as VideoContextMap;
    } catch {
      return { ok: false, error: "videoContexts JSON이 올바르지 않습니다.", status: 400 };
    }
  }

  const materials: MultimodalMaterial[] = [];
  const uploaded = form.getAll("files");

  for (const value of uploaded) {
    if (!(value instanceof File) || value.size === 0) continue;

    const name = value.name;
    const mime = value.type || "";
    const buf = Buffer.from(await value.arrayBuffer());

    const isPdf =
      mime === "application/pdf" || name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const extracted = await extractPdfForKitMaterial(buf);
      materials.push({
        kind: "pdf",
        id: randomUUID(),
        filename: name,
        ...extracted,
      });
      continue;
    }

    if (mime.startsWith("video/") || /\.mp4$/i.test(name)) {
      const ctx = videoContexts[name] ?? {};
      let transcript = ctx.transcript;
      let visualCues = ctx.visualCues;
      if (!transcript?.trim() && !visualCues?.trim()) {
        try {
          const enriched = await buildMasterContextFromLocalMp4(
            buf,
            mime || "video/mp4",
            name,
          );
          transcript = enriched.transcriptBlock;
          visualCues = enriched.visualBlock || enriched.raw;
        } catch (e) {
          transcript =
            transcript ??
            `[비디오 분석 오류] ${e instanceof Error ? e.message : String(e)}`;
        }
      }
      materials.push({
        kind: "video",
        id: randomUUID(),
        filename: name,
        transcript,
        visualCues,
      });
      continue;
    }
  }

  if (materials.length === 0) {
    return {
      ok: false,
      error: "PDF 또는 영상 파일을 1개 이상 업로드하세요.",
      status: 400,
    };
  }

  return { ok: true, materials };
}
