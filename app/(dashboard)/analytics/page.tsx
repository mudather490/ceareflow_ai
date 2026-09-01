import { createClient } from "@/lib/supabase/server";
import { AnalyticsService } from "@/lib/services/analyticsService";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Analytics — CareerFlow AI" };

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [overview, trends7, profiles] = await Promise.all([
    AnalyticsService.getOverview(user.id),
    AnalyticsService.getTrends(user.id, 7),
    supabase.from("public_profiles").select("id,is_published").eq("user_id", user.id).limit(1),
  ]);

  const hasPublished = profiles.data && profiles.data.some((p: { is_published: boolean }) => p.is_published);
  const hasAnyActivity = overview.profileViews > 0 || overview.applications > 0 || overview.interviewsStarted > 0;

  if (!hasPublished && !hasAnyActivity) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-lg font-semibold">Analytics</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Owner-only aggregates from your public profile beacon and career activity.</p>
        </header>
        <EmptyState
          icon="analytics"
          title="No published profile yet"
          description="Publish a public profile in Video Resume to start collecting view analytics (deduped 1h, no raw IP). Applications and interviews are tracked automatically."
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
            <p className="text-body-sm text-on-surface-variant mt-1">Chart ships with Phase 5</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="pb-4 border-b border-outline-variant">
        <h1 className="text-headline-lg font-semibold">Analytics</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Owner-only aggregates — privacy-safe, no visitor identity or raw IP, no private job content exposed publicly.</p>
      </header>

      <AnalyticsClient initialOverview={overview} initialTrends7={trends7} />
    </div>
  );
}
