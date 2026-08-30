import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center gap-4">
      <h2 className="text-display font-bold text-primary">404</h2>
      <p className="text-headline-sm font-semibold text-on-surface">This page isn&apos;t available</p>
      <p className="text-body-md text-on-surface-variant max-w-md">The link may be broken or the page may have been removed.</p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
