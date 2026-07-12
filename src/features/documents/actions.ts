"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAIClient } from "@/lib/ai/client";
import { getServerEnv } from "@/lib/env/server";
import { requireUser } from "@/features/auth/server";
import { getCurrentWorkspace } from "@/features/workspaces/server";
import { getChatbotById } from "@/features/chatbots/queries";
import { assertCanUploadDocument } from "@/features/billing/server";
import {
  EMBEDDING_BATCH_SIZE,
  KNOWLEDGE_BUCKET,
} from "@/features/rag/constants";
import { chunkText, normalizeTxtBuffer, sanitizeFilename } from "@/features/documents/text";
import { getDocumentCountForCurrentWorkspace } from "@/features/documents/queries";
import type { DocumentActionResult, DocumentErrorCode } from "@/features/documents/types";

function documentError<T>(code: DocumentErrorCode, message: string): DocumentActionResult<T> {
  return { ok: false, code, message };
}

function isTxtFile(file: File) {
  return file.name.toLowerCase().endsWith(".txt") && (file.type === "text/plain" || file.type === "");
}

function getDocumentFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";

  if (message === "INVALID_TEXT_FILE") {
    return "The file must be valid UTF-8 plain text.";
  }

  if (message === "NO_TEXT_CHUNKS") {
    return "The TXT file did not contain usable text chunks.";
  }

  if (message === "STORAGE_UPLOAD_FAILED") {
    return "The file could not be uploaded to storage.";
  }

  if (message === "DOCUMENT_UPDATE_FAILED") {
    return "The uploaded file could not be linked to the document record.";
  }

  if (message === "EMBEDDING_COUNT_MISMATCH" || message === "EMBEDDING_DIMENSION_MISMATCH") {
    return "The embedding response was invalid. Please try again.";
  }

  if (message === "CHUNK_INSERT_FAILED") {
    return "Document chunks could not be saved.";
  }

  if (message === "DOCUMENT_READY_UPDATE_FAILED") {
    return "The document finished processing, but its final status could not be saved.";
  }

  if (message.toLowerCase().includes("timeout")) {
    return "Document processing timed out. Please try a smaller TXT file.";
  }

  return "Document processing failed. Check that the file is valid UTF-8 text.";
}

async function createEmbeddingsForChunks(chunks: Array<{ content: string }>) {
  const env = getServerEnv();
  const ai = getAIClient();
  const embeddings: number[][] = [];

  for (let index = 0; index < chunks.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(index, index + EMBEDDING_BATCH_SIZE).map((chunk) => chunk.content);
    const response = await ai.embeddings.create({
      model: env.OPENROUTER_EMBEDDING_MODEL,
      input: batch,
    });

    if (response.data.length !== batch.length) {
      throw new Error("EMBEDDING_COUNT_MISMATCH");
    }

    for (const item of response.data) {
      if (item.embedding.length !== env.OPENROUTER_EMBEDDING_DIMENSIONS) {
        throw new Error("EMBEDDING_DIMENSION_MISMATCH");
      }

      embeddings.push(item.embedding);
    }
  }

  return embeddings;
}

async function requireOwnerWorkspace() {
  await requireUser();
  const currentWorkspace = await getCurrentWorkspace();

  if (!currentWorkspace) {
    return {
      ok: false as const,
      code: "FORBIDDEN" as const,
      message: "Workspace was not found.",
    };
  }

  if (!["owner", "admin"].includes(currentWorkspace.membership.role)) {
    return {
      ok: false as const,
      code: "FORBIDDEN" as const,
      message: "You do not have permission to manage knowledge files.",
    };
  }

  return { ok: true as const, currentWorkspace };
}

export async function uploadTxtDocumentAction(formData: FormData): Promise<DocumentActionResult<{ documentId: string }>> {
  const workspaceResult = await requireOwnerWorkspace();

  if (!workspaceResult.ok) {
    return documentError(workspaceResult.code, workspaceResult.message);
  }

  const chatbotId = String(formData.get("chatbotId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return documentError("EMPTY_FILE", "Choose a TXT file to upload.");
  }

  if (!isTxtFile(file)) {
    return documentError("UNSUPPORTED_FILE_TYPE", "Only .txt files are supported in this milestone.");
  }

  if (file.size <= 0) {
    return documentError("EMPTY_FILE", "The selected file is empty.");
  }

  const chatbot = await getChatbotById(chatbotId);

  if (!chatbot) {
    return documentError("CHATBOT_NOT_FOUND", "Chatbot was not found.");
  }

  const documentCount = await getDocumentCountForCurrentWorkspace();
  const limit = await assertCanUploadDocument(documentCount, file.size);

  if (!limit.ok) {
    return documentError(limit.code, limit.message);
  }

  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();
  const sanitizedFilename = sanitizeFilename(file.name);
  const originalFilename = file.name;
  const { data: documentRow, error: documentErrorResult } = await supabase
    .from("documents")
    .insert({
      workspace_id: chatbot.workspace_id,
      chatbot_id: chatbot.id,
      filename: sanitizedFilename,
      original_filename: originalFilename,
      storage_path: "pending",
      mime_type: "text/plain",
      size_bytes: file.size,
      status: "processing",
    })
    .select("id")
    .single()
    .returns<{ id: string }>();

  if (documentErrorResult || !documentRow) {
    console.error("Failed to create document row", { code: documentErrorResult?.code, chatbotId });
    return documentError("DATABASE_ERROR", "Document could not be created.");
  }

  const storagePath = `${chatbot.workspace_id}/${chatbot.id}/${documentRow.id}/${sanitizedFilename}`;
  let storageUploaded = false;

  try {
    const buffer = await file.arrayBuffer();
    let text: string;

    try {
      text = normalizeTxtBuffer(buffer);
    } catch {
      throw new Error("INVALID_TEXT_FILE");
    }

    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error("NO_TEXT_CHUNKS");
    }

    const uploadResult = await supabase.storage
      .from(KNOWLEDGE_BUCKET)
      .upload(storagePath, file, {
        contentType: "text/plain",
        upsert: false,
      });

    if (uploadResult.error) {
      throw new Error("STORAGE_UPLOAD_FAILED");
    }

    storageUploaded = true;

    const { error: storagePathError } = await supabase
      .from("documents")
      .update({ storage_path: storagePath })
      .eq("id", documentRow.id)
      .eq("workspace_id", chatbot.workspace_id);

    if (storagePathError) {
      throw new Error("DOCUMENT_UPDATE_FAILED");
    }

    const embeddings = await createEmbeddingsForChunks(chunks);

    const chunkRows = chunks.map((chunk, index) => ({
      workspace_id: chatbot.workspace_id,
      chatbot_id: chatbot.id,
      document_id: documentRow.id,
      chunk_index: index,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: embeddings[index],
      metadata: {
        originalFilename,
        start: index,
      },
    }));

    const { error: chunkError } = await admin.from("document_chunks").insert(chunkRows);

    if (chunkError) {
      throw new Error("CHUNK_INSERT_FAILED");
    }

    const { error: readyError } = await supabase
      .from("documents")
      .update({
        status: "ready",
        chunks_count: chunks.length,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", documentRow.id)
      .eq("workspace_id", chatbot.workspace_id);

    if (readyError) {
      throw new Error("DOCUMENT_READY_UPDATE_FAILED");
    }

    revalidatePath(`/app/chatbots/${chatbot.id}`);

    return {
      ok: true,
      data: { documentId: documentRow.id },
      message: "Document uploaded and processed.",
    };
  } catch (error) {
    console.error("Document processing failed", {
      documentId: documentRow.id,
      chatbotId: chatbot.id,
      workspaceId: chatbot.workspace_id,
      message: error instanceof Error ? error.message : "unknown",
    });

    await admin.from("document_chunks").delete().eq("document_id", documentRow.id);
    if (storageUploaded) {
      await supabase.storage.from(KNOWLEDGE_BUCKET).remove([storagePath]);
    }

    const failureMessage = getDocumentFailureMessage(error);
    await supabase
      .from("documents")
      .update({
        status: "failed",
        chunks_count: 0,
        error_message: failureMessage,
        processed_at: new Date().toISOString(),
        storage_path: storagePath,
      })
      .eq("id", documentRow.id)
      .eq("workspace_id", chatbot.workspace_id);

    revalidatePath(`/app/chatbots/${chatbot.id}`);

    return documentError("DOCUMENT_PROCESSING_FAILED", failureMessage);
  }
}

export async function deleteDocumentAction(input: { documentId: string; chatbotId: string }): Promise<DocumentActionResult> {
  const workspaceResult = await requireOwnerWorkspace();

  if (!workspaceResult.ok) {
    return documentError(workspaceResult.code, workspaceResult.message);
  }

  const chatbot = await getChatbotById(input.chatbotId);

  if (!chatbot) {
    return documentError("CHATBOT_NOT_FOUND", "Chatbot was not found.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: documentRow, error: loadError } = await supabase
    .from("documents")
    .select("id,storage_path")
    .eq("id", input.documentId)
    .eq("workspace_id", chatbot.workspace_id)
    .eq("chatbot_id", chatbot.id)
    .single()
    .returns<{ id: string; storage_path: string }>();

  if (loadError || !documentRow) {
    return documentError("DATABASE_ERROR", "Document was not found.");
  }

  const removeResult = await supabase.storage.from(KNOWLEDGE_BUCKET).remove([documentRow.storage_path]);

  if (removeResult.error) {
    console.error("Failed to delete storage object", {
      documentId: input.documentId,
      chatbotId: chatbot.id,
      workspaceId: chatbot.workspace_id,
      message: removeResult.error.message,
    });
    return documentError("DATABASE_ERROR", "Document file could not be deleted from storage.");
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentRow.id)
    .eq("workspace_id", chatbot.workspace_id);

  if (error) {
    console.error("Failed to delete document", { code: error.code, documentId: input.documentId });
    return documentError("DATABASE_ERROR", "Document could not be deleted.");
  }

  revalidatePath(`/app/chatbots/${chatbot.id}`);
  return { ok: true, data: undefined, message: "Document deleted." };
}
