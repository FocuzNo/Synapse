import "server-only";
import { getOpenAIClient } from "@/lib/openai/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  EMBEDDING_MODEL,
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

export async function retrieveRelevantSources(chatbot: Chatbot, question: string): Promise<RetrievedSource[]> {
  const openai = getOpenAIClient();
  const embedding = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: question,
  });
  const queryEmbedding = embedding.data[0].embedding;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    target_workspace_id: chatbot.workspace_id,
    target_chatbot_id: chatbot.id,
    match_threshold: RAG_MATCH_THRESHOLD,
    match_count: RAG_TOP_K,
  });

  if (error) {
    console.error("Vector search failed", { code: error.code, chatbotId: chatbot.id });
    throw new Error("VECTOR_SEARCH_ERROR");
  }

  const seen = new Set<string>();
  let characterCount = 0;
  const sources: RetrievedSource[] = [];

  for (const row of data ?? []) {
    const typed = row as {
      chunk_id: string;
      document_id: string;
      content: string;
      original_filename: string;
      filename: string;
      similarity_score: number;
    };

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
