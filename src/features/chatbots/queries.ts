import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/features/workspaces/server";
import type { Chatbot } from "@/features/chatbots/types";

const CHATBOT_SELECT =
  "id,workspace_id,public_id,name,description,welcome_message,system_prompt,status,primary_color,theme,position,branding_enabled,created_at,updated_at";

export async function getChatbotsForCurrentWorkspace(): Promise<Chatbot[]> {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("chatbots")
    .select(CHATBOT_SELECT)
    .eq("workspace_id", currentWorkspace.workspace.id)
    .order("created_at", { ascending: false })
    .returns<Chatbot[]>();

  if (error) {
    console.error("Failed to load chatbots", { code: error.code });
    return [];
  }

  return data ?? [];
}

export async function getChatbotCountForCurrentWorkspace(): Promise<number> {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return 0;
  }

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("chatbots")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", currentWorkspace.workspace.id);

  if (error) {
    console.error("Failed to count chatbots", { code: error.code });
    return 0;
  }

  return count ?? 0;
}

export async function getChatbotById(chatbotId: string): Promise<Chatbot | null> {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("chatbots")
    .select(CHATBOT_SELECT)
    .eq("id", chatbotId)
    .eq("workspace_id", currentWorkspace.workspace.id)
    .maybeSingle()
    .returns<Chatbot | null>();

  if (error) {
    console.error("Failed to load chatbot", { code: error.code });
    return null;
  }

  return data;
}

export async function getChatbotByPublicId(publicId: string): Promise<Chatbot | null> {
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("chatbots")
    .select(CHATBOT_SELECT)
    .eq("public_id", publicId)
    .eq("workspace_id", currentWorkspace.workspace.id)
    .maybeSingle()
    .returns<Chatbot | null>();

  if (error) {
    console.error("Failed to load chatbot by public id", { code: error.code });
    return null;
  }

  return data;
}
