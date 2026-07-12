import "server-only";
import { getAIClient } from "@/lib/ai/client";
import { getServerEnv } from "@/lib/env/server";
import { RAG_FALLBACK } from "@/features/rag/constants";
import { buildGroundedPromptParts } from "@/features/rag/formatting";
import type { RetrievedSource } from "@/features/rag/retrieval";

export type GeneratedAnswer = {
  answer: string;
  isAnswered: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
};

export function buildGroundedPrompt(
  chatbotPrompt: string,
  sources: RetrievedSource[],
  question: string
) {
  return buildGroundedPromptParts({ chatbotPrompt, sources, question });
}

export async function generateGroundedAnswer(params: {
  chatbotPrompt: string;
  sources: RetrievedSource[];
  question: string;
}): Promise<GeneratedAnswer> {
  const env = getServerEnv();
  const ai = getAIClient();
  const prompt = buildGroundedPrompt(
    params.chatbotPrompt,
    params.sources,
    params.question
  );
  const completion = await ai.chat.completions.create({
    model: env.OPENROUTER_CHAT_MODEL,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: 0.2,
  });

  const answer =
    completion.choices[0]?.message.content?.trim() || RAG_FALLBACK;

  return {
    answer,
    isAnswered: answer !== RAG_FALLBACK,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
