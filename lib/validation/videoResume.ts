import { z } from "zod";

export const videoResumeJobSchema = z.object({
  resumeVersionId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  title: z.string().min(1).max(120).optional(),
  company: z.string().min(1).max(120).optional(),
  description: z.string().min(20).max(10000).optional(),
});

export type VideoResumeJobInput = z.infer<typeof videoResumeJobSchema>;
