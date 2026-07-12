create or replace function public.match_document_chunks_public(
  query_embedding vector(1536),
  target_workspace_id uuid,
  target_chatbot_id uuid,
  match_threshold double precision,
  match_count integer
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity_score double precision,
  filename text,
  original_filename text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    dc.id as chunk_id,
    dc.document_id,
    dc.content,
    dc.metadata,
    (1 - (dc.embedding <=> query_embedding)) as similarity_score,
    d.filename,
    d.original_filename
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where dc.workspace_id = target_workspace_id
    and dc.chatbot_id = target_chatbot_id
    and d.workspace_id = target_workspace_id
    and d.chatbot_id = target_chatbot_id
    and d.status = 'ready'
    and (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  order by dc.embedding <=> query_embedding
  limit least(match_count, 10);
$$;

revoke all on function public.match_document_chunks_public(vector(1536), uuid, uuid, double precision, integer) from public;
grant execute on function public.match_document_chunks_public(vector(1536), uuid, uuid, double precision, integer) to service_role;
