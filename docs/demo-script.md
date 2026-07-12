# AskFlow Demo Script

Target length: 5-8 minutes. Use the configured `NEXT_PUBLIC_DEMO_CHATBOT_PUBLIC_ID` for the public demo and a clean development account for the dashboard walkthrough.

## Flow

1. Start on `/` and frame the product: company documentation becomes a grounded support assistant.
2. Open `/pricing` and point out Free, Starter, and Pro limits. Mention that checkout is mock-only and no card is charged.
3. Sign in at `/login` and show the workspace dashboard.
4. Open the chatbot and the Knowledge tab. Use the CloudDesk TXT fixture and wait for `Ready`.
5. Ask `How do I invite a team member?` in Playground. Show the grounded answer and source reference.
6. Ask `Does CloudDesk support Slack?` and point out that the answer stays within the document.
7. Open Appearance, adjust color/theme/position, and show the preview.
8. Open Install and copy the real script snippet using the configured app URL and public ID.
9. Open `/demo` and show the public widget on the demo host page.
10. Ask `What is the weather in Amsterdam?` and show the honest fallback with no invented answer.
11. Return to Billing and explain server-side usage limits and the mock upgrade path.
12. Open Analytics on Starter/Pro, or show the upgrade state on Free.
13. Close with the architecture: Supabase Auth/RLS, private Storage, OpenRouter embeddings/chat, pgvector retrieval, and iframe isolation.

## Expected answers

- `How do I invite a team member?` should answer from the team invitation section and show a source.
- `Does CloudDesk support Slack?` should describe the documented Slack integration and show a source.
- `What is the weather in Amsterdam?` should use the grounded fallback because it is outside the fixture.

Keep the demo on test data. Do not show secrets, internal IDs, service-role credentials, or raw provider errors.
