import { z } from "zod";

export const resumeAiAnalyzeSchema = z.object({
  resumeVersionId: z.string().uuid("Select a resume version"),
  jobId: z.string().uuid().optional(),
});

export type ResumeAiAnalyzeInput = z.infer<typeof resumeAiAnalyzeSchema>;
