"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <span className="material-symbols-outlined text-error text-[48px]">error</span>
      <h2 className="text-headline-sm font-semibold">Something went wrong</h2>
      <p className="text-body-sm text-on-surface-variant max-w-md">{error.message}</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
