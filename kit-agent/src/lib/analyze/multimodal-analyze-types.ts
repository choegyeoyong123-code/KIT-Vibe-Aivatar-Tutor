/** 클라이언트·서버 공통 — `/api/analyze` 요청 본문(배열 파트) */

export type AnalyzeImagePart = {
  type: "image";
  /** image/png, image/jpeg, image/webp 등 */
  mimeType: string;
  /** 순수 Base64 (data: 접두사 없음) */
  data: string;
};

export type AnalyzeTextPart = {
  type: "text";
  text: string;
};

export type AnalyzeContentPart = AnalyzeImagePart | AnalyzeTextPart;

export interface AnalyzeRequestJson {
  /** 사용자 핵심 질문(필수) */
  userPrompt: string;
  /**
   * 멀티모달 파트 배열 — 텍스트(선행 맥락) + 이미지 여러 장 등 자유 조합.
   * 일반적으로 이미지는 `images`로 보내고, 여기엔 추가 맥락만 둡니다.
   */
  parts?: AnalyzeContentPart[];
  /** 단일/복수 이미지 shorthand — `parts`와 병합됩니다(이미지는 먼저 오도록 정렬). */
  images?: { mimeType: string; data: string }[];
}

export interface AnalyzeResponseJson {
  markdown: string;
  provider: "google" | "openai" | "mock";
  modelId: string;
}
