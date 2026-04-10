import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

export interface BackgroundSpec {
  label: string;
  topColor: string;
  bottomColor: string;
}

/** 주제 키워드로 교육용 배경 팔레트 선택 (3D 무덤 / IDE 등). */
export function resolveBackgroundSpec(topicContext: string): BackgroundSpec {
  const t = topicContext.toLowerCase();
  if (
    t.includes("무영") ||
    t.includes("무령") ||
    t.includes("무덤") ||
    t.includes("백제") ||
    t.includes("muyong")
  ) {
    return {
      label: "Ancient stone-chamber tomb (stylized 3D reconstruction)",
      topColor: "#1a1510",
      bottomColor: "#6b5344",
    };
  }
  if (
    t.includes("vibe") ||
    t.includes("코딩") ||
    t.includes("ide") ||
    t.includes("개발")
  ) {
    return {
      label: "Futuristic IDE environment — holographic panels, dark UI",
      topColor: "#020617",
      bottomColor: "#1d4ed8",
    };
  }
  return {
    label: "KIT lecture studio — soft abstract knowledge backdrop",
    topColor: "#0f172a",
    bottomColor: "#4338ca",
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 1280×720 PNG 배경 생성 */
export async function renderBackgroundPng(input: {
  jobId: string;
  spec: BackgroundSpec;
}): Promise<{ absPath: string; publicUrl: string }> {
  const dir = path.join(process.cwd(), "public", "avatar-output", input.jobId);
  await mkdir(dir, { recursive: true });
  const rel = `/avatar-output/${input.jobId}/background.png`;
  const abs = path.join(process.cwd(), "public", rel.replace(/^\//, ""));

  const label = escapeXml(input.spec.label.slice(0, 120));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${input.spec.topColor}"/>
      <stop offset="100%" style="stop-color:${input.spec.bottomColor}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="640" y="56" text-anchor="middle" fill="rgba(255,255,255,0.88)" font-size="26" font-family="system-ui,sans-serif">${label}</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(abs);
  return { absPath: abs, publicUrl: rel };
}
