import type { MultimodalMaterial } from "@/lib/agent/types";

/**
 * 영상·PDF 슬롯을 단일 Master Context 문자열로 병합 (증류·검증 노드 공통 입력).
 */
export function buildMasterContext(materials: MultimodalMaterial[]): string {
  const blocks: string[] = [];
  for (const m of materials) {
    if (m.kind === "video") {
      blocks.push(
        [
          `### VIDEO: ${m.filename ?? m.id}`,
          m.uri ? `- uri: ${m.uri}` : "",
          "#### Transcript",
          m.transcript?.trim() || "(대본 없음 — 멀티모달 모델로 생성된 visualCues만 활용)",
          "#### Visual / slide cues (GPT-4o·Gemini 등에서 추출)",
          m.visualCues?.trim() || "(시각 단서 없음)",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    } else {
      blocks.push(
        [
          `### PDF: ${m.filename ?? m.id}`,
          m.uri ? `- uri: ${m.uri}` : "",
          "#### Body text",
          m.rawText?.trim() || "(본문 텍스트 없음)",
          "#### Tables (Markdown)",
          m.tablesMarkdown?.trim() || "(표 추출 없음)",
          "#### Figure / image captions",
          m.imageCaptions?.trim() || "(캡션 없음)",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }
  return blocks.join("\n\n---\n\n");
}
