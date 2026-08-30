import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata = { title: "My Applications — CareerFlow AI" };

export default function ApplicationsPage() {
  const hasJobs = false;

  if (!hasJobs) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-lg font-semibold">My Applications</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Cross-module job tracker over shared <code className="px-1.5 py-0.5 bg-surface-container rounded text-label-sm">jobs</code> table.</p>
        </header>
        <EmptyState
          icon="work_history"
          title="No applications yet"
          description="Jobs you create in Video Resume, Interview, or Resume AI will appear here with filters and row actions."
          actionLabel="Create Video Resume"
          actionHref="/video-resume"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-lg font-semibold">My Applications</h1>
      </header>
      <Card className="p-6">Table ships in Phase 6c — derived from Recent Applications dashboard slice.</Card>
    </div>
  );
}
