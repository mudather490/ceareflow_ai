import { z } from "zod";
import { CareerProfileDTO, ResumeVersionDTO, JobDTO } from "@/lib/types";

export const matchBreakdownItemSchema = z.object({
  label: z.string(),
  status: z.enum(["strong", "partial", "missing"]),
  detail: z.string().optional(),
});

export const resumeJobMatchResultSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.array(matchBreakdownItemSchema),
  strongMatches: z.array(z.string()),
  partialMatches: z.array(z.string()),
  missingWeak: z.array(z.string()),
  talkingPoints: z.array(z.string()).min(2).max(4),
  aiInsight: z.string(),
});

export type ResumeJobMatchResult = z.infer<typeof resumeJobMatchResultSchema>;

export interface ResumeJobMatcher {
  match(input: {
    careerProfile: CareerProfileDTO;
    resumeVersion?: ResumeVersionDTO | null;
    job: JobDTO;
  }): Promise<ResumeJobMatchResult>;
}
