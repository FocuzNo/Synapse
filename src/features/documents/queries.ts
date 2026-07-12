import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getChatbotById } from "@/features/chatbots/queries";
import { getCurrentWorkspace } from "@/features/workspaces/server";
import type { KnowledgeDocument } from "@/features/documents/types";

const DOCUMENT_SELECT =
  "id,workspace_id,chatbot_id,filename,original_filename,storage_path,mime_type,size_bytes,status,chunks_count,error_message,created_at,processed_at,updated_at";

export async function getDocumentsForChatbot(chatbotId: string): Promise<KnowledgeDocument[]> {
  const chatbot = await getChatbotById(chatbotId);

  if (!chatbot) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("chatbot_id", chatbot.id)
    .eq("workspace_id", chatbot.workspace_id)
    .order("created_at", { ascending: false })
    .returns<KnowledgeDocument[]>();

  if (error) {
    console.error("Failed to load documents", { code: error.code, chatbotId });
    return [];
  }

  return data ?? [];
}

export async function getDocumentCountForCurrentWorkspace() {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return 0;
  }

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", currentWorkspace.workspace.id);

  if (error) {
    console.error("Failed to count documents", { code: error.code });
    return 0;
  }

  return count ?? 0;
}

export async function getReadyDocumentCount(chatbotId: string) {
  const chatbot = await getChatbotById(chatbotId);

  if (!chatbot) {
    return 0;
  }

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", chatbot.workspace_id)
    .eq("chatbot_id", chatbot.id)
    .eq("status", "ready");

  if (error) {
    console.error("Failed to count ready documents", { code: error.code, chatbotId });
    return 0;
  }

  return count ?? 0;
}
