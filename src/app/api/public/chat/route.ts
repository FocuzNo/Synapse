import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { publicChatSchema } from "@/features/widget/schemas";
import {
  answerPublicChat,
  checkWidgetRateLimits,
  consumePublicMessageUsage,
  getWidgetConversationHistory,
  getOrCreateWidgetConversation,
  getPublicRateLimitKeys,
  recordUsageTokens,
  resolveAvailablePublicChatbot,
  saveWidgetUserMessage,
  updateConversationTimestamp,
} from "@/features/widget/server";

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

const publicChatHistorySchema = z.object({
  chatbotId: z.uuid(),
  sessionId: z.uuid(),
});

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  const parsed = publicChatHistorySchema.safeParse({
    chatbotId: request.nextUrl.searchParams.get("chatbotId"),
    sessionId: request.nextUrl.searchParams.get("sessionId"),
  });

  if (!parsed.success) {
    return withCors(
      NextResponse.json(
        {
          ok: true,
          messages: [],
        },
        { status: 200 }
      )
    );
  }

  const messages = await getWidgetConversationHistory({
    publicId: parsed.data.chatbotId,
    sessionId: parsed.data.sessionId,
  });

  return withCors(
    NextResponse.json({
      ok: true,
      messages,
    })
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return withCors(
      NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
        },
        { status: 400 }
      )
    );
  }

  const parsed = publicChatSchema.safeParse(body);

  if (!parsed.success) {
    return withCors(
      NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: z.prettifyError(parsed.error),
        },
        { status: 400 }
      )
    );
  }

  const chatbot = await resolveAvailablePublicChatbot(parsed.data.chatbotId);

  if (!chatbot) {
    return withCors(
      NextResponse.json(
        {
          ok: false,
          code: "CHATBOT_UNAVAILABLE",
          message: "This assistant is unavailable.",
        },
        { status: 404 }
      )
    );
  }

  try {
    const rateKeys = getPublicRateLimitKeys(
      request,
      chatbot.public_id,
      parsed.data.sessionId
    );
    const rateLimit = await checkWidgetRateLimits(rateKeys);

    if (!rateLimit.ok) {
      const response = NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMITED",
          message: rateLimit.message,
        },
        { status: 429 }
      );

      response.headers.set(
        "Retry-After",
        String(rateLimit.retryAfterSeconds)
      );

      return withCors(response);
    }

    const usage = await consumePublicMessageUsage(chatbot.workspace_id);

    if (!usage.ok) {
      return withCors(
        NextResponse.json(
          {
            ok: false,
            code: "MESSAGE_LIMIT_REACHED",
            message: usage.message,
          },
          { status: 429 }
        )
      );
    }

    const conversation = await getOrCreateWidgetConversation({
      workspaceId: chatbot.workspace_id,
      chatbotId: chatbot.id,
      sessionId: parsed.data.sessionId,
    });

    await saveWidgetUserMessage({
      conversationId: conversation.id,
      content: parsed.data.message,
    });

    const result = await answerPublicChat({
      chatbot,
      question: parsed.data.message,
      conversationId: conversation.id,
    });

    await updateConversationTimestamp(conversation.id, chatbot.workspace_id);
    await recordUsageTokens({
      workspaceId: chatbot.workspace_id,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    return withCors(
      NextResponse.json({
        ok: true,
        answer: result.answer,
        isAnswered: result.isAnswered,
        sources: result.publicSources,
      })
    );
  } catch (error) {
    console.error(
      `Public widget chat failed (chatbotPublicId=${parsed.data.chatbotId}, message=${error instanceof Error ? error.message : "unknown"})`
    );

    return withCors(
      NextResponse.json(
        {
          ok: false,
          code: "DATABASE_ERROR",
          message:
            "The assistant could not answer right now. Please try again in a moment.",
        },
        { status: 500 }
      )
    );
  }
}
