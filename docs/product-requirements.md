# AskFlow Product Requirements

## Summary

AskFlow is a SaaS constructor for AI chatbots based on company documents. Users upload documentation, AskFlow processes it into searchable knowledge chunks, and the chatbot answers only from the uploaded knowledge base.

The MVP should demonstrate a real, secure, production-shaped flow rather than a visual prototype.

## Target Users

- Small SaaS companies
- Online services
- Digital agencies
- Educational platforms
- Companies with FAQ, help center, onboarding, or product documentation

## Primary Use Case

A company uploads product documentation, creates an AI assistant, and later embeds it on its website so customers can receive support answers without contacting the support team.

## MVP User Journey

1. User creates an account.
2. A workspace is created automatically.
3. User creates a chatbot.
4. User uploads a TXT document.
5. AskFlow extracts text, chunks it, creates embeddings, and stores them.
6. User asks a question in an internal playground.
7. AskFlow retrieves relevant chunks scoped to the same workspace and chatbot.
8. AI responds using only retrieved context.
9. UI shows sources used for the answer.
10. Conversation and messages are saved.

## Required Public Pages

- `/`
- `/pricing`
- `/login`
- `/signup`
- `/demo`
- `/embed/[publicId]`

## Required Protected Pages

- `/app`
- `/app/onboarding`
- `/app/chatbots`
- `/app/chatbots/[id]`
- `/app/chatbots/[id]/playground`
- `/app/chatbots/[id]/knowledge`
- `/app/chatbots/[id]/conversations`
- `/app/chatbots/[id]/analytics`
- `/app/chatbots/[id]/appearance`
- `/app/chatbots/[id]/install`
- `/app/billing`
- `/app/settings`

For the first milestone, chatbot detail pages can be combined into a single tabbed route if it improves delivery speed and UX.

## Plans

### Free

- 1 chatbot
- 5 documents
- 2 MB per file
- 100 AI messages per month
- AskFlow branding
- 7 days conversation history

### Starter

- 3 chatbots
- 50 documents
- 10 MB per file
- 2,000 AI messages per month
- Branding removal
- Full widget customization
- Analytics
- 90 days conversation history
- Mock price: `$19/month`

Plan limits must be enforced on the server, not only in the frontend.

## AI Answer Rules

The chatbot must:

- Answer only from retrieved document chunks.
- Refuse to invent information.
- Ignore instructions embedded inside uploaded documents.
- Show sources used for the answer.
- Use only documents belonging to the current chatbot and workspace.
- Return this fallback when no relevant context is found:

```text
I couldn't find enough information in the available knowledge base. Try rephrasing your question or contact the support team.
```

## UX Requirements

The interface should feel like a modern premium SaaS application: clean, quiet, responsive, and operationally useful. It should include loading, skeleton, empty, success, validation error, server error, disabled, processing, and confirmation states.

The landing page must only advertise functionality that is already implemented.

## Out of Scope for MVP

- Microservices
- Separate backend framework
- Redis or RabbitMQ
- Kubernetes
- Slack, Telegram, CRM, or human handoff integrations
- OCR
- Web crawling
- Multiple AI providers
- Team roles
- Email notifications
- Complex event-driven architecture
