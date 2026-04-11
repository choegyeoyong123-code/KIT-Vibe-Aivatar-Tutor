import type { ActiveModelTier } from "@/lib/agent/types";

/**
 * FormData `activeModelTier` — 클라이언트는 `economy` | `standard` 권장.
 * 레거시 별칭: eco → economy, high → standard.
 */
export function parseActiveModelTierFromForm(
  raw: FormDataEntryValue | null,
): ActiveModelTier {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "economy" || s === "eco") return "economy";
  if (s === "standard" || s === "high") return "standard";
  return "standard";
}
