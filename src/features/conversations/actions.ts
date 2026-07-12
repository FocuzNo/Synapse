"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getChatbotById } from "@/features/chatbots/queries";
import type { ActionResult } from "@/features/chatbots/types";

const renameConversationSchema = z.object({
  chatbotId: z.uuid(),
  conversationId: z.uuid(),
  title: z.string().trim().min(1, "Enter a conversation name.").max(80, "Name is too long."),
});

export async function renameConversationAction(input: unknown): Promise<ActionResult<{ title: string }>> {
  const parsed = renameConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: z.prettifyError(parsed.error) };
  }

  const chatbot = await getChatbotById(parsed.data.chatbotId);
  if (!chatbot) {
    return { ok: false, code: "CHATBOT_NOT_FOUND", message: "Chatbot was not found." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.conversationId)
    .eq("workspace_id", chatbot.workspace_id)
    .eq("chatbot_id", chatbot.id)
    .eq("source", "playground")
    .select("title")
    .maybeSingle()
    .returns<{ title: string } | null>();

  if (error || !data) {
    console.error("Failed to rename conversation", { code: error?.code, chatbotId: chatbot.id });
    return { ok: false, code: "CONVERSATION_NOT_FOUND", message: "Conversation was not found." };
  }

  revalidatePath(`/app/chatbots/${chatbot.id}`);
  return { ok: true, data };
}
