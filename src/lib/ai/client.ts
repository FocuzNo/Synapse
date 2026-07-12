import "server-only";
import { getServerEnv } from "@/lib/env/server";
import { AI_PROVIDER_TIMEOUT_MS } from "@/features/rag/constants";

type EmbeddingInput = string | string[];

type EmbeddingsCreateParams = {
  model: string;
  input: EmbeddingInput;
};

type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionsCreateParams = {
  model: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
};

type EmbeddingsResponse = {
  data: Array<{ embedding: number[] }>;
};

type ChatCompletionsResponse = {
  choices: Array<{ message: { content: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

class OpenRouterClient {
  private readonly baseUrl = "https://openrouter.ai/api/v1";
  private readonly env = getServerEnv();

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_PROVIDER_TIMEOUT_MS);

      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": this.env.NEXT_PUBLIC_APP_URL,
            "X-Title": "AskFlow",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              error?: {
                message?: string;
                metadata?: { retry_after_seconds?: number };
              };
            }
          | null;

        if (response.ok) {
          return payload as T;
        }

        const retryAfterSeconds = payload?.error?.metadata?.retry_after_seconds ?? 0;
        const shouldRetry = attempt < 5 && (response.status === 429 || response.status >= 500);

        if (shouldRetry) {
          const delayMs = Math.max(1000, retryAfterSeconds * 1000 || (attempt + 1) * 1500);
          await this.sleep(delayMs);
          continue;
        }

        throw new Error(payload?.error?.message || `OpenRouter request failed with status ${response.status}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error("OpenRouter request failed after retries.");
  }

  embeddings = {
    create: (params: EmbeddingsCreateParams) => this.request<EmbeddingsResponse>("/embeddings", params),
  };

  chat = {
    completions: {
      create: (params: ChatCompletionsCreateParams) =>
        this.request<ChatCompletionsResponse>("/chat/completions", params),
    },
  };
}

let aiClient: OpenRouterClient | undefined;

export function getAIClient() {
  if (aiClient) {
    return aiClient;
  }

  aiClient = new OpenRouterClient();
  return aiClient;
}
