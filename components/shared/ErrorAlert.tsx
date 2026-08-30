import { cn } from "@/lib/utils";

export function ErrorAlert({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-error-container bg-error-container/30 p-4 flex gap-3 items-start",
        className
      )}
      role="alert"
    >
      <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
      <div className="flex-1">
        <p className="text-label-md font-semibold text-on-error-container">{title}</p>
        <p className="text-body-sm text-on-error-container/80 mt-1">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-label-sm font-semibold text-error hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
