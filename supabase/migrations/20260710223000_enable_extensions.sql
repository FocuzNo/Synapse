-- pgcrypto provides gen_random_uuid(), which the core AskFlow tables will use
-- for primary keys in later migrations.
create extension if not exists "pgcrypto";

-- pgvector stores embedding vectors and enables similarity search for
-- workspace- and chatbot-scoped RAG retrieval.
create extension if not exists "vector";
