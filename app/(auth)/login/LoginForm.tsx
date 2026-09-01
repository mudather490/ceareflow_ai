"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/shared/ErrorAlert";

function sanitizeNext(input: string | null): string {
  if (!input) return "/dashboard";
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("://")) return "/dashboard";
  if (input.includes("\n") || input.includes("\r")) return "/dashboard";
  return input;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get("next"));
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setServerError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {serverError && <ErrorAlert message={serverError} />}

      <Button
        type="button"
        variant="secondary"
        className="w-full flex items-center justify-center gap-3 py-6 text-label-md font-semibold"
        onClick={handleGoogle}
        disabled={loading}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {loading ? "Redirecting to Google…" : "Continue with Google"}
      </Button>

      <p className="text-body-sm text-on-surface-variant text-center">
        Secure authentication via Google. No password required.
      </p>

      <p className="text-label-sm text-on-surface-variant text-center px-4">
        By continuing, you agree to our Terms and acknowledge our Privacy Policy.
      </p>
    </div>
  );
}
