import { z } from "zod";

export const jobSchema = z.object({
  title: z.string().min(1, "Job title is required").max(120, "Job title must be under 120 characters").trim(),
  company: z.string().min(1, "Company name is required").max(120, "Company name must be under 120 characters").trim(),
  description: z.string().min(20, "Job description should be at least 20 characters").max(20000, "Job description is too long").trim(),
  source: z.enum(["video_resume", "interview", "resume_ai", "manual"]).optional().default("video_resume"),
});

export type JobInput = z.infer<typeof jobSchema>;
