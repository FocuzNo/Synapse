# AskFlow Architecture

## Repository Assessment

Current state:

- Next.js App Router application is initialized in the repository root.
- Supabase Auth, profile/workspace schema, chatbot schema, RLS, and dashboard shell exist.
- Chatbot CRUD and onboarding are implemented.
- Document upload, embeddings, RAG chat, conversations, widget API, billing, and analytics are still deferred.

The architecture below remains the target structure for the production-quality MVP iterations.

## Proposed Folder Structure

```text
.
├── app
│   ├── (auth)
│   │   ├── login
│   │   └── signup
│   ├── (marketing)
│   │   ├── page.tsx
│   │   ├── pricing
│   │   └── demo
│   ├── app
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── onboarding
│   │   ├── chatbots
│   │   │   ├── page.tsx
│   │   │   └── [id]
│   │   │       ├── page.tsx
│   │   │       ├── playground
│   │   │       ├── knowledge
│   │   │       ├── conversations
│   │   │       ├── analytics
│   │   │       ├── appearance
│   │   │       └── install
│   │   ├── billing
│   │   └── settings
│   ├── api
│   │   ├── documents
│   │   │   ├── upload
│   │   │   └── process
│   │   ├── chat
│   │   ├── embed
│   │   └── billing
│   ├── embed
│   │   └── [publicId]
│   ├── layout.tsx
│   └── globals.css
├── components
│   ├── app-shell
│   ├── chat
│   ├── documents
│   ├── forms
│   ├── marketing
│   └── ui
├── lib
│   ├── auth
│   ├── billing
│   ├── documents
│   ├── embeddings
│   ├── limits
│   ├── openai
│   ├── rag
│   ├── supabase
│   ├── validation
│   └── utils.ts
├── middleware.ts
├── supabase
│   ├── migrations
│   └── seed.sql
├── docs
└── public
```

## Data Model

Core entity chain:

```text
Workspace -> Chatbots -> Documents -> Document Chunks -> Conversations -> Messages -> Sources
```

Every tenant-specific table includes `workspace_id`. Search over embeddings must always filter by `workspace_id` and `chatbot_id`.

## Proposed Database Schema

### `workspaces`

- `id uuid primary key default gen_random_uuid()`
- `owner_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `plan text not null default 'free'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `chatbots`

- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `public_id uuid not null default gen_random_uuid()`
- `name text not null`
- `description text`
- `welcome_message text not null default 'Hi! How can I help you today?'`
- `system_prompt text not null`
- `status text not null default 'draft'`
- `theme text not null default 'light'`
- `primary_color text not null default '#6D5DFB'`
- `position text not null default 'bottom-right'`
- `branding_enabled boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Status values: `draft`, `active`, `disabled`.
Theme values: `light`, `dark`.
Position values: `bottom-right`, `bottom-left`.
Free plan workspaces must keep `branding_enabled = true`.

### `documents`

- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `chatbot_id uuid not null references chatbots(id) on delete cascade`
- `name text not null`
- `storage_path text not null`
- `mime_type text not null`
- `size_bytes integer not null`
- `status text not null default 'uploaded'`
- `error_message text`
- `created_at timestamptz not null default now()`
- `processed_at timestamptz`

Statuses: `uploaded`, `processing`, `processed`, `failed`.

### `document_chunks`

- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `chatbot_id uuid not null references chatbots(id) on delete cascade`
- `document_id uuid not null references documents(id) on delete cascade`
- `chunk_index integer not null`
- `content text not null`
- `token_count integer`
- `embedding vector(1536) not null`
- `created_at timestamptz not null default now()`

The `1536` dimension matches OpenAI `text-embedding-3-small`.

TXT ingestion uses synchronous server-side processing for files up to 2 MB:

1. Create `documents` row as `processing`.
2. Upload the original file to private `knowledge-files` Storage.
3. Decode UTF-8 text, normalize whitespace, and preserve paragraph boundaries.
4. Chunk deterministically around 1200 characters with overlap.
5. Create embeddings with `text-embedding-3-small`.
6. Insert chunks and update the document to `ready`.
7. On failure, delete inserted chunks, mark document `failed`, and keep the original private file for diagnostics/retry.

Vector search uses `match_document_chunks`, filtered by `workspace_id`, `chatbot_id`, ready documents, and authenticated workspace membership.

### `conversations`

- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `chatbot_id uuid not null references chatbots(id) on delete cascade`
- `visitor_id text`
- `channel text not null default 'playground'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `messages`

- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `conversation_id uuid not null references conversations(id) on delete cascade`
- `role text not null`
- `content text not null`
- `created_at timestamptz not null default now()`

Roles: `user`, `assistant`, `system`.

### `message_sources`

- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `message_id uuid not null references messages(id) on delete cascade`
- `document_id uuid not null references documents(id) on delete cascade`
- `chunk_id uuid not null references document_chunks(id) on delete cascade`
- `score double precision not null`
- `created_at timestamptz not null default now()`

### `usage_counters`

- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `period_start date not null`
- `ai_messages_count integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique `workspace_id, period_start`

## RLS Strategy

- Users can select and update only workspaces where `owner_id = auth.uid()`.
- Child tables are accessible only through their parent workspace ownership.
- Chatbots are readable by workspace members and writable only by `owner` or `admin` members.
- Public embed access must not bypass tenant scoping; it should resolve `chatbots.public_id`, then use controlled server routes for reads and chat.
- Service role key is allowed only in server-side document processing paths where elevated access is required.

## Server Boundaries

Client-safe:

- Supabase project URL
- Supabase anon key
- Non-sensitive UI configuration

Server-only:

- Supabase service role key
- OpenAI API key
- Stripe secret key
- Stripe webhook secret

## Potential Conflicts With Requested Stack

No conflicts were found in the repository because no app exists yet. The only planning concern is version drift: current `next` on npm is `16.2.10`, so the implementation should verify shadcn/ui compatibility during setup and pin dependency versions in `package.json`.
