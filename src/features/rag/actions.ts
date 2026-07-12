"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertCanSendMessage,
  recordWorkspaceTokenUsage,
} from "@/features/billing/server";
import { getChatbotById } from "@/features/chatbots/queries";
import { getReadyDocumentCount } from "@/features/documents/queries";
import { retrieveRelevantSources } from "@/features/rag/retrieval";
import { generateGroundedAnswer } from "@/features/rag/generate";
import {
  RAG_FALLBACK,
  RAG_PROVIDER_ERROR_FALLBACK,
} from "@/features/rag/constants";
import type { ActionErrorCode, ActionResult } from "@/features/chatbots/types";
import type { RetrievedSource } from "@/features/rag/retrieval";

const askQuestionSchema = z.object({
  chatbotId: z.uuid(),
  conversationId: z.uuid().optional().nullable(),
  question: z.string().trim().min(2, "Ask a longer question.").max(1200, "Question is too long."),
});

type AskQuestionData = {
  conversationId: string;
  answer: string;
  isAnswered: boolean;
  sources: RetrievedSource[];
};

function actionError<T>(code: ActionErrorCode, message: string): ActionResult<T> {
  return { ok: false, code, message };
}

async function persistAssistantReply(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  admin: ReturnType<typeof createSupabaseAdminClient>;
  conversationId: string;
  workspaceId: string;
  chatbotId: string;
  answer: string;
  isAnswered: boolean;
  inputTokens?: number | null;
  outputTokens?: number | null;
  sources?: RetrievedSource[];
}) {
  const { data: assistantMessage, error: assistantMessageError } = await params.supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      role: "assistant",
      content: params.answer,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      is_answered: params.isAnswered,
    })
    .select("id")
    .single()
    .returns<{ id: string }>();

  if (assistantMessageError || !assistantMessage) {
    console.error("Failed to save assistant message", {
      code: assistantMessageError?.code,
      conversationId: params.conversationId,
      chatbotId: params.chatbotId,
      workspaceId: params.workspaceId,
    });
    return null;
  }

  if ((params.sources?.length ?? 0) > 0) {
    const { error: sourceError } = await params.admin.from("message_sources").insert(
      (params.sources ?? []).map((source) => ({
        message_id: assistantMessage.id,
        document_chunk_id: source.chunkId,
        similarity_score: Math.max(0, Math.min(1, source.similarityScore)),
      }))
    );

    if (sourceError) {
      console.error("Failed to save message sources", {
        code: sourceError.code,
        conversationId: params.conversationId,
        chatbotId: params.chatbotId,
        workspaceId: params.workspaceId,
      });
    }
  }

  const { error: conversationUpdateError } = await params.supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId)
    .eq("workspace_id", params.workspaceId);

  if (conversationUpdateError) {
    console.error("Failed to update conversation timestamp", {
      code: conversationUpdateError.code,
      conversationId: params.conversationId,
      chatbotId: params.chatbotId,
      workspaceId: params.workspaceId,
    });
  }

  revalidatePath(`/app/chatbots/${params.chatbotId}`);

  return assistantMessage.id;
}

export async function askPlaygroundQuestionAction(input: unknown): Promise<ActionResult<AskQuestionData>> {
  const parsed = askQuestionSchema.safeParse(input);

  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const chatbot = await getChatbotById(parsed.data.chatbotId);

  if (!chatbot) {
    return actionError("CHATBOT_NOT_FOUND", "Chatbot was not found.");
  }

  const readyCount = await getReadyDocumentCount(chatbot.id);

  if (readyCount === 0) {
    return actionError("NO_READY_DOCUMENTS", "Add a ready TXT document before asking questions.");
  }

  const messageGate = await assertCanSendMessage();

  if (!messageGate.ok) {
    return actionError("MESSAGE_LIMIT_REACHED", messageGate.message);
  }

  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();
  let conversationId = parsed.data.conversationId ?? null;

  if (conversationId) {
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("workspace_id", chatbot.workspace_id)
      .eq("chatbot_id", chatbot.id)
      .maybeSingle()
      .returns<{ id: string } | null>();

    if (!existingConversation) {
      return actionError("CONVERSATION_NOT_FOUND", "Conversation was not found.");
    }
  } else {
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        workspace_id: chatbot.workspace_id,
        chatbot_id: chatbot.id,
        source: "playground",
      })
      .select("id")
      .single()
      .returns<{ id: string }>();

    if (conversationError || !conversation) {
      console.error("Failed to create conversation", { code: conversationError?.code, chatbotId: chatbot.id });
      return actionError("DATABASE_ERROR", "Conversation could not be created.");
    }

    conversationId = conversation.id;
  }

  const question = parsed.data.question.trim();
  const { error: userMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: question,
    });

  if (userMessageError) {
    console.error("Failed to save user message", { code: userMessageError.code, conversationId });
    return actionError("DATABASE_ERROR", "Message could not be saved.");
  }

  let sources: RetrievedSource[] = [];
  try {
    sources = await retrieveRelevantSources(chatbot, question);
  } catch {
    const assistantMessageId = await persistAssistantReply({
      supabase,
      admin,
      conversationId,
      workspaceId: chatbot.workspace_id,
      chatbotId: chatbot.id,
      answer: RAG_PROVIDER_ERROR_FALLBACK,
      isAnswered: false,
      sources: [],
    });

    if (!assistantMessageId) {
      return actionError("DATABASE_ERROR", "A fallback response could not be saved.");
    }

    return {
      ok: true,
      data: {
        conversationId,
        answer: RAG_PROVIDER_ERROR_FALLBACK,
        isAnswered: false,
        sources: [],
      },
    };
  }

  let answer = RAG_FALLBACK;
  let isAnswered = false;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  if (sources.length > 0) {
    try {
      const generated = await generateGroundedAnswer({
        chatbotPrompt: chatbot.system_prompt,
        sources,
        question,
      });

      answer = generated.answer;
      isAnswered = generated.isAnswered;
      inputTokens = generated.inputTokens;
      outputTokens = generated.outputTokens;
    } catch (error) {
      console.error("AI answer generation failed", {
        chatbotId: chatbot.id,
        workspaceId: chatbot.workspace_id,
        message: error instanceof Error ? error.message : "unknown",
      });
      answer = RAG_PROVIDER_ERROR_FALLBACK;
      isAnswered = false;
      sources = [];
    }
  }

  const assistantMessageId = await persistAssistantReply({
    supabase,
    admin,
    conversationId,
    workspaceId: chatbot.workspace_id,
    chatbotId: chatbot.id,
    answer,
    isAnswered,
    inputTokens,
    outputTokens,
    sources: isAnswered ? sources : [],
  });

  if (!assistantMessageId) {
    return actionError("DATABASE_ERROR", "Assistant message could not be saved.");
  }

  await recordWorkspaceTokenUsage({
    workspaceId: chatbot.workspace_id,
    inputTokens,
    outputTokens,
  });

  return {
    ok: true,
    data: {
      conversationId,
      answer,
      isAnswered,
      sources,
    },
  };
}
