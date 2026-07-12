import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPublicChatbotConfig } from "@/features/widget/server";

const paramsSchema = z.object({
  publicId: z.uuid(),
});

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  void request;
  const params = await context.params;
  const parsed = paramsSchema.safeParse(params);

  if (!parsed.success) {
    return withCors(
      NextResponse.json({
        available: false,
        chatbot: null,
      })
    );
  }

  const config = await getPublicChatbotConfig(parsed.data.publicId);

  return withCors(
    NextResponse.json({
      available: Boolean(config),
      chatbot: config,
    })
  );
}
