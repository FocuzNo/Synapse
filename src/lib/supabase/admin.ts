import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getClientEnv } from "@/lib/env/client";
import { getServerEnv } from "@/lib/env/server";

let adminClient: SupabaseClient | undefined;

export function createSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const clientEnv = getClientEnv();
  const serverEnv = getServerEnv();

  adminClient = createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminClient;
}
