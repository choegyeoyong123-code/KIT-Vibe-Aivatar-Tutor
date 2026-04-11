import { vendorModelIdToActiveTier } from "@/constants/vendor-models";
import { parseActiveModelTierFromForm } from "@/lib/agent/active-model-tier-form";
import { parseVendorModelIdFromForm } from "@/lib/agent/vendor-model-form";
import type { ActiveModelTier } from "@/lib/agent/types";

/**
 * `vendorModelId`가 오면 멀티 벤더 선택을 우선하고 `activeModelTier`를 카탈로그에서 유도합니다.
 * 레거시(티어만 전송)는 `vendorModelId`를 비우고 티어만 반영합니다.
 */
export function mergeModelSelectionFromForm(form: FormData): {
  vendorModelId: string;
  activeModelTier: ActiveModelTier;
} {
  const raw = form.get("vendorModelId");
  if (typeof raw === "string" && raw.trim()) {
    const vendorModelId = parseVendorModelIdFromForm(raw);
    return {
      vendorModelId,
      activeModelTier: vendorModelIdToActiveTier(vendorModelId),
    };
  }
  return {
    vendorModelId: "",
    activeModelTier: parseActiveModelTierFromForm(form.get("activeModelTier")),
  };
}
