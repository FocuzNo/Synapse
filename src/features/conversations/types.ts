import type { Conversation, Message } from "@/types/database";

export type { Conversation, Message };

export type SourceReference = {
  id: string;
  filename: string;
  content: string;
  similarityScore: number;
};

export type MessageWithSources = Message & {
  sources: SourceReference[];
};

export type ConversationWithMessages = Conversation & {
  messages: MessageWithSources[];
};
