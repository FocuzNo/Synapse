import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIClient } from "@/lib/ai/client";
import { getServerEnv } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  RAG_MATCH_THRESHOLD,
  RAG_MAX_CONTEXT_CHARACTERS,
  RAG_TOP_K,
} from "@/features/rag/constants";
import type { Chatbot } from "@/features/chatbots/types";

export type RetrievedSource = {
  chunkId: string;
  documentId: string;
  content: string;
  filename: string;
  similarityScore: number;
};

function mapRetrievedSources(
  rows: Array<{
    chunk_id: string;
    document_id: string;
    content: string;
    original_filename: string;
    filename: string;
    similarity_score: number;
  }>
) {
  const seen = new Set<string>();
  let characterCount = 0;
  const sources: RetrievedSource[] = [];

  for (const typed of rows) {
    const normalized = typed.content.trim();
    if (!normalized || seen.has(normalized.slice(0, 240))) {
      continue;
    }

    if (characterCount + normalized.length > RAG_MAX_CONTEXT_CHARACTERS) {
      break;
    }

    seen.add(normalized.slice(0, 240));
    characterCount += normalized.length;
    sources.push({
      chunkId: typed.chunk_id,
      documentId: typed.document_id,
      content: normalized,
      filename: typed.original_filename || typed.filename,
      similarityScore: typed.similarity_score,
    });
  }

  return sources;
}

export async function retrieveRelevantSourcesForChatbot(params: {
  supabase: SupabaseClient;
  chatbot: Pick<Chatbot, "id" | "workspace_id">;
  question: string;
  threshold?: number;
  matchCount?: number;
  rpcName?: "match_document_chunks" | "match_document_chunks_public";
}): Promise<RetrievedSource[]> {
  const env = getServerEnv();
  const ai = getAIClient();
  const embedding = await ai.embeddings.create({
    model: env.OPENROUTER_EMBEDDING_MODEL,
    input: params.question,
  });
  const queryEmbedding = embedding.data[0].embedding;
  const { data, error } = await params.supabase.rpc(params.rpcName ?? "match_document_chunks", {
    query_embedding: queryEmbedding,
    target_workspace_id: params.chatbot.workspace_id,
    target_chatbot_id: params.chatbot.id,
    match_threshold: params.threshold ?? RAG_MATCH_THRESHOLD,
    match_count: params.matchCount ?? RAG_TOP_K,
  });

  if (error) {
    console.error("Vector search failed", {
      code: error.code,
      chatbotId: params.chatbot.id,
    });
    throw new Error("VECTOR_SEARCH_ERROR");
  }

  return mapRetrievedSources(
    (data ?? []) as Array<{
      chunk_id: string;
      document_id: string;
      content: string;
      original_filename: string;
      filename: string;
      similarity_score: number;
    }>
  );
}

export async function retrieveRelevantSources(
  chatbot: Chatbot,
  question: string
): Promise<RetrievedSource[]> {
  const supabase = await createServerSupabaseClient();

  return retrieveRelevantSourcesForChatbot({
    supabase,
    chatbot,
    question,
  });
}
