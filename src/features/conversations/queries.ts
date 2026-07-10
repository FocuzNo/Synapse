import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getChatbotById } from "@/features/chatbots/queries";
import type { Conversation, ConversationWithMessages, MessageWithSources } from "@/features/conversations/types";

export async function getConversationsForChatbot(chatbotId: string): Promise<Conversation[]> {
  const chatbot = await getChatbotById(chatbotId);

  if (!chatbot) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id,workspace_id,chatbot_id,source,public_session_id,created_at,last_message_at")
    .eq("workspace_id", chatbot.workspace_id)
    .eq("chatbot_id", chatbot.id)
    .eq("source", "playground")
    .order("last_message_at", { ascending: false })
    .returns<Conversation[]>();

  if (error) {
    console.error("Failed to load conversations", { code: error.code, chatbotId });
    return [];
  }

  return data ?? [];
}

export async function getConversationWithMessages(
  chatbotId: string,
  conversationId: string | null
): Promise<ConversationWithMessages | null> {
  if (!conversationId) {
    return null;
  }

  const chatbot = await getChatbotById(chatbotId);

  if (!chatbot) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id,workspace_id,chatbot_id,source,public_session_id,created_at,last_message_at")
    .eq("id", conversationId)
    .eq("workspace_id", chatbot.workspace_id)
    .eq("chatbot_id", chatbot.id)
    .maybeSingle()
    .returns<Conversation | null>();

  if (error || !conversation) {
    return null;
  }

  const { data: messages, error: messageError } = await supabase
    .from("messages")
    .select("id,conversation_id,role,content,input_tokens,output_tokens,is_answered,created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .returns<MessageWithSources[]>();

  if (messageError) {
    console.error("Failed to load messages", { code: messageError.code, conversationId });
    return { ...conversation, messages: [] };
  }

  const assistantMessageIds = (messages ?? [])
    .filter((message) => message.role === "assistant")
    .map((message) => message.id);

  if (assistantMessageIds.length === 0) {
    return {
      ...conversation,
      messages: messages ?? [],
    };
  }

  const { data: sourceRows, error: sourceError } = await supabase
    .from("message_sources")
    .select("message_id,similarity_score,document_chunks(id,content,documents(original_filename))")
    .in("message_id", assistantMessageIds);

  if (sourceError) {
    console.error("Failed to load message sources", { code: sourceError.code, conversationId });
  }

  const byMessage = new Map<string, MessageWithSources["sources"]>();

  for (const row of sourceRows ?? []) {
    const typed = row as unknown as {
      message_id: string;
      similarity_score: number;
      document_chunks:
        | {
        id: string;
        content: string;
            documents: { original_filename: string } | { original_filename: string }[] | null;
          }
        | {
            id: string;
            content: string;
            documents: { original_filename: string } | { original_filename: string }[] | null;
          }[]
        | null;
    };
    const chunk = Array.isArray(typed.document_chunks)
      ? typed.document_chunks[0]
      : typed.document_chunks;
    const document = Array.isArray(chunk?.documents)
      ? chunk?.documents[0]
      : chunk?.documents;
    const list = byMessage.get(typed.message_id) ?? [];
    if (chunk) {
      list.push({
        id: chunk.id,
        filename: document?.original_filename ?? "Document",
        content: chunk.content,
        similarityScore: typed.similarity_score,
      });
      byMessage.set(typed.message_id, list);
    }
  }

  return {
    ...conversation,
    messages: (messages ?? []).map((message) => ({
      ...message,
      sources: byMessage.get(message.id) ?? [],
    })),
  };
}
