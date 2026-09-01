import { z } from "zod";

export const analyticsEventTypeSchema = z.enum([
  "profile_view",
  "resume_download",
  "video_play",
  "job_application",
  "interview_started",
  "interview_completed",
  "resume_analysis",
  "video_resume_match",
  "script_generated",
]);

export const analyticsRecordSchema = z.object({
  eventType: analyticsEventTypeSchema,
  publicProfileId: z.string().uuid().nullable().optional(),
  jobId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AnalyticsRecordInput = z.infer<typeof analyticsRecordSchema>;

export const analyticsTrendsQuerySchema = z.object({
  days: z.enum(["7", "30"]).default("7"),
});
