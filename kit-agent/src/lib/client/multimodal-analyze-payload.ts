/**
 * 클라이언트 전용 — 이미지를 `/api/analyze`에 보내기 좋은 Base64 JSON 형태로 변환합니다.
 */

export const ANALYZE_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export class AnalyzePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzePayloadError";
  }
}

export function assertAllowedImageFile(file: File): void {
  const mime = (file.type || "").toLowerCase();
  const okMime = ALLOWED.has(mime) || /\.(png|jpe?g|webp)$/i.test(file.name);
  if (!okMime) {
    throw new AnalyzePayloadError("PNG, JPG, WEBP 이미지만 올려 주세요.");
  }
  if (file.size > ANALYZE_MAX_IMAGE_BYTES) {
    throw new AnalyzePayloadError("파일이 너무 커요! (한 장당 최대 8MB)");
  }
  if (file.size === 0) {
    throw new AnalyzePayloadError("빈 파일이에요. 다른 이미지를 선택해 주세요.");
  }
}

/** Data URL → 순수 base64 + MIME */
export function splitDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const m = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) {
    throw new AnalyzePayloadError("이미지 인코딩이 올바르지 않아요. 다시 업로드해 주세요.");
  }
  const mimeType = m[1].toLowerCase();
  const data = m[2].replace(/\s/g, "");
  if (!ALLOWED.has(mimeType) && mimeType !== "image/jpg") {
    throw new AnalyzePayloadError("PNG, JPG, WEBP 이미지만 올려 주세요.");
  }
  return { mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType, data };
}

/** FileReader 기반 — 썸네일·API 겸용 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const v = r.result;
      if (typeof v !== "string") {
        reject(new AnalyzePayloadError("파일을 읽지 못했어요."));
        return;
      }
      resolve(v);
    };
    r.onerror = () => reject(new AnalyzePayloadError("파일을 읽지 못했어요."));
    r.readAsDataURL(file);
  });
}

/** `/api/analyze`용 JSON 바디 생성 */
export async function buildAnalyzeJsonBody(
  file: File,
  userPrompt: string,
): Promise<{ userPrompt: string; images: { mimeType: string; data: string }[] }> {
  assertAllowedImageFile(file);
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    throw new AnalyzePayloadError("AI에게 무엇을 물어볼지 적어 주세요.");
  }
  const dataUrl = await readFileAsDataUrl(file);
  const { mimeType, data } = splitDataUrl(dataUrl);
  const approxBytes = Math.ceil((data.length * 3) / 4);
  if (approxBytes > ANALYZE_MAX_IMAGE_BYTES) {
    throw new AnalyzePayloadError("파일이 너무 커요! (한 장당 최대 8MB)");
  }
  return {
    userPrompt: trimmed,
    images: [{ mimeType, data }],
  };
}
