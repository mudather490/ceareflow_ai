"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnalyticsOverview, TrendPoint } from "@/lib/services/analyticsService";

type Props = {
  initialOverview: AnalyticsOverview;
  initialTrends7: TrendPoint[];
};

function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card className="p-6 text-center">
      <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</p>
      <p className="text-headline-lg font-bold text-primary mt-1">{value}</p>
      {sub && <p className="text-body-sm text-on-surface-variant">{sub}</p>}
    </Card>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return <p className="text-body-sm text-on-surface-variant">No trend data yet.</p>;
  const max = Math.max(1, ...data.map((d) => Math.max(d.profileViews, d.resumeDownloads, d.videoPlays)));
  return (
    <div className="space-y-3">
      {/* Simple bar chart */}
      <div className="flex items-end gap-1 h-32 px-2">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col gap-0.5 justify-end h-24">
              <div className="w-full bg-secondary rounded-sm" style={{ height: `${(d.profileViews / max) * 60}px` }} title={`Views ${d.profileViews}`} />
              <div className="w-full bg-primary rounded-sm" style={{ height: `${(d.videoPlays / max) * 40}px` }} title={`Plays ${d.videoPlays}`} />
              <div className="w-full bg-tertiary rounded-sm" style={{ height: `${(d.resumeDownloads / max) * 30}px` }} title={`Downloads ${d.resumeDownloads}`} />
            </div>
            <span className="text-[10px] text-on-surface-variant">{d.date.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-label-sm justify-center">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-secondary rounded-sm" /> Views</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-primary rounded-sm" /> Plays</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-tertiary rounded-sm" /> Downloads</span>
      </div>
    </div>
  );
}

export function AnalyticsClient({ initialOverview, initialTrends7 }: Props) {
  const [overview] = useState(initialOverview);
  const [trends, setTrends] = useState<TrendPoint[]>(initialTrends7);
  const [days, setDays] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(false);

  async function loadTrends(d: 7 | 30) {
    setDays(d);
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/trends?days=${d}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setTrends(json.data as TrendPoint[]);
    } finally {
      setLoading(false);
    }
  }

  const totalViews = overview.profileViews;
  const totalPlays = overview.videoPlays;
  const totalDownloads = overview.resumeDownloads;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div>
        <h3 className="text-headline-sm font-semibold mb-3">Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Profile Views" value={overview.profileViews} />
          <KpiCard label="Resume Downloads" value={overview.resumeDownloads} />
          <KpiCard label="Video Plays" value={overview.videoPlays} />
          <KpiCard label="Applications" value={overview.applications} sub="jobs" />
          <KpiCard label="Interviews" value={`${overview.interviewsStarted}/${overview.interviewsCompleted}`} sub="started/completed" />
          <KpiCard label="Resume Analyses" value={overview.resumeAnalyses} />
        </div>
      </div>

      {/* Engagement */}
      <Card className="p-6 space-y-4">
        <h4 className="text-label-md font-semibold">Engagement</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface-container p-4 text-center">
            <p className="text-label-sm text-on-surface-variant">Video Play Rate</p>
            <p className="text-headline-md font-bold text-secondary">{overview.videoPlayRate}%</p>
            <p className="text-body-sm text-on-surface-variant">{totalPlays} plays / {totalViews} views</p>
          </div>
          <div className="rounded-xl bg-surface-container p-4 text-center">
            <p className="text-label-sm text-on-surface-variant">Resume Download Rate</p>
            <p className="text-headline-md font-bold text-secondary">{overview.resumeDownloadRate}%</p>
            <p className="text-body-sm text-on-surface-variant">{totalDownloads} downloads / {totalViews} views</p>
          </div>
          <div className="rounded-xl bg-surface-container p-4 text-center">
            <p className="text-label-sm text-on-surface-variant">Profile → Engagement</p>
            <p className="text-body-sm mt-2">Views are owner-only aggregates. No visitor identity, IP, or PII exposed.</p>
            <Badge variant="outline" className="mt-2">Privacy-safe</Badge>
          </div>
        </div>
      </Card>

      {/* Trends */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-label-md font-semibold">Trends</h4>
          <div className="flex gap-2">
            <Button variant={days === 7 ? "secondary" : "outline"} size="sm" onClick={() => loadTrends(7)} disabled={loading}>
              Last 7 days
            </Button>
            <Button variant={days === 30 ? "secondary" : "outline"} size="sm" onClick={() => loadTrends(30)} disabled={loading}>
              Last 30 days
            </Button>
          </div>
        </div>
        {loading ? <p className="text-body-sm text-on-surface-variant">Loading trends...</p> : <TrendChart data={trends} />}
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="text-left text-on-surface-variant border-b">
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Views</th>
                <th className="py-2 px-2">Plays</th>
                <th className="py-2 px-2">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((t) => (
                <tr key={t.date} className="border-b last:border-0">
                  <td className="py-2 px-2 font-medium">{t.date}</td>
                  <td className="py-2 px-2">{t.profileViews}</td>
                  <td className="py-2 px-2">{t.videoPlays}</td>
                  <td className="py-2 px-2">{t.resumeDownloads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-body-sm text-on-surface-variant text-center">Public profile analytics are aggregated and privacy-safe. Raw IPs are hashed, visitor identity never exposed, internal IDs not leaked.</p>
    </div>
  );
}
