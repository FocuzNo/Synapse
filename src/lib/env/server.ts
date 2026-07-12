import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_CHAT_MODEL: z.string().min(1),
  OPENROUTER_EMBEDDING_MODEL: z.string().min(1),
  OPENROUTER_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_CHAT_MODEL: process.env.OPENROUTER_CHAT_MODEL,
    OPENROUTER_EMBEDDING_MODEL: process.env.OPENROUTER_EMBEDDING_MODEL,
    OPENROUTER_EMBEDDING_DIMENSIONS: process.env.OPENROUTER_EMBEDDING_DIMENSIONS,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment variables: ${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}

const publicRateLimitEnvSchema = z.object({
  PUBLIC_RATE_LIMIT_SALT: z.string().min(16),
});

export function getPublicRateLimitSalt() {
  const parsed = publicRateLimitEnvSchema.safeParse({
    PUBLIC_RATE_LIMIT_SALT: process.env.PUBLIC_RATE_LIMIT_SALT,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid public widget environment variables: ${z.prettifyError(parsed.error)}`
    );
  }

  return parsed.data.PUBLIC_RATE_LIMIT_SALT;
}
