import {
  DEFAULT_VENDOR_MODEL_ID,
  getVendorModelById,
  type VendorModelId,
} from "@/constants/vendor-models";

export function parseVendorModelIdFromForm(
  raw: FormDataEntryValue | null,
): VendorModelId {
  if (typeof raw !== "string") return DEFAULT_VENDOR_MODEL_ID;
  const t = raw.trim();
  const m = getVendorModelById(t);
  return (m?.id ?? DEFAULT_VENDOR_MODEL_ID) as VendorModelId;
}
