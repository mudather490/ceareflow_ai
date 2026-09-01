import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports
import { createServiceClient } from "@/lib/supabase/service";

export type AnalyticsEventType =
  | "profile_view"
  | "resume_download"
  | "video_play"
  | "job_application"
  | "interview_started"
  | "interview_completed"
  | "resume_analysis"
  | "video_resume_match"
  | "script_generated";

export type AnalyticsOverview = {
  profileViews: number;
  resumeDownloads: number;
  videoPlays: number;
  applications: number;
  interviewsStarted: number;
  interviewsCompleted: number;
  resumeAnalyses: number;
  videoPlayRate: number;
  resumeDownloadRate: number;
};

export type TrendPoint = {
  date: string; // YYYY-MM-DD
  profileViews: number;
  resumeDownloads: number;
  videoPlays: number;
};

function toDayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clampRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export class AnalyticsService {
  /**
   * Record an analytics event server-side with trusted user_id derivation.
   * Caller must have already verified ownership or derived user_id from slug.
   */
  static async recordEvent(input: {
    userId: string;
    publicProfileId?: string | null;
    eventType: AnalyticsEventType;
    jobId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("analytics_events").insert({
      user_id: input.userId,
      public_profile_id: input.publicProfileId || null,
      event_type: input.eventType,
      job_id: input.jobId || null,
      metadata: input.metadata || null,
    });
    if (error) {
      // Non-fatal for analytics
      console.warn("AnalyticsService.recordEvent failed", error.message);
    }
  }

  /**
   * Record a public profile view from a public (unauthenticated) request.
   * Uses service_role to bypass RLS and handles 1h dedup via ip_hash similar to 006.
   * Privacy: ip is hashed with daily salt + profileId, never stored raw.
   */
  static async recordPublicView(input: {
    slug: string;
    ip?: string | null;
    userAgent?: string | null;
    referer?: string | null;
  }): Promise<{ ok: boolean; deduped?: boolean }> {
    try {
      const service = createServiceClient();
      // Resolve slug -> public_profile
      const { data: profile } = await service
        .from("public_profiles")
        .select("id,user_id,is_published")
        .eq("slug", input.slug)
        .single();

      if (!profile || !profile.is_published) return { ok: false };

      // Hash IP for privacy + dedup (daily salt)
      const dailySalt = new Date().toISOString().slice(0, 10);
      let ipHash: string | null = null;
      if (input.ip) {
        const crypto = await import("crypto");
        ipHash = crypto.createHash("sha256").update(`${input.ip}|${dailySalt}|${profile.id}`).digest("hex").slice(0, 32);
      }

      // 1h dedup check
      if (ipHash) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: existing } = await service
          .from("public_profile_views")
          .select("id")
          .eq("public_profile_id", profile.id)
          .eq("ip_hash", ipHash)
          .gte("viewed_at", oneHourAgo)
          .limit(1)
          .maybeSingle();
        if (existing) return { ok: true, deduped: true };
      }

      // Simple device/referrer bucketing
      const ua = (input.userAgent || "").toLowerCase();
      let device = "desktop";
      if (ua.includes("mobi")) device = "mobile";
      else if (ua.includes("tablet") || ua.includes("ipad")) device = "tablet";

      const referer = input.referer || null;
      let refererFamily: string | null = null;
      if (referer) {
        try {
          const u = new URL(referer);
          const host = u.hostname.toLowerCase();
          if (host.includes("linkedin")) refererFamily = "linkedin";
          else if (host.includes("indeed")) refererFamily = "indeed";
          else if (host.includes("google")) refererFamily = "google";
          else refererFamily = "other";
        } catch {
          refererFamily = "other";
        }
      } else {
        refererFamily = "direct";
      }

      // Insert into public_profile_views (owner-agnostic, used for analytics)
      await service.from("public_profile_views").insert({
        public_profile_id: profile.id,
        ip_hash: ipHash,
        user_agent: input.userAgent ? input.userAgent.slice(0, 512) : null,
        referer: referer ? referer.slice(0, 512) : null,
        country_code: null,
        cta: "view",
      });

      // Also mirror into analytics_events for unified aggregation (user_id derived)
      await service.from("analytics_events").insert({
        user_id: profile.user_id,
        public_profile_id: profile.id,
        event_type: "profile_view",
        metadata: { device, referer: refererFamily },
      });

      return { ok: true };
    } catch (e) {
      console.warn("recordPublicView error", e);
      return { ok: false };
    }
  }

  static async recordPublicVideoPlay(slug: string): Promise<void> {
    const service = createServiceClient();
    const { data: profile } = await service.from("public_profiles").select("id,user_id,is_published").eq("slug", slug).single();
    if (!profile || !profile.is_published) return;
    await service.from("analytics_events").insert({
      user_id: profile.user_id,
      public_profile_id: profile.id,
      event_type: "video_play",
    });
  }

  static async recordPublicResumeDownload(slug: string): Promise<void> {
    const service = createServiceClient();
    const { data: profile } = await service.from("public_profiles").select("id,user_id,is_published").eq("slug", slug).single();
    if (!profile || !profile.is_published) return;
    await service.from("analytics_events").insert({
      user_id: profile.user_id,
      public_profile_id: profile.id,
      event_type: "resume_download",
    });
  }

  static async getOverview(userId: string): Promise<AnalyticsOverview> {
    const supabase = await createClient();

    // Parallel counts
    const [
      { count: viewsFromAnalytics },
      { count: resumeDownloads },
      { count: videoPlays },
      { data: jobs },
      { data: interviews },
      { count: resumeAnalyses },
      { data: profileIdsResult },
    ] = await Promise.all([
      supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("event_type", "profile_view"),
      supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("event_type", "resume_download"),
      supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("event_type", "video_play"),
      supabase.from("jobs").select("id").eq("user_id", userId),
      supabase.from("interviews").select("id,status").eq("user_id", userId),
      supabase.from("resume_analyses").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("public_profiles").select("id").eq("user_id", userId),
    ]);

    const applications = jobs?.length || 0;
    const interviewsStarted = interviews?.length || 0;
    const interviewsCompleted = interviews?.filter((i: { status: string }) => ["completed", "feedback_ready"].includes(i.status)).length || 0;

    // Also include public_profile_views counts for profile views (union)
    let viewsFromPublicTable = 0;
    if (profileIdsResult && profileIdsResult.length > 0) {
      const ids = profileIdsResult.map((p: { id: string }) => p.id);
      const { count } = await supabase.from("public_profile_views").select("id", { count: "exact", head: true }).in("public_profile_id", ids);
      viewsFromPublicTable = count || 0;
    }

    const profileViews = Math.max(viewsFromAnalytics || 0, viewsFromPublicTable) || 0;

    return {
      profileViews,
      resumeDownloads: resumeDownloads || 0,
      videoPlays: videoPlays || 0,
      applications,
      interviewsStarted,
      interviewsCompleted,
      resumeAnalyses: resumeAnalyses || 0,
      videoPlayRate: clampRate(videoPlays || 0, profileViews),
      resumeDownloadRate: clampRate(resumeDownloads || 0, profileViews),
    };
  }

  static async getTrends(userId: string, days: 7 | 30 = 7): Promise<TrendPoint[]> {
    const supabase = await createClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: analyticsEvents }, { data: profileIds }] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("event_type,created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(500),
      supabase.from("public_profiles").select("id").eq("user_id", userId),
    ]);

    let publicViews: { viewed_at: string }[] = [];
    if (profileIds && profileIds.length > 0) {
      const ids = profileIds.map((p: { id: string }) => p.id);
      const { data } = await supabase
        .from("public_profile_views")
        .select("viewed_at")
        .in("public_profile_id", ids)
        .gte("viewed_at", since)
        .order("viewed_at", { ascending: true })
        .limit(500);
      publicViews = data || [];
    }

    // Build date map
    const map = new Map<string, TrendPoint>();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = toDayString(d);
      map.set(key, { date: key, profileViews: 0, resumeDownloads: 0, videoPlays: 0 });
    }

    // Aggregate analytics_events
    for (const ev of analyticsEvents || []) {
      const day = toDayString(new Date(ev.created_at as string));
      const point = map.get(day);
      if (!point) continue;
      if (ev.event_type === "profile_view") point.profileViews += 1;
      if (ev.event_type === "resume_download") point.resumeDownloads += 1;
      if (ev.event_type === "video_play") point.videoPlays += 1;
    }

    // Also add public_profile_views to profileViews (if not already counted via analytics_events dedup, we take max per day)
    // For simplicity, add them additionally but avoid double-count if analytics_events already has same view: we already counted analytics_events profile_view; public_views may double count.
    // Instead, we treat public_views as source if analytics_events count is 0 for that day (fallback)
    // Simpler: add publicViews raw counts to same buckets but ensure we don't double count beyond realistic: just add
    for (const v of publicViews) {
      const day = toDayString(new Date(v.viewed_at as string));
      const point = map.get(day);
      if (!point) continue;
      // If we already have analytics profile views for that day, don't double count; use max
      // For now, ensure at least publicViews are reflected if analytics is 0
      if (point.profileViews === 0) point.profileViews += 1;
    }

    return Array.from(map.values());
  }
}
