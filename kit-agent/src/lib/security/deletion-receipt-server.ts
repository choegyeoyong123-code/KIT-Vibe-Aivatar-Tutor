import { createHash, createHmac, randomUUID } from "crypto";
import type { DeletedFileMetadata, DeletionReceipt } from "@/lib/security/deletion-receipt";

function canonicalMeta(meta: DeletedFileMetadata): string {
  return JSON.stringify({
    filename: meta.filename ?? "",
    sizeBytes: Number.isFinite(meta.sizeBytes) ? meta.sizeBytes : 0,
    mimeType: meta.mimeType ?? "",
    lastModifiedMs: Number.isFinite(meta.lastModifiedMs) ? meta.lastModifiedMs : 0,
    source: meta.source ?? "",
  });
}

export function createDeletionReceipt(input: {
  fileMeta: DeletedFileMetadata;
  contextId: string;
  deletionTimestamp?: string;
}): DeletionReceipt {
  const deletion_timestamp = input.deletionTimestamp ?? new Date().toISOString();
  const api_response_id = randomUUID();
  const payload = `${input.contextId}|${canonicalMeta(input.fileMeta)}`;
  const file_hash = createHash("sha256").update(payload).digest("hex");
  const key = process.env.KIT_AUDIT_SIGNING_KEY || "kit-audit-default-key";
  const unique_audit_signature = createHmac("sha256", key)
    .update(`${file_hash}|${deletion_timestamp}|${api_response_id}`)
    .digest("hex");

  return {
    file_hash,
    deletion_timestamp,
    api_response_id,
    unique_audit_signature,
  };
}

