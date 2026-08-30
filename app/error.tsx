"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
        <span className="material-symbols-outlined text-on-error-container">error</span>
      </div>
      <h2 className="text-headline-md font-semibold text-on-surface">Something went wrong</h2>
      <p className="text-body-md text-on-surface-variant max-w-md">{error.message || "An unexpected error occurred. Please try again."}</p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
