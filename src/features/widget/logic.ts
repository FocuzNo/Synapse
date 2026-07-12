import { createHash } from "node:crypto";
import type { PublicAnswerSource, PublicChatbotConfig } from "@/features/widget/types";

type PublicChatbotConfigSource = {
  public_id: string;
  name: string;
  welcome_message: string;
  primary_color: string;
  theme: "light" | "dark";
  position: "bottom-right" | "bottom-left";
  branding_enabled: boolean;
};

export function mapPublicChatbotConfig(
  chatbot: PublicChatbotConfigSource
): PublicChatbotConfig {
  return {
    publicId: chatbot.public_id,
    name: chatbot.name,
    welcomeMessage: chatbot.welcome_message,
    primaryColor: chatbot.primary_color,
    theme: chatbot.theme,
    position: chatbot.position,
    brandingEnabled: chatbot.branding_enabled,
    available: true,
  };
}

export function hashRateLimitKey(value: string, salt: string) {
  return createHash("sha256").update(salt).update(":").update(value).digest("hex");
}

export function buildPublicRateLimitKeys(params: {
  clientIp: string;
  chatbotPublicId: string;
  sessionId: string;
  salt: string;
}) {
  return {
    sessionKey: `widget:${params.chatbotPublicId}:session:${params.sessionId}`,
    ipKey: `widget:${params.chatbotPublicId}:ip:${hashRateLimitKey(params.clientIp, params.salt)}`,
  };
}

export type PublicSourceRow = {
  document_chunks:
    | {
        content: string;
        documents:
          | { original_filename: string }
          | { original_filename: string }[]
          | null;
      }
    | {
        content: string;
        documents:
          | { original_filename: string }
          | { original_filename: string }[]
          | null;
      }[]
    | null;
};

export function mapPublicAnswerSources(rows: PublicSourceRow[]): PublicAnswerSource[] {
  return rows
    .map((row, index) => {
      const chunk = Array.isArray(row.document_chunks)
        ? row.document_chunks[0]
        : row.document_chunks;
      const document = Array.isArray(chunk?.documents)
        ? chunk?.documents[0]
        : chunk?.documents;

      if (!chunk) {
        return null;
      }

      return {
        sourceNumber: index + 1,
        filename: document?.original_filename ?? "Document",
        excerpt: chunk.content.trim().slice(0, 180),
      } satisfies PublicAnswerSource;
    })
    .filter((source): source is PublicAnswerSource => Boolean(source));
}

export function buildWidgetEmbedCode(params: {
  appUrl: string;
  publicId: string;
}) {
  const appUrl = params.appUrl.replace(/\/+$/, "");

  return `<script\n  src="${appUrl}/widget.js"\n  data-chatbot-id="${params.publicId}"\n  async>\n</script>`;
}

