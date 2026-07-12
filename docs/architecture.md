# AskFlow Architecture

## Current State

The repository now contains a real Next.js application with:

- Supabase SSR auth clients
- tenant schema and RLS
- chatbot CRUD
- TXT knowledge ingestion
- pgvector retrieval
- grounded playground answers
- conversation persistence
- public iframe widget foundation
- subscription foundation with centralized Free, Starter, and Pro entitlements
- server-side feature gates and mock billing flow
- production-shaped marketing and env-driven public demo surfaces

This document reflects the actual code path, not the original greenfield plan.

## Runtime Flow

Current end-to-end flow in code:

1. User signs up with email, password, `full_name`, and `company_name`.
2. Supabase Auth trigger `handle_new_user()` creates:

- `profiles`
- `workspaces`
- `workspace_members`

3. User logs in through password auth.
4. Protected routes are gated by the request proxy and by server-side `/app` layout checks.
5. User creates a chatbot in the current workspace.
6. User uploads a TXT file to the chatbot Knowledge tab.
7. A `documents` row is created as `processing`.
8. The original file is uploaded into private Storage bucket `knowledge-files`.
9. TXT content is normalized and chunked server-side.
10. OpenRouter embeddings are created with `openai/text-embedding-3-small`.
11. Chunks are stored in `document_chunks`.
12. Document status is updated to `ready`.
13. Playground stores the user message.
14. The query is embedded and sent to `match_document_chunks`.
15. Relevant chunks are filtered by workspace, chatbot, and ready-document status.
16. If context is sufficient, the chat model generates a grounded answer.
17. Assistant message and source references are persisted.
18. Conversation history is reloaded from Supabase on refresh.
19. Public widget loader `/widget.js` mounts an isolated iframe from `/embed/[publicId]`.
20. Anonymous widget chat resolves the chatbot by `public_id`, applies DB-backed rate limits, reuses shared retrieval/generation logic, and stores `source = 'widget'` conversations.
21. Public widget history reloads by reading the same `public_session_id` from browser storage and fetching a public-safe message list.
22. Billing reads the workspace subscription (falling back to Free), exposes usage summaries, and applies plan gates before mutations and AI usage.
23. The public demo reads `NEXT_PUBLIC_DEMO_CHATBOT_PUBLIC_ID` at request time and mounts the existing public widget without exposing internal identifiers or secrets.

## Data Model

Entity chain:

```text
workspace -> chatbots -> documents -> document_chunks -> conversations -> messages -> message_sources
```

Core tables:

- `profiles`
- `workspaces`
- `workspace_members`
- `chatbots`
- `documents`
- `document_chunks`
- `conversations`
- `messages`
- `message_sources`
- `public_chat_rate_limits`
- `usage_records`
- `subscriptions`

Storage bucket:

- `knowledge-files` (private)

RPC:

- `match_document_chunks`
- `check_public_chat_rate_limit`
- `consume_workspace_ai_usage`
- `set_updated_at` (shared by tenant, chatbot, and subscription records)

## Tenant Isolation

Isolation strategy:

- `profiles` are readable and updatable only by the owning user.
- `workspaces` and `workspace_members` use helper functions based on `auth.uid()`.
- `chatbots`, `documents`, and `conversations` are scoped by workspace membership.
- writes to chatbot and document management routes additionally require `owner` or `admin`.
- vector search requires both `workspace_id` and `chatbot_id`.
- billing gates derive the workspace from the authenticated session and never trust client-supplied tenant identifiers.

Current query helpers never trust `workspace_id` from the client. Workspace context is derived from the authenticated session.

## Admin Client Usage

The admin client is intentionally limited to privileged infrastructure operations:

- workspace recovery for legacy or broken accounts
- inserting `document_chunks`
- inserting `message_sources`
- anonymous public widget conversation and usage writes that cannot rely on authenticated RLS

Rationale:

- `document_chunks` and `message_sources` do not expose direct authenticated insert policies today.
- the app performs tenant checks before every admin write by resolving the chatbot or workspace through the authenticated user first.

Ordinary CRUD stays on the authenticated Supabase server client.

Storage upload and delete now use the authenticated client instead of the admin client so bucket policies remain part of the runtime path.

Billing uses the authenticated client for normal subscription and usage reads. Public widget usage enforcement uses the admin client only after resolving the workspace from the public chatbot and applying the plan limit server-side.

## Billing and Feature Gates

`src/features/billing/plans.ts` is the single source of truth for Free, Starter, and Pro limits. The current subscription provider is `mock` until Stripe is introduced.

- Free: 1 chatbot, 5 documents, 2 MB files, 100 monthly AI messages, branding required, 7-day conversation retention
- Starter: 3 chatbots, 50 documents, 10 MB files, 2,000 monthly AI messages, branding removal, 90-day retention
- Pro: 10 chatbots, 200 documents, 20 MB files, 10,000 monthly AI messages, branding removal, unlimited retention

Creation, upload, branding, analytics access, monthly usage, and conversation-history retention are enforced in server-only helpers. Mock upgrades apply immediately; downgrades are recorded as a scheduled plan change at period end. No Stripe secrets or checkout behavior are required yet.

## Consistency Strategy

### Upload flow

Current safeguards:

- document row starts in `processing`
- invalid UTF-8 or binary-looking content is rejected
- embeddings are batched
- chunk inserts are cleaned up on failure
- uploaded Storage file is removed on failure when possible
- failed documents end in `status = 'failed'` with a safe error message

Remaining limitation:

- the flow is still a JavaScript sequence inside one request, not a database transaction or external job.

### Answer flow

Current safeguards:

- user message is saved before retrieval
- if retrieval or model generation fails after that point, a safe assistant fallback is persisted
- assistant sources are saved best-effort
- `last_message_at` is updated best-effort and logged safely on failure
- public widget availability requires `status = 'active'` plus at least one ready document
- public widget never accepts `workspace_id`, internal chatbot id, or system prompt from the browser
- public widget stores only a browser-generated `public_session_id` and derives tenant context server-side from `public_id`
- public widget returns only public-safe config and source DTOs

Remaining limitation:

- message insert, source insert, and timestamp update are not atomic.

## OpenRouter and Retrieval Settings

Current defaults in code:

- embedding model: `openai/text-embedding-3-small`
- embedding dimension: `1536`
- chat model: `google/gemma-4-26b-a4b-it:free`
- OpenRouter timeout: `30000 ms`
- OpenRouter retries: `1`
- embedding batch size: `20`
- RAG top-k: `5`
- RAG match threshold: `0.25`

`0.25` is now live-verified as the active public-widget threshold. It successfully separated relevant CloudDesk questions from the irrelevant Amsterdam-weather query in this environment.

## Security Notes

- service-role key remains server-only
- safe redirect logic rejects non-internal, protocol-relative, and control-character `next` values
- prompt instructions inside uploaded documents are explicitly treated as untrusted content
- branding remains forced on for the Free plan server-side
- subscription plan limits are checked server-side and are not UI-only affordances
- subscription insert/update privileges are revoked from authenticated clients; mock billing uses a server-only action after session and role validation
- public widget stores hashed IP-derived rate-limit keys using `PUBLIC_RATE_LIMIT_SALT`
- `/embed/[publicId]` is explicitly embeddable while dashboard routes send `frame-ancestors 'none'` and `X-Frame-Options: DENY`

## Verified vs Unverified

Verified live against the linked Supabase project:

- migrations applied through `supabase db push`
- tenant tables, RAG tables, bucket presence, and `match_document_chunks` through `npm run verify:integrations`
- login, logout, protected redirect, and safe internal redirect handling
- tenant bootstrap trigger for a fresh user
- chatbot CRUD up to the point where ready documents are required

Verified locally:

- build, lint, typecheck
- helper-level tests for filename sanitization, TXT normalization, binary detection, chunking, and safe redirects

Verified live in the current environment:

- OpenRouter embeddings through `openai/text-embedding-3-small`
- OpenRouter non-streaming chat through `google/gemma-4-26b-a4b-it:free`
- public widget grounded answers with saved `message_sources`
- irrelevant fallback without source creation
- prompt-injection fallback without system-prompt disclosure
- widget session persistence through `public_session_id`
- tenant scoping by `public_id` without trusting client tenant overrides
- billing schema and plan-gate unit tests

Remaining caution:

- the current Slack answer is grounded and correct enough for MVP, but the source ranking is not perfect and may benefit from future retrieval tuning
- mock billing has no payment processor, webhook synchronization, or real invoice lifecycle
