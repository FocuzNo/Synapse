create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  filename text not null,
  original_filename text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  status text not null default 'processing',
  chunks_count integer not null default 0,
  error_message text null,
  created_at timestamptz not null default now(),
  processed_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint documents_status_check check (status in ('processing', 'ready', 'failed')),
  constraint documents_size_bytes_check check (size_bytes > 0),
  constraint documents_chunks_count_check check (chunks_count >= 0)
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint document_chunks_chunk_index_check check (chunk_index >= 0),
  constraint document_chunks_token_count_check check (token_count > 0),
  constraint document_chunks_document_chunk_index_key unique (document_id, chunk_index)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  source text not null default 'playground',
  public_session_id uuid null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_source_check check (source in ('playground', 'widget'))
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null,
  content text not null,
  input_tokens integer null,
  output_tokens integer null,
  is_answered boolean not null default true,
  created_at timestamptz not null default now(),
  constraint messages_role_check check (role in ('user', 'assistant', 'system'))
);

create table if not exists public.message_sources (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  document_chunk_id uuid not null references public.document_chunks(id) on delete cascade,
  similarity_score double precision not null,
  created_at timestamptz not null default now(),
  constraint message_sources_similarity_score_check check (similarity_score >= 0 and similarity_score <= 1)
);

create index if not exists documents_workspace_chatbot_idx on public.documents(workspace_id, chatbot_id);
create index if not exists documents_chatbot_created_at_idx on public.documents(chatbot_id, created_at desc);
create index if not exists documents_chatbot_status_idx on public.documents(chatbot_id, status);
create index if not exists document_chunks_workspace_chatbot_idx on public.document_chunks(workspace_id, chatbot_id);
create index if not exists document_chunks_document_chunk_index_idx on public.document_chunks(document_id, chunk_index);
create index if not exists document_chunks_embedding_hnsw_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists conversations_workspace_chatbot_last_message_idx
  on public.conversations(workspace_id, chatbot_id, last_message_at desc);
create index if not exists messages_conversation_created_at_idx on public.messages(conversation_id, created_at);
create index if not exists message_sources_message_id_idx on public.message_sources(message_id);

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = target_conversation_id
      and public.is_workspace_member(c.workspace_id)
  );
$$;

create or replace function public.is_message_member(target_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = target_message_id
      and public.is_workspace_member(c.workspace_id)
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;
revoke all on function public.is_message_member(uuid) from public;
grant execute on function public.is_message_member(uuid) to authenticated;

create or replace function public.match_document_chunks(
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
security invoker
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
    and d.status = 'ready'
    and public.is_workspace_member(dc.workspace_id)
    and (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  order by dc.embedding <=> query_embedding
  limit least(match_count, 10);
$$;

revoke all on function public.match_document_chunks(vector(1536), uuid, uuid, double precision, integer) from public;
grant execute on function public.match_document_chunks(vector(1536), uuid, uuid, double precision, integer) to authenticated;

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_sources enable row level security;

create policy "Members can read documents"
on public.documents for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Owners and admins can insert documents"
on public.documents for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "Owners and admins can update documents"
on public.documents for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "Owners and admins can delete documents"
on public.documents for delete to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "Members can read chunks"
on public.document_chunks for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Members can read conversations"
on public.conversations for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Members can insert playground conversations"
on public.conversations for insert to authenticated
with check (source = 'playground' and public.is_workspace_member(workspace_id));

create policy "Members can update playground conversations"
on public.conversations for update to authenticated
using (source = 'playground' and public.is_workspace_member(workspace_id))
with check (source = 'playground' and public.is_workspace_member(workspace_id));

create policy "Members can read messages"
on public.messages for select to authenticated
using (public.is_conversation_member(conversation_id));

create policy "Members can insert messages"
on public.messages for insert to authenticated
with check (public.is_conversation_member(conversation_id));

create policy "Members can read message sources"
on public.message_sources for select to authenticated
using (public.is_message_member(message_id));

revoke all on public.documents from anon, authenticated;
revoke all on public.document_chunks from anon, authenticated;
revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.message_sources from anon, authenticated;

grant select, insert, update, delete on public.documents to authenticated;
grant select on public.document_chunks to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.message_sources to authenticated;

insert into storage.buckets (id, name, public)
values ('knowledge-files', 'knowledge-files', false)
on conflict (id) do update set public = false;

create or replace function public.can_access_storage_workspace(workspace_path text, allowed_roles text[] default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  workspace_uuid uuid;
begin
  begin
    workspace_uuid := workspace_path::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  if allowed_roles is null then
    return public.is_workspace_member(workspace_uuid);
  end if;

  return public.has_workspace_role(workspace_uuid, allowed_roles);
end;
$$;

revoke all on function public.can_access_storage_workspace(text, text[]) from public;
grant execute on function public.can_access_storage_workspace(text, text[]) to authenticated;

create policy "Members can read knowledge files"
on storage.objects for select to authenticated
using (
  bucket_id = 'knowledge-files'
  and public.can_access_storage_workspace((storage.foldername(name))[1])
);

create policy "Owners and admins can upload knowledge files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'knowledge-files'
  and public.can_access_storage_workspace((storage.foldername(name))[1], array['owner', 'admin'])
);

create policy "Owners and admins can delete knowledge files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'knowledge-files'
  and public.can_access_storage_workspace((storage.foldername(name))[1], array['owner', 'admin'])
);
