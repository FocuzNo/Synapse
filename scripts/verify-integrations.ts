import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

type RequiredEnvKey =
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "PUBLIC_RATE_LIMIT_SALT"
  | "OPENROUTER_API_KEY"
  | "OPENROUTER_CHAT_MODEL"
  | "OPENROUTER_EMBEDDING_MODEL"
  | "OPENROUTER_EMBEDDING_DIMENSIONS";

const REQUIRED_ENV_KEYS: RequiredEnvKey[] = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PUBLIC_RATE_LIMIT_SALT",
  "OPENROUTER_API_KEY",
  "OPENROUTER_CHAT_MODEL",
  "OPENROUTER_EMBEDDING_MODEL",
  "OPENROUTER_EMBEDDING_DIMENSIONS",
];

const EXPECTED_TABLES = [
  "profiles",
  "workspaces",
  "workspace_members",
  "subscriptions",
  "chatbots",
  "documents",
  "document_chunks",
  "conversations",
  "messages",
  "message_sources",
  "public_chat_rate_limits",
  "usage_records",
] as const;

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocket as typeof globalThis.WebSocket;
}

function loadDotEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return false;
  }

  const file = readFileSync(envPath, "utf8");

  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  return true;
}

function getSafeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "unknown error";
  }

  const message = error.message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-api-key]");

  if (/incorrect api key/i.test(message)) {
    return "OpenRouter API key was rejected. Update OPENROUTER_API_KEY in .env.local and rerun the check.";
  }

  if (/user not found/i.test(message)) {
    return "OpenRouter rejected the current key with 'User not found'. Update OPENROUTER_API_KEY in .env.local and rerun the check.";
  }

  if (/OpenRouter auth failed/i.test(message)) {
    return "OpenRouter authentication failed. Check the current OPENROUTER_API_KEY in .env.local.";
  }

  if (/OpenRouter billing required/i.test(message)) {
    return "OpenRouter rejected the request because billing or credits are required for the current account or model.";
  }

  if (/OpenRouter model was not found/i.test(message)) {
    return "OpenRouter could not find one of the configured model names. Check OPENROUTER_CHAT_MODEL and OPENROUTER_EMBEDDING_MODEL.";
  }

  if (/OpenRouter rate limit/i.test(message)) {
    return "OpenRouter rate-limited the verification request. Wait briefly and rerun the check.";
  }

  if (/OpenRouter upstream error/i.test(message)) {
    return "OpenRouter returned a temporary upstream error. The provider path may recover on retry.";
  }

  return message;
}

function getEnvStatus() {
  return REQUIRED_ENV_KEYS.map((key) => ({
    key,
    present: Boolean(process.env[key]?.trim()),
  }));
}

function assertRequiredEnv() {
  const missing = getEnvStatus().filter((entry) => !entry.present);

  console.log("Environment status:");
  for (const entry of getEnvStatus()) {
    console.log(`- ${entry.key}: ${entry.present ? "present" : "missing"}`);
  }

  if (missing.length > 0) {
    console.error("\nMissing required environment variables. Fill .env.local before running integration verification.");
    process.exitCode = 1;
    return null;
  }

  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL!,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    publicRateLimitSalt: process.env.PUBLIC_RATE_LIMIT_SALT!,
    openRouterApiKey: process.env.OPENROUTER_API_KEY!,
    openRouterChatModel: process.env.OPENROUTER_CHAT_MODEL!,
    openRouterEmbeddingModel: process.env.OPENROUTER_EMBEDDING_MODEL!,
    openRouterEmbeddingDimensions: Number(process.env.OPENROUTER_EMBEDDING_DIMENSIONS!),
  };
}

async function verifyAnonReachability(supabaseUrl: string, anonKey: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
      "Content-Profile": "public",
    },
  });

  if (response.status === 404 || response.status >= 500) {
    throw new Error(`Anon key check failed with status ${response.status}.`);
  }

  console.log(`- REST endpoint reachable with anon key (status ${response.status})`);
}

async function verifyTables(serviceClient: SupabaseClient) {
  for (const table of EXPECTED_TABLES) {
    const { error } = await serviceClient
      .from(table)
      .select("*")
      .limit(1);

    if (error) {
      throw new Error(`Table check failed for ${table}: ${error.message}`);
    }

    console.log(`- Table ready: ${table}`);
  }
}

async function verifyStorage(serviceClient: SupabaseClient) {
  const { data, error } = await serviceClient.storage.listBuckets();

  if (error) {
    throw new Error(`Storage bucket check failed: ${error.message}`);
  }

  const knowledgeBucket = data.find((bucket) => bucket.id === "knowledge-files");

  if (!knowledgeBucket) {
    throw new Error("Storage bucket knowledge-files was not found.");
  }

  console.log(`- Storage bucket ready: ${knowledgeBucket.id} (public=${String(knowledgeBucket.public)})`);
}

async function verifyVectorRpc(serviceClient: SupabaseClient, embeddingDimensions: number) {
  const { error } = await (serviceClient as SupabaseClient & {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  }).rpc("match_document_chunks", {
    query_embedding: Array.from({ length: embeddingDimensions }, () => 0),
    target_workspace_id: "00000000-0000-0000-0000-000000000000",
    target_chatbot_id: "00000000-0000-0000-0000-000000000000",
    match_threshold: 0,
    match_count: 1,
  });

  if (error) {
    throw new Error(`Vector RPC check failed: ${error.message}`);
  }

  console.log("- Vector RPC callable: match_document_chunks");
}

async function verifyWidgetRpcs(serviceClient: SupabaseClient) {
  const rateLimitResult = await (serviceClient as SupabaseClient & {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("check_public_chat_rate_limit", {
    rate_key: "verify:public-widget:session",
    window_seconds: 60,
    request_limit: 10,
  });

  if (rateLimitResult.error) {
    throw new Error(`Widget rate-limit RPC check failed: ${rateLimitResult.error.message}`);
  }

  const workspaceResult = await serviceClient
    .from("workspaces")
    .select("id")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (workspaceResult.error) {
    throw new Error(`Widget usage RPC workspace lookup failed: ${workspaceResult.error.message}`);
  }

  if (!workspaceResult.data?.id) {
    throw new Error("Widget usage RPC check requires at least one workspace row.");
  }

  const usageResult = await (serviceClient as SupabaseClient & {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("consume_workspace_ai_usage", {
    target_workspace_id: workspaceResult.data.id,
    message_limit: 100,
    message_increment: 0,
    input_tokens_increment: 0,
    output_tokens_increment: 0,
  });

  if (usageResult.error) {
    throw new Error(`Widget usage RPC check failed: ${usageResult.error.message}`);
  }

  console.log("- Widget RPC callable: check_public_chat_rate_limit");
  console.log("- Widget RPC callable: consume_workspace_ai_usage");
}

async function parseOpenRouterResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { data?: Array<{ embedding?: number[] }>; error?: { message?: string } }
    | { choices?: Array<{ message?: { content?: string | null } }>; error?: { message?: string } }
    | null;

  if (response.ok) {
    return payload;
  }

  const status = response.status;
  const providerMessage = payload?.error?.message?.trim() || "unknown provider error";

  if (status === 401) {
    throw new Error(`OpenRouter auth failed (${status}).`);
  }

  if (status === 402) {
    throw new Error(`OpenRouter billing required (${status}).`);
  }

  if (status === 404) {
    throw new Error(`OpenRouter model was not found (${status}).`);
  }

  if (status === 429) {
    throw new Error(`OpenRouter rate limit (${status}).`);
  }

  if (status >= 500) {
    throw new Error(`OpenRouter upstream error (${status}).`);
  }

  throw new Error(providerMessage || `OpenRouter request failed with status ${status}`);
}

async function verifyOpenRouter(
  apiKey: string,
  chatModel: string,
  embeddingModel: string,
  embeddingDimensions: number,
  appUrl: string
) {
  const embeddingResponse = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appUrl,
      "X-Title": "AskFlow",
    },
    body: JSON.stringify({
      model: embeddingModel,
      input: "integration health check",
    }),
  });

  const embeddingPayload = (await parseOpenRouterResponse(embeddingResponse)) as
    | { data?: Array<{ embedding?: number[] }> }
    | null;

  const vectorLength = embeddingPayload?.data?.[0]?.embedding?.length ?? 0;

  if (vectorLength !== embeddingDimensions) {
    throw new Error(`Embedding dimension mismatch: expected ${embeddingDimensions}, got ${vectorLength}`);
  }

  console.log(`- OpenRouter embedding check passed (${embeddingModel}, dimension ${vectorLength})`);

  const chatResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appUrl,
      "X-Title": "AskFlow",
    },
    body: JSON.stringify({
      model: chatModel,
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
      temperature: 0,
      max_tokens: 8,
    }),
  });

  const chatPayload = (await parseOpenRouterResponse(chatResponse)) as
    | { choices?: Array<{ message?: { content?: string | null } }> }
    | null;
  const chatAnswer = chatPayload?.choices?.[0]?.message?.content?.trim() ?? "";

  if (!chatAnswer) {
    throw new Error("OpenRouter chat check returned an empty completion.");
  }

  console.log(`- OpenRouter chat check passed (${chatModel})`);
}

async function main() {
  const loadedEnvFile = loadDotEnvLocal();
  console.log(`.env.local: ${loadedEnvFile ? "loaded" : "not found"}`);

  const env = assertRequiredEnv();
  if (!env) {
    return;
  }

  const anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const serviceClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("\nSupabase checks:");
  await verifyAnonReachability(env.supabaseUrl, env.supabaseAnonKey);
  await verifyTables(serviceClient);
  await verifyStorage(serviceClient);
  await verifyVectorRpc(serviceClient, env.openRouterEmbeddingDimensions);
  await verifyWidgetRpcs(serviceClient);

  if (process.argv.includes("--check-openrouter")) {
    console.log("\nOpenRouter checks:");
    await verifyOpenRouter(
      env.openRouterApiKey,
      env.openRouterChatModel,
      env.openRouterEmbeddingModel,
      env.openRouterEmbeddingDimensions,
      env.appUrl
    );
  } else {
    console.log("\nOpenRouter checks skipped. Re-run with --check-openrouter to verify the embedding model.");
  }

  console.log("\nIntegration verification completed.");
  void anonClient;
}

main().catch((error) => {
  console.error(`Verification failed: ${getSafeErrorMessage(error)}`);
  process.exitCode = 1;
});
