# AskFlow Implementation Plan

## Milestone Strategy

The product should be built in small vertical slices. Each milestone must leave the app buildable and usable.

## Milestone 0: Repository Bootstrap

Goal: initialize the app and install the baseline stack.

Scope:

- Create Next.js app with TypeScript, App Router, Tailwind, ESLint, and `src` alias.
- Add shadcn/ui and Lucide Icons.
- Add Supabase, OpenAI, Zod, and Stripe packages.
- Configure strict TypeScript.
- Add base layout, app shell, and route groups.
- Add `.env.local` locally from `.env.example`.

Recommended command:

```bash
npx create-next-app@latest askflow --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Expected dependencies after bootstrap:

```bash
npm install @supabase/supabase-js @supabase/ssr openai zod stripe lucide-react
```

## Milestone 1: First End-to-End RAG Flow

Goal: complete the first working product flow.

Exact scope:

1. Supabase Auth signup, login, logout.
2. Workspace auto-creation after signup or first app access.
3. Protected `/app` area with middleware.
4. Chatbot creation and listing.
5. TXT document upload to Supabase Storage.
6. Document metadata row creation.
7. Server-side document processing:
   - read uploaded TXT;
   - extract text;
   - split into chunks;
   - create embeddings;
   - store chunks in `document_chunks`.
8. Internal chatbot playground.
9. RAG route handler:
   - validate request;
   - create query embedding;
   - run vector search filtered by `workspace_id` and `chatbot_id`;
   - apply fallback when context is insufficient;
   - stream or return AI answer;
   - persist conversation, messages, and sources.
10. Source list displayed under assistant answers.

Files likely created or changed:

- `middleware.ts`
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/app/layout.tsx`
- `app/app/page.tsx`
- `app/app/chatbots/page.tsx`
- `app/app/chatbots/[id]/playground/page.tsx`
- `app/api/documents/upload/route.ts`
- `app/api/documents/process/route.ts`
- `app/api/chat/route.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/auth/workspace.ts`
- `lib/documents/chunk.ts`
- `lib/documents/process-document.ts`
- `lib/embeddings/create-embedding.ts`
- `lib/rag/search.ts`
- `lib/rag/answer.ts`
- `lib/limits/plans.ts`
- `lib/validation/*.ts`
- `supabase/migrations/*.sql`

Risks:

- Supabase local setup may not be available on the machine.
- pgvector extension must be enabled before creating vector columns.
- OpenAI API calls require real server-side credentials.
- Streaming implementation should not compromise persistence; save final assistant message after stream completion.

## Milestone 2: Knowledge Management and Better UX

Current completed foundation before TXT ingestion:

- Supabase Auth signup/login/logout.
- Profile, workspace, and workspace membership creation.
- Chatbot table with RLS.
- Chatbot CRUD and onboarding.
- Free plan chatbot limit enforced on the server.
- Chatbot detail tabs for Overview, Playground, Knowledge, Conversations, Appearance, and Install.
- Honest empty states for surfaces that need knowledge, conversations, widget, or analytics.
- TXT upload, synchronous processing, chunking, embeddings, vector retrieval, grounded non-streaming answers, source persistence, and conversation history.

Scope:

- Document status UI.
- Retry failed processing.
- Empty and error states.
- Document deletion.
- Markdown support.
- Upload validation and plan limit dialogs.

## Milestone 3: Public Widget

Scope:

- `/embed/[publicId]` route.
- Public widget script or iframe embed code.
- Widget chat API with public chatbot resolution.
- Branding rules by plan.
- Basic appearance settings.

## Milestone 4: Billing and Gating

Scope:

- Mock billing first.
- Starter plan upgrade flow.
- Server-side plan enforcement.
- Usage counters for monthly AI messages.
- Stripe test Checkout after mock flow is stable.

## Milestone 5: Analytics and Polish

Scope:

- Conversation history UI.
- Basic analytics: total conversations, total messages, unanswered/fallback count.
- Landing page aligned with implemented features.
- Production deployment checklist.

## Supabase Migrations

Recommended migration list:

1. `0001_enable_extensions.sql`
   - Enable `pgcrypto`.
   - Enable `vector`.

2. `0002_create_core_tables.sql`
   - `workspaces`
   - `chatbots`
   - `documents`
   - `document_chunks`
   - `conversations`
   - `messages`
   - `message_sources`
   - `usage_counters`

3. `0003_create_indexes.sql`
   - Foreign key indexes.
   - `chatbots(public_id)` unique index.
   - `document_chunks(workspace_id, chatbot_id)`.
   - Vector index for `document_chunks.embedding`.

4. `0004_create_vector_search_function.sql`
   - RPC function `match_document_chunks`.
   - Required filters: `workspace_id`, `chatbot_id`.
   - Returns chunk id, document id, content, and similarity score.

5. `0005_enable_rls.sql`
   - Enable RLS on all tenant tables.
   - Add workspace ownership policies.
   - Add child-table policies scoped through workspace ownership.

6. `0006_create_storage_bucket.sql`
   - Create private `documents` bucket.
   - Add storage policies for authenticated users.

7. `0007_create_updated_at_triggers.sql`
   - Add shared `set_updated_at` trigger function.
   - Attach to mutable tables.

## Verification Per Milestone

Run when available:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If the project uses only the default Next.js scripts initially, add `typecheck`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

## First Implementation Command

After approving the plan, start with:

```bash
npx create-next-app@latest askflow --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```
