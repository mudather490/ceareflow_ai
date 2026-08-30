/**
 * Environment validation.
 * Ensures server-only secrets are never exposed with NEXT_PUBLIC_ prefix.
 */

function assertServerOnly(name: string, value: string | undefined) {
  if (value && name.startsWith("NEXT_PUBLIC_")) {
    throw new Error(
      `${name} must not be NEXT_PUBLIC_ — server-only secret leaked to client`
    );
  }
}

export function validateEnv() {
  // Client-side public vars must be present for the app to boot
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // These are optional at build time (allow dummy values for CI) but validated at runtime
  if (typeof window === "undefined") {
    // Server-only secrets — assert they are NOT exposed as NEXT_PUBLIC_
    assertServerOnly("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
    assertServerOnly(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error(
        "NEXT_PUBLIC_GEMINI_API_KEY is forbidden — use GEMINI_API_KEY (server-only)"
      );
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is forbidden — use SUPABASE_SERVICE_ROLE_KEY (server-only)"
      );
    }
  }

  return {
    supabaseUrl: publicUrl,
    supabaseAnonKey: publicAnon,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

export const env = {
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  },
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  },
  get supabaseServiceRoleKey() {
    if (typeof window !== "undefined") {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is server-only");
    }
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  },
  get geminiApiKey() {
    if (typeof window !== "undefined") {
      throw new Error("GEMINI_API_KEY is server-only");
    }
    return process.env.GEMINI_API_KEY ?? "";
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
};
