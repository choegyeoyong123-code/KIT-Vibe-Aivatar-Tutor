import { PDFParse } from "pdf-parse";

function tableToMarkdown(table: string[][]): string {
  if (!table.length) return "";
  const lines = table.map((row) => `| ${row.join(" | ")} |`);
  const sep = `| ${table[0].map(() => "---").join(" | ")} |`;
  return [lines[0], sep, ...lines.slice(1)].join("\n");
}

/**
 * KIT PDF 강의자료용: 본문 텍스트, 표(가능 시 Markdown), 임베드 이미지 메타(캡션 대용).
 */
export async function extractPdfForKitMaterial(buffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const textResult = await parser.getText();
    let tablesMarkdown = "";
    try {
      const tableResult = await parser.getTable();
      tablesMarkdown = tableResult.mergedTables
        .map((t, i) => `##### 표 ${i + 1}\n\n${tableToMarkdown(t)}`)
        .join("\n\n");
    } catch {
      tablesMarkdown = "(표 추출 실패 또는 표 없음)";
    }

    let imageCaptions = "";
    try {
      const imageResult = await parser.getImage();
      const lines = imageResult.pages.flatMap((p) =>
        p.images.map(
          (img) =>
            `- 페이지 ${p.pageNumber}: 리소스 "${img.name}", ${img.width}×${img.height}px`,
        ),
      );
      imageCaptions = lines.length ? lines.join("\n") : "(임베드 이미지 없음)";
    } catch {
      imageCaptions = "(이미지 메타 추출 실패)";
    }

    const pages = textResult.pages.map((p) => ({
      pageNumber: p.num,
      text: p.text?.trim() ?? "",
    }));

    return {
      rawText: textResult.text,
      tablesMarkdown: tablesMarkdown || "(감지된 표 없음)",
      imageCaptions,
      pages,
    };
  } finally {
    await parser.destroy();
  }
}
