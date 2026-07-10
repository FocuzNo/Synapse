export const KNOWLEDGE_BUCKET = "knowledge-files";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 1536;
export const CHAT_MODEL_FALLBACK = "gpt-4.1-mini";
export const MAX_TXT_FILE_SIZE_MB = 2;
export const MAX_TXT_FILE_SIZE_BYTES = MAX_TXT_FILE_SIZE_MB * 1024 * 1024;
export const MAX_EXTRACTED_CHARACTERS = 120_000;
export const CHUNK_TARGET_CHARACTERS = 1200;
export const CHUNK_OVERLAP_CHARACTERS = 180;
export const RAG_TOP_K = 5;
export const RAG_MATCH_THRESHOLD = 0.25;
export const RAG_MAX_CONTEXT_CHARACTERS = 9000;
export const RAG_FALLBACK =
  "I couldn't find enough information in the available knowledge base. Try rephrasing your question or contact the support team.";
