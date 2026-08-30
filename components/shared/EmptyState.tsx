import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest p-8 flex flex-col items-center text-center gap-4",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
        <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
      </div>
      <div>
        <h3 className="text-headline-sm font-headline-sm text-on-surface">{title}</h3>
        {description && (
          <p className="text-body-sm text-on-surface-variant mt-1 max-w-sm">{description}</p>
        )}
      </div>
      {actionLabel && (actionHref || onAction) && (
        <>
          {actionHref ? (
            <Button asChild variant="primary">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
