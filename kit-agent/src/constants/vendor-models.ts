import type { ActiveModelTier } from "@/lib/agent/types";

export type LLMVendor = "openai" | "google" | "anthropic";

export type VendorCostTier = "eco" | "high";

/** FormData·그래프 상태에 쓰는 안정 ID */
export type VendorModelId =
  | "openai:gpt-4o"
  | "openai:gpt-4o-mini"
  | "google:gemini-pro"
  | "google:gemini-flash"
  | "anthropic:claude-3-5-sonnet"
  | "anthropic:claude-3-5-haiku";

export const VENDOR_EMOJI: Record<LLMVendor, string> = {
  openai: "🤖",
  google: "🌐",
  anthropic: "🧠",
};

export interface VendorModelOption {
  id: VendorModelId;
  vendor: LLMVendor;
  /** UI 표기 (예: GPT-4o) */
  displayName: string;
  costTier: VendorCostTier;
  /** LangChain / API에 넘기는 실제 모델 문자열 */
  apiModelId: string;
  finOpsHint: string;
}

const ALL: VendorModelOption[] = [
  {
    id: "openai:gpt-4o",
    vendor: "openai",
    displayName: "GPT-4o",
    costTier: "high",
    apiModelId: "gpt-4o",
    finOpsHint: "복잡한 코드 분석·멀티 에이전트 추론에 적합합니다.",
  },
  {
    id: "openai:gpt-4o-mini",
    vendor: "openai",
    displayName: "GPT-4o-mini",
    costTier: "eco",
    apiModelId: "gpt-4o-mini",
    finOpsHint: "일상 루프에 적합하며 비용을 대략 80% 절감(추정)합니다.",
  },
  {
    id: "google:gemini-pro",
    vendor: "google",
    displayName: "Gemini Pro",
    costTier: "high",
    apiModelId: "gemini-1.5-pro",
    finOpsHint: "긴 맥락·복합 추론에 적합합니다.",
  },
  {
    id: "google:gemini-flash",
    vendor: "google",
    displayName: "Gemini Flash",
    costTier: "eco",
    apiModelId: "gemini-2.0-flash",
    finOpsHint: "고속·저지연 루틴에 적합 · FinOps 친화적입니다.",
  },
  {
    id: "anthropic:claude-3-5-sonnet",
    vendor: "anthropic",
    displayName: "Claude 3.5 Sonnet",
    costTier: "high",
    apiModelId: "claude-3-5-sonnet-20241022",
    finOpsHint: "코드·문서 추론 밀도가 높은 작업에 적합합니다.",
  },
  {
    id: "anthropic:claude-3-5-haiku",
    vendor: "anthropic",
    displayName: "Claude 3.5 Haiku",
    costTier: "eco",
    apiModelId: "claude-3-5-haiku-20241022",
    finOpsHint: "가벼운 질의·요약 루프에 적합 · 비용 효율적입니다.",
  },
];

const byId = new Map<string, VendorModelOption>(ALL.map((m) => [m.id, m]));

/** 기본: OpenAI ECO (FinOps 스토리) */
export const DEFAULT_VENDOR_MODEL_ID: VendorModelId = "openai:gpt-4o-mini";

export function getVendorModelById(id: string | null | undefined): VendorModelOption | undefined {
  if (!id || typeof id !== "string") return undefined;
  return byId.get(id.trim());
}

export function vendorModelIdToActiveTier(id: string | null | undefined): ActiveModelTier {
  const m = getVendorModelById(id);
  if (!m) return "standard";
  return m.costTier === "eco" ? "economy" : "standard";
}

/** UI 추상화: ECO/HIGH만 노출할 때 API에 넘기는 기본 라우트 */
export type InferenceCostMode = "eco" | "high";

export function inferenceModeToVendorModelId(mode: InferenceCostMode): VendorModelId {
  return mode === "eco" ? "openai:gpt-4o-mini" : "openai:gpt-4o";
}

export function vendorModelIdToInferenceMode(
  id: string | null | undefined,
): InferenceCostMode {
  return vendorModelIdToActiveTier(id) === "economy" ? "eco" : "high";
}

export const VENDOR_MODEL_SECTIONS: {
  vendor: LLMVendor;
  label: string;
  models: VendorModelOption[];
}[] = (["openai", "google", "anthropic"] as const).map((vendor) => ({
  vendor,
  label:
    vendor === "openai" ? "OpenAI" : vendor === "google" ? "Google" : "Anthropic",
  models: ALL.filter((m) => m.vendor === vendor),
}));
