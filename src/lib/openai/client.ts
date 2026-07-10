import "server-only";
import OpenAI from "openai";
import { getServerEnv } from "@/lib/env/server";

let openaiClient: OpenAI | undefined;

export function getOpenAIClient() {
  if (openaiClient) {
    return openaiClient;
  }

  const env = getServerEnv();
  openaiClient = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  return openaiClient;
}
