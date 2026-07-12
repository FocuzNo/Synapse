import "server-only";
import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublicRateLimitSalt } from "@/lib/env/server";
import {
  consumeWorkspaceMessageAllowance,
  getWorkspacePlanForPublicWorkspace,
  isConversationRetainedForPlan,
  recordWorkspaceTokenUsage,
} from "@/features/billing/server";
import { generateGroundedAnswer } from "@/features/rag/generate";
import {
  RAG_FALLBACK,
  RAG_MATCH_THRESHOLD,
  RAG_PROVIDER_ERROR_FALLBACK,
} from "@/features/rag/constants";
import {
  retrieveRelevantSourcesForChatbot,
  type RetrievedSource,
} from "@/features/rag/retrieval";
import { shouldUseKnowledgeFallback } from "@/features/rag/formatting";
import type {
  PublicAnswerSource,
  PublicChatMessage,
  PublicChatbotConfig,
} from "@/features/widget/types";
import {
  buildPublicRateLimitKeys,
  mapPublicAnswerSources,
  mapPublicChatbotConfig,
} from "@/features/widget/logic";

const PUBLIC_CHATBOT_SELECT =
  "id,workspace_id,public_id,name,welcome_message,system_prompt,status,primary_color,theme,position,branding_enabled";

type ResolvedPublicChatbot = {
  id: string;
  workspace_id: string;
  public_id: string;
  name: string;
  welcome_message: string;
  system_prompt: string;
  status: "draft" | "active" | "disabled";
  primary_color: string;
  theme: "light" | "dark";
  position: "bottom-right" | "bottom-left";
  branding_enabled: boolean;
};

type RateLimitResult = {
  allowed: boolean;
  current_count: number;
  limit_count: number;
  retry_after_seconds: number;
};

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function getPublicRateLimitKeys(request: NextRequest, chatbotPublicId: string, sessionId: string) {
  return buildPublicRateLimitKeys({
    clientIp: getClientIp(request),
    chatbotPublicId,
    sessionId,
    salt: getPublicRateLimitSalt(),
  });
}

export async function resolveAvailablePublicChatbot(publicId: string) {
  const admin = createSupabaseAdminClient();
  const { data: chatbot, error } = await admin
    .from("chatbots")
    .select(PUBLIC_CHATBOT_SELECT)
    .eq("public_id", publicId)
    .eq("status", "active")
    .maybeSingle()
    .returns<ResolvedPublicChatbot | null>();

  if (error || !chatbot) {
    return null;
  }

  const { count, error: documentError } = await admin
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", chatbot.workspace_id)
    .eq("chatbot_id", chatbot.id)
    .eq("status", "ready");

  if (documentError || (count ?? 0) === 0) {
    return null;
  }

  return chatbot;
}

export async function getPublicChatbotConfig(publicId: string): Promise<PublicChatbotConfig | null> {
  const chatbot = await resolveAvailablePublicChatbot(publicId);

  if (!chatbot) {
    return null;
  }

  return mapPublicChatbotConfig(chatbot);
}

export async function checkWidgetRateLimits(params: {
  sessionKey: string;
  ipKey: string;
}) {
  const admin = createSupabaseAdminClient();
  const [sessionResult, ipResult] = await Promise.all([
    admin.rpc("check_public_chat_rate_limit", {
      rate_key: params.sessionKey,
      window_seconds: 60,
      request_limit: 10,
    }),
    admin.rpc("check_public_chat_rate_limit", {
      rate_key: params.ipKey,
      window_seconds: 3600,
      request_limit: 30,
    }),
  ]);

  if (sessionResult.error || ipResult.error) {
    console.error(
      `Public chat rate limit RPC failed (session=${sessionResult.error?.code ?? "ok"}, ip=${ipResult.error?.code ?? "ok"})`
    );
    throw new Error("RATE_LIMIT_RPC_FAILED");
  }

  const sessionRow = (sessionResult.data?.[0] ?? null) as RateLimitResult | null;
  const ipRow = (ipResult.data?.[0] ?? null) as RateLimitResult | null;

  const blocked = [sessionRow, ipRow]
    .filter((row): row is RateLimitResult => Boolean(row))
    .find((row) => !row.allowed);

  if (blocked) {
    return {
      ok: false as const,
      retryAfterSeconds: blocked.retry_after_seconds,
      message: "This widget is receiving messages too quickly. Please wait a moment and try again.",
    };
  }

  return { ok: true as const };
}

export async function consumePublicMessageUsage(workspaceId: string) {
  const result = await consumeWorkspaceMessageAllowance(workspaceId);

  if (!result.ok) {
    return {
      ok: false as const,
      message: "This assistant has reached its monthly message limit. Please try again later.",
    };
  }

  return { ok: true as const };
}

export async function recordUsageTokens(params: {
  workspaceId: string;
  inputTokens: number | null;
  outputTokens: number | null;
}) {
  await recordWorkspaceTokenUsage(params);
}

export async function getOrCreateWidgetConversation(params: {
  workspaceId: string;
  chatbotId: string;
  sessionId: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .upsert(
      {
        workspace_id: params.workspaceId,
        chatbot_id: params.chatbotId,
        source: "widget",
        public_session_id: params.sessionId,
      },
      {
        onConflict: "chatbot_id,source,public_session_id",
        ignoreDuplicates: false,
      }
    )
    .select("id,workspace_id,chatbot_id,public_session_id")
    .single();

  if (error || !data) {
    console.error(
      `Widget conversation upsert failed (code=${error?.code ?? "unknown"}, chatbotId=${params.chatbotId}, workspaceId=${params.workspaceId})`
    );
    throw new Error("CONVERSATION_UPSERT_FAILED");
  }

  return data as {
    id: string;
    workspace_id: string;
    chatbot_id: string;
    public_session_id: string;
  };
}

export async function saveWidgetUserMessage(params: {
  conversationId: string;
  content: string;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("messages").insert({
    conversation_id: params.conversationId,
    role: "user",
    content: params.content,
  });

  if (error) {
    console.error(
      `Widget user message insert failed (code=${error.code ?? "unknown"}, conversationId=${params.conversationId})`
    );
    throw new Error("USER_MESSAGE_INSERT_FAILED");
  }
}

export async function saveWidgetAssistantMessage(params: {
  conversationId: string;
  answer: string;
  isAnswered: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      role: "assistant",
      content: params.answer,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      is_answered: params.isAnswered,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      `Widget assistant message insert failed (code=${error?.code ?? "unknown"}, conversationId=${params.conversationId})`
    );
    throw new Error("ASSISTANT_MESSAGE_INSERT_FAILED");
  }

  return data.id as string;
}

export async function updateConversationTimestamp(conversationId: string, workspaceId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error(
      `Widget conversation timestamp update failed (code=${error.code ?? "unknown"}, conversationId=${conversationId}, workspaceId=${workspaceId})`
    );
  }
}

export async function saveWidgetMessageSources(
  assistantMessageId: string,
  sources: RetrievedSource[]
) {
  if (shouldUseKnowledgeFallback(sources)) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("message_sources").insert(
    sources.map((source) => ({
      message_id: assistantMessageId,
      document_chunk_id: source.chunkId,
      similarity_score: Math.max(0, Math.min(1, source.similarityScore)),
    }))
  );

  if (error) {
    console.error(
      `Widget message source insert failed (code=${error.code ?? "unknown"}, assistantMessageId=${assistantMessageId})`
    );
    throw new Error("MESSAGE_SOURCE_INSERT_FAILED");
  }
}

export async function getPublicSourcesForMessage(
  assistantMessageId: string
): Promise<PublicAnswerSource[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("message_sources")
    .select("created_at,document_chunks(content,documents(original_filename))")
    .eq("message_id", assistantMessageId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      `Public message source query failed (code=${error.code ?? "unknown"}, assistantMessageId=${assistantMessageId})`
    );
    return [];
  }

  return mapPublicAnswerSources(data ?? []);
}

export async function getWidgetConversationHistory(params: {
  publicId: string;
  sessionId: string;
}): Promise<PublicChatMessage[]> {
  const chatbot = await resolveAvailablePublicChatbot(params.publicId);

  if (!chatbot) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .select("id")
    .eq("workspace_id", chatbot.workspace_id)
    .eq("chatbot_id", chatbot.id)
    .eq("source", "widget")
    .eq("public_session_id", params.sessionId)
    .maybeSingle<{ id: string }>();

  if (conversationError || !conversation) {
    return [];
  }

  const plan = await getWorkspacePlanForPublicWorkspace(chatbot.workspace_id);

  const { data: conversationMeta } = await admin
    .from("conversations")
    .select("last_message_at")
    .eq("id", conversation.id)
    .maybeSingle<{ last_message_at: string }>();

  if (!conversationMeta || !isConversationRetainedForPlan(plan, conversationMeta.last_message_at)) {
    return [];
  }

  const { data: messages, error: messageError } = await admin
    .from("messages")
    .select("id,role,content,is_answered,created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .returns<
      Array<{
        id: string;
        role: "assistant" | "user";
        content: string;
        is_answered: boolean;
        created_at: string;
      }>
    >();

  if (messageError || !messages) {
    return [];
  }

  const assistantMessageIds = messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.id);

  const sourceMap = new Map<string, PublicAnswerSource[]>();

  if (assistantMessageIds.length > 0) {
    for (const assistantMessageId of assistantMessageIds) {
      sourceMap.set(
        assistantMessageId,
        await getPublicSourcesForMessage(assistantMessageId)
      );
    }
  }

  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    isAnswered: message.role === "assistant" ? message.is_answered : true,
    sources: message.role === "assistant" ? sourceMap.get(message.id) ?? [] : [],
  }));
}

export async function answerPublicChat(params: {
  chatbot: ResolvedPublicChatbot;
  question: string;
  conversationId: string;
}) {
  const admin = createSupabaseAdminClient();
  let sources: RetrievedSource[] = [];

  try {
    sources = await retrieveRelevantSourcesForChatbot({
      supabase: admin,
      chatbot: params.chatbot,
      question: params.question,
      threshold: RAG_MATCH_THRESHOLD,
      rpcName: "match_document_chunks_public",
    });
  } catch {
    const assistantMessageId = await saveWidgetAssistantMessage({
      conversationId: params.conversationId,
      answer: RAG_PROVIDER_ERROR_FALLBACK,
      isAnswered: false,
      inputTokens: null,
      outputTokens: null,
    });

    return {
      answer: RAG_PROVIDER_ERROR_FALLBACK,
      isAnswered: false,
      assistantMessageId,
      sources: [] as RetrievedSource[],
      publicSources: [] as PublicAnswerSource[],
      inputTokens: null,
      outputTokens: null,
    };
  }

  if (sources.length === 0) {
    const assistantMessageId = await saveWidgetAssistantMessage({
      conversationId: params.conversationId,
      answer: RAG_FALLBACK,
      isAnswered: false,
      inputTokens: null,
      outputTokens: null,
    });

    return {
      answer: RAG_FALLBACK,
      isAnswered: false,
      assistantMessageId,
      sources: [],
      publicSources: [],
      inputTokens: null,
      outputTokens: null,
    };
  }

  try {
    const generated = await generateGroundedAnswer({
      chatbotPrompt: params.chatbot.system_prompt,
      sources,
      question: params.question,
    });

    const answer = generated.answer;
    const isAnswered = generated.isAnswered;
    const savedSources = isAnswered ? sources : [];
    const assistantMessageId = await saveWidgetAssistantMessage({
      conversationId: params.conversationId,
      answer,
      isAnswered,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
    });

    await saveWidgetMessageSources(assistantMessageId, savedSources);
    const publicSources = await getPublicSourcesForMessage(assistantMessageId);

    return {
      answer,
      isAnswered,
      assistantMessageId,
      sources: savedSources,
      publicSources,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
    };
  } catch (error) {
    console.error(
      `Public widget answer generation failed (chatbotId=${params.chatbot.id}, workspaceId=${params.chatbot.workspace_id}, message=${error instanceof Error ? error.message : "unknown"})`
    );

    const assistantMessageId = await saveWidgetAssistantMessage({
      conversationId: params.conversationId,
      answer: RAG_PROVIDER_ERROR_FALLBACK,
      isAnswered: false,
      inputTokens: null,
      outputTokens: null,
    });

    return {
      answer: RAG_PROVIDER_ERROR_FALLBACK,
      isAnswered: false,
      assistantMessageId,
      sources: [],
      publicSources: [],
      inputTokens: null,
      outputTokens: null,
    };
  }
}
