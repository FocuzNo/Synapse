import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/features/workspaces/server";

export type WorkspaceAnalyticsSummary = {
  totalConversations: number;
  totalMessages: number;
  answeredCount: number;
  fallbackCount: number;
  widgetConversations: number;
  playgroundConversations: number;
};

export async function getWorkspaceAnalyticsSummary(): Promise<WorkspaceAnalyticsSummary | null> {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const workspaceId = currentWorkspace.workspace.id;
  const [conversations, messages] = await Promise.all([
    supabase
      .from("conversations")
      .select("source", { count: "exact" })
      .eq("workspace_id", workspaceId),
    supabase
      .from("messages")
      .select("role,is_answered,conversation_id", { count: "exact" })
      .eq("workspace_id", workspaceId),
  ]);

  if (conversations.error || messages.error) {
    console.error("Failed to load workspace analytics", {
      conversationCode: conversations.error?.code,
      messageCode: messages.error?.code,
      workspaceId,
    });
    return null;
  }

  const conversationRows = conversations.data ?? [];
  const messageRows = messages.data ?? [];
  const assistantRows = messageRows.filter((message) => message.role === "assistant");

  return {
    totalConversations: conversations.count ?? conversationRows.length,
    totalMessages: messages.count ?? messageRows.length,
    answeredCount: assistantRows.filter((message) => message.is_answered === true).length,
    fallbackCount: assistantRows.filter((message) => message.is_answered === false).length,
    widgetConversations: conversationRows.filter((conversation) => conversation.source === "widget").length,
    playgroundConversations: conversationRows.filter((conversation) => conversation.source === "playground").length,
  };
}
