import { randomUUID } from "crypto";
import type {
  MultimodalMaterial,
  PdfMaterial,
  SourceMapping,
  VideoMaterial,
} from "@/lib/agent/types";
import { cosineSimilarity, embedTexts } from "@/lib/agent/embeddings/embed";

function segmentVideoTranscript(transcript: string): { text: string; timeLabel: string }[] {
  const lines = transcript.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let currentTime = "—";
  const segments: { text: string; timeLabel: string }[] = [];
  let buf = "";
  const timeRe = /^(\d{1,2}:\d{2})(?:\s*[-–.:]\s*|\s+)/;

  for (const line of lines) {
    const tm = line.match(timeRe);
    if (tm) currentTime = tm[1];
    const rest = tm ? line.slice(tm[0].length).trim() : line;
    if (!rest) continue;
    buf += (buf ? " " : "") + rest;
    if (buf.length >= 220) {
      segments.push({ text: buf.slice(0, 500).trim(), timeLabel: currentTime });
      buf = "";
    }
  }
  if (buf.trim()) segments.push({ text: buf.slice(0, 500).trim(), timeLabel: currentTime });
  return segments.slice(0, 16);
}

function flattenPdfParagraphs(
  pages: NonNullable<PdfMaterial["pages"]>,
): { page: number; text: string }[] {
  const out: { page: number; text: string }[] = [];
  for (const p of pages) {
    const parts = p.text.split(/\n{2,}/).map((x) => x.trim()).filter((x) => x.length > 40);
    for (const para of parts) {
      out.push({ page: p.pageNumber, text: para.slice(0, 1200) });
    }
  }
  return out.slice(0, 80);
}

/**
 * 영상 대본 구간을 임베딩하고 PDF 단락과 코사인 유사도로 정렬합니다.
 */
export async function buildCrossModalSourceMappings(
  materials: MultimodalMaterial[],
): Promise<SourceMapping[]> {
  const pdf = materials.find(
    (m): m is PdfMaterial => m.kind === "pdf" && Boolean(m.pages?.length),
  );
  const videos = materials.filter((m): m is VideoMaterial => m.kind === "video");
  if (!pdf?.pages?.length || videos.length === 0) return [];

  const paragraphs = flattenPdfParagraphs(pdf.pages);
  if (!paragraphs.length) return [];

  const videoChunks: { text: string; timeLabel: string }[] = [];
  for (const v of videos) {
    const t = [v.transcript, v.visualCues].filter(Boolean).join("\n\n").trim();
    if (!t) continue;
    videoChunks.push(...segmentVideoTranscript(t));
  }
  if (!videoChunks.length) return [];

  const toEmbed = [
    ...videoChunks.map((c) => c.text),
    ...paragraphs.map((p) => p.text),
  ];
  const vectors = await embedTexts(toEmbed);
  const vVec = vectors.slice(0, videoChunks.length);
  const pVec = vectors.slice(videoChunks.length);

  const mappings: SourceMapping[] = [];
  for (let i = 0; i < videoChunks.length; i++) {
    let best = 0;
    let bestJ = 0;
    for (let j = 0; j < paragraphs.length; j++) {
      const sim = cosineSimilarity(vVec[i] ?? [], pVec[j] ?? []);
      if (sim > best) {
        best = sim;
        bestJ = j;
      }
    }
    const para = paragraphs[bestJ];
    if (!para) continue;
    mappings.push({
      id: randomUUID(),
      videoTimestampLabel: videoChunks[i].timeLabel,
      videoConceptExcerpt: videoChunks[i].text.slice(0, 280),
      pdfPage: para.page,
      pdfParagraphExcerpt: para.text.slice(0, 320),
      cosineSimilarity: Number(best.toFixed(4)),
    });
  }
  return mappings;
}

export function formatSourceMappingsForPrompt(mappings: SourceMapping[]): string {
  if (!mappings.length) return "(정렬 결과 없음 — 영상 대본과 PDF 페이지 데이터가 모두 필요합니다.)";
  return mappings
    .map(
      (m, i) =>
        `${i + 1}. [Video ${m.videoTimestampLabel}] «${m.videoConceptExcerpt.replace(/\s+/g, " ").slice(0, 120)}…» → PDF p.${m.pdfPage} (cos=${m.cosineSimilarity}) «${m.pdfParagraphExcerpt.replace(/\s+/g, " ").slice(0, 100)}…»`,
    )
    .join("\n");
}
