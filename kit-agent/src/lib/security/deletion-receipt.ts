export const SECURITY_AUDIT_RECEIPT_STORAGE_KEY = "kit.security.audit_receipt.v1";

export interface DeletedFileMetadata {
  filename?: string;
  sizeBytes?: number;
  mimeType?: string;
  lastModifiedMs?: number;
  source?: string;
}

export interface DeletionReceipt {
  file_hash: string;
  deletion_timestamp: string;
  api_response_id: string;
  unique_audit_signature: string;
}

