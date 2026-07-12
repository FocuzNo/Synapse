import type { ChatbotPosition, ChatbotTheme } from "@/features/chatbots/types";

export type PublicChatbotConfig = {
  publicId: string;
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  theme: ChatbotTheme;
  position: ChatbotPosition;
  brandingEnabled: boolean;
  available: boolean;
};

export type PublicAnswerSource = {
  sourceNumber: number;
  filename: string;
  excerpt: string;
};

export type PublicChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  sources: PublicAnswerSource[];
  isAnswered: boolean;
};

export type PublicChatHistorySuccess = {
  ok: true;
  messages: PublicChatMessage[];
};

export type PublicChatSuccess = {
  ok: true;
  answer: string;
  isAnswered: boolean;
  sources: PublicAnswerSource[];
};

export type PublicChatFailure = {
  ok: false;
  code:
    | "CHATBOT_UNAVAILABLE"
    | "RATE_LIMITED"
    | "MESSAGE_LIMIT_REACHED"
    | "VALIDATION_ERROR"
    | "AI_PROVIDER_ERROR"
    | "DATABASE_ERROR";
  message: string;
};
