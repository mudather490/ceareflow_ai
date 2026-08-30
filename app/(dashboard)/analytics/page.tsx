import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata = { title: "Analytics — CareerFlow AI" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-lg font-semibold">Analytics</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Owner-only aggregates from your public profile beacon. Ships in Phase 4.</p>
      </header>
      <EmptyState
        icon="analytics"
        title="No published profile yet"
        description="Publish a public profile in Video Resume to start collecting view analytics (deduped 1h, no raw IP)."
        actionLabel="Go to Video Resume"
        actionHref="/video-resume"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Views (today)</p>
          <p className="text-headline-lg font-bold text-primary mt-1">—</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Top referrer</p>
          <p className="text-headline-md font-semibold text-primary mt-1">—</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Devices</p>
          <p className="text-body-sm text-on-surface-variant mt-1">Chart ships in Phase 4</p>
        </Card>
      </div>
    </div>
  );
}
