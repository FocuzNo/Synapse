import type {
  Chatbot,
  ChatbotPosition,
  ChatbotStatus,
  ChatbotTheme,
} from "@/types/database";

export type { Chatbot, ChatbotPosition, ChatbotStatus, ChatbotTheme };

export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "WORKSPACE_NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "PLAN_LIMIT_REACHED"
  | "CHATBOT_NOT_FOUND"
  | "CHATBOT_NOT_READY"
  | "NO_READY_DOCUMENTS"
  | "CONVERSATION_NOT_FOUND"
  | "AI_PROVIDER_ERROR"
  | "VECTOR_SEARCH_ERROR"
  | "MESSAGE_LIMIT_REACHED"
  | "DATABASE_ERROR";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; code: ActionErrorCode; message: string };
