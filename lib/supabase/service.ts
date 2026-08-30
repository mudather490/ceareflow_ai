import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — server-only.
 * Used ONLY in:
 *  - app/api/public/* (beacon)
 *  - lib/storage/signedUrl.ts
 */
export function createServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("service client is server-only");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase service-role env vars");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
