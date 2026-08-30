import { z } from "zod";

export const interviewSetupSchema = z.object({
  jobId: z.string().uuid("Select a job"),
  type: z.enum(["behavioral", "technical", "mixed"]).default("mixed"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  questionCount: z.number().int().min(3).max(15).default(10),
});

export type InterviewSetupInput = z.infer<typeof interviewSetupSchema>;
