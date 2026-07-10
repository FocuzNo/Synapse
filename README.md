# AskFlow

AskFlow is a production-minded SaaS MVP for building AI chatbots from company documents. The first product goal is a narrow but complete RAG flow: a user signs up, creates a workspace and chatbot, uploads a TXT document, asks a question, receives an answer grounded in the uploaded knowledge base, sees sources, and conversation history is saved.

## Current Repository State

The technical foundation is initialized directly in the repository root with:

- Next.js `16.2.10`
- React `19.2.4`
- TypeScript strict mode
- App Router
- Tailwind CSS v4
- shadcn/ui components
- Supabase SSR clients
- Zod environment validation
- Real Supabase email/password authentication
- Auth-aware Next.js request proxy and server-side protected layout
- Profile/workspace tenant schema with RLS
- Chatbot domain schema with RLS
- Chatbot CRUD, onboarding, Free plan limit enforcement
- TXT knowledge upload, processing, embeddings, vector search, and grounded Playground answers
- Dashboard shell and minimal marketing/auth routes

PDF/DOCX upload, Markdown upload, streaming responses, Stripe flow, widget API, public conversations, and analytics are not implemented yet.

## Documentation

- [Product Requirements](docs/product-requirements.md)
- [Architecture](docs/architecture.md)
- [Implementation Plan](docs/implementation-plan.md)
- Environment template: `.env.example`

## Setup

Install dependencies:

```bash
npm install
```

Create local environment values:

```bash
cp .env.example .env.local
```

Fill the required values in `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSION=1536
```

Stripe values can stay empty for now. Billing is not part of this foundation milestone.

## Supabase Setup

1. Create a new Supabase project.
2. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the anon public key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.
5. Keep the service role key server-only. Never expose it with `NEXT_PUBLIC_`.
6. In Supabase Auth URL Configuration, set Site URL to `http://localhost:3000` for local development.
7. Add this redirect URL: `http://localhost:3000/auth/callback`.

Email confirmation can be enabled or disabled in Supabase Auth provider settings:

- Disabled: signup creates a session immediately and redirects to `/app`.
- Enabled: signup shows a confirmation state; after clicking the email link, Supabase returns to `/auth/callback` and then `/app`.

Apply migrations with the Supabase CLI after linking the project:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

If the Supabase CLI is not available, open the Supabase SQL Editor and run the migration files in order from `supabase/migrations`.

The migrations currently:

- `pgcrypto` for `gen_random_uuid()`
- `vector` for future embedding similarity search
- `profiles`
- `workspaces`
- `workspace_members`
- signup trigger that creates profile, workspace, and owner membership
- Row Level Security policies for tenant access
- `chatbots` with workspace-scoped RLS policies and non-sequential `public_id`
- `documents`
- `document_chunks` with `vector(1536)`
- `conversations`
- `messages`
- `message_sources`
- private `knowledge-files` Storage bucket
- `match_document_chunks` RPC for tenant-scoped vector search

## Verify Chatbot CRUD

After applying migrations and signing in:

1. Open `/app/onboarding`.
2. Confirm workspace details.
3. Create the first chatbot.
4. Open `/app/chatbots` and verify the chatbot appears.
5. Try creating a second chatbot on the Free plan; the server should reject it.
6. Open the chatbot detail page.
7. Update general settings.
8. Update appearance and verify the dashboard preview changes.
9. Change status from `draft` to `active`, then `disabled`, then back to `active`.
10. Delete the chatbot after confirming the destructive action.

The Free plan currently allows 1 chatbot. This is enforced in server actions, not only in the UI.

Onboarding currently ends after chatbot creation. Knowledge upload is intentionally deferred.

## Verify TXT RAG Flow

After applying migrations and setting Supabase/OpenAI credentials:

1. Create or open a chatbot.
2. Open the Knowledge tab.
3. Upload a UTF-8 `.txt` file under 2 MB.
4. Confirm the document becomes `ready` and shows chunk count.
5. Open Playground.
6. Ask a question covered by the TXT file.
7. Confirm the answer is grounded and shows saved sources.
8. Ask an unrelated question and confirm the fallback response.
9. Refresh and reopen the conversation from history.

Processing is synchronous in the upload request for MVP simplicity. There is no fake background worker or fake progress percentage.

Embedding model: `text-embedding-3-small`, dimension `1536`.
Chat model default: `gpt-4.1-mini`.
Fallback response:

```text
I couldn't find enough information in the available knowledge base. Try rephrasing your question or contact the support team.
```

## Verify Auth Flow

1. Run `npm run dev`.
2. Open `http://localhost:3000/signup`.
3. Create an account with full name, company name, email, and password.
4. If email confirmation is disabled, you should land on `/app`.
5. If email confirmation is enabled, confirm the email and return through `/auth/callback`.
6. Open `/app/settings` and update profile/workspace details.
7. Use Logout from the dashboard header.
8. Sign back in from `/login`.

## Development

Run the app:

```bash
npm run dev
```

Run checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Application Routes

Public:

- `/`
- `/pricing`
- `/login`
- `/signup`

Protected:

- `/app`
- `/app/onboarding`
- `/app/chatbots`
- `/app/chatbots/new`
- `/app/chatbots/[id]`
- `/app/billing`
- `/app/settings`

Routes under `/app` are protected by the root Next.js request proxy and by the server-side dashboard layout.

## Development Rules

- Keep OpenAI, Supabase service role, and Stripe secret keys server-only.
- Use Row Level Security for tenant-specific data.
- Every tenant-owned table must include `workspace_id`.
- Every vector search must filter by both `workspace_id` and `chatbot_id`.
- Use Server Components by default and Client Components only for interactive UI.
- Use Route Handlers for uploads, RAG chat, billing callbacks, and public widget APIs.
- Validate external input with Zod.
- Do not introduce a separate backend service for the MVP.

## Next Milestone

Next: harden the RAG flow with streaming, retries, richer document management, and PDF/DOCX support.
