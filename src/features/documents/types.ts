import type { KnowledgeDocument } from "@/types/database";

export type { KnowledgeDocument };

export type DocumentErrorCode =
  | "UNAUTHORIZED"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "DOCUMENT_LIMIT_REACHED"
  | "DOCUMENT_PROCESSING_FAILED"
  | "CHATBOT_NOT_FOUND"
  | "FORBIDDEN"
  | "DATABASE_ERROR";

export type DocumentActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; code: DocumentErrorCode; message: string };
