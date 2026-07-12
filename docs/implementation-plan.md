# AskFlow Implementation Plan

## Milestone Progress

Completed in code:

1. Foundation bootstrap
2. Supabase auth and tenant setup
3. Chatbot domain, CRUD, and onboarding
4. TXT ingestion and first RAG flow
5. Public embeddable chatbot widget foundation
6. Pricing, billing foundation, and server-side feature gating
7. Landing, demo, and deployment readiness polish

Current milestone:

8. Broader document support or Stripe-ready provider boundary

The billing foundation is implemented in code with a mock provider. The landing page, public demo, legal notices, and deployment documentation are now in place. Stripe checkout and webhooks remain intentionally deferred.

## Hardening Goals

Focus areas for the current milestone:

- apply and verify the subscription migration against Supabase
- verify mock upgrade, scheduled downgrade, and plan persistence
- verify chatbot, document, branding, analytics, message, and retention gates against real workspace data
- keep the billing provider boundary ready for Stripe without making Stripe a runtime dependency

## What Was Added In This Pass

- `fixtures/clouddesk-knowledge.txt` for manual end-to-end checks
- `scripts/verify-integrations.ts`
- `npm run test`
- `npm run verify:integrations`
- safer TXT normalization and binary detection
- embedding batching and provider timeout configuration
- upload cleanup for failed processing
- fallback assistant persistence when retrieval or generation fails mid-flow
- stricter safe redirect handling
- `/widget.js`, `/embed/[publicId]`, `/api/public/chatbots/[publicId]`, and `/api/public/chat`
- `/demo/widget?chatbot=PUBLIC_ID` for host-page verification
- DB-backed public rate limiting and workspace usage accounting
- corrective migration for `consume_workspace_ai_usage`
- public-safe chat history loading by `public_session_id`
- `subscriptions` schema with one subscription per workspace
- centralized Free, Starter, and Pro limits
- mock billing upgrade/downgrade actions
- server-side gates for product limits and retention
- billing page, pricing route, and gated analytics placeholder
- corrective subscription mutation lock migration and live tenant/RLS smoke verification
- production-shaped landing page with honest product mockups
- env-driven `/demo` route using the existing public chatbot
- `/privacy`, `/terms`, `robots.txt`, demo script, and demo checklist

## Remaining Manual Runtime Checklist

1. Apply the two billing migrations with `supabase db push`.
2. Verify mock billing transitions and each server-side gate with a real workspace.
3. Keep the current OpenRouter key healthy and re-run the integration verifier after provider or model changes.
4. Expand the knowledge pipeline beyond TXT once billing remains stable.

## Known Runtime Risks

- synchronous upload processing can still be slow for larger TXT inputs
- vector threshold `0.25` is live-verified for the current fixture, but retrieval ranking still deserves future tuning
- multi-step writes are compensated, not transactionally atomic
- admin client is still required for chunk and source inserts until those writes move behind a stricter RPC or dedicated policy design
- free-model instability or provider-side rate limits can still create occasional temporary busy states
- mock billing does not verify payment collection, webhooks, invoices, or provider recovery

## Next Recommended Milestone

Current recommended next milestone:

- PDF/DOCX knowledge ingestion or Stripe integration, chosen as a separate milestone
