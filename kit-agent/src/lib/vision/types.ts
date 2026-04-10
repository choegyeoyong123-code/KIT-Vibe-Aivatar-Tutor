/**
 * Gemini 기반 시각 그라운딩(객체·주변 텍스트·맥락) API 응답 형식.
 */

export interface DetectedObject {
  /** 식별된 사물·유물·도표 등 */
  label: string;
  /** 모델이 제시하는 확신도 0–1 (없으면 생략) */
  confidence?: number;
  /** 짧은 시각적 설명 */
  description?: string;
  /** 화면 내 대략적 위치(모델이 bbox를 못 줄 때 대체) */
  spatialHint?: string;
}

export interface VisualGroundingResult {
  detectedObjects: DetectedObject[];
  /** 이미지·프레임에서 읽을 수 있는 텍스트 전체(OCR) */
  ocrText: string;
  /** 교육적 맥락에서의 요약 */
  contextualSummary: string;
}
