import { z } from "zod";
import { CareerProfileDTO, JobDTO, ResumeVersionDTO } from "@/lib/types";

export const resumeSectionScoreSchema = z.object({
  section: z.enum(["summary", "experience", "skills", "education", "formatting"]),
  score: z.number().min(0).max(100),
  strengths: z.array(z.string().min(5).max(300)).default([]),
  issues: z.array(z.string().min(5).max(300)).default([]),
  recommendations: z.array(z.string().min(5).max(400)).default([]),
});

export const resumeAnalyzerResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  label: z.enum(["needs_work", "developing", "proficient", "strong"]).optional(),
  summary: z.string().min(10).max(2000),
  sectionScores: z.array(resumeSectionScoreSchema).min(3).max(6),
  strengths: z.array(z.string().min(5).max(400)).min(1).max(8),
  issues: z.array(z.string().min(5).max(400)).min(1).max(8),
  recommendations: z.array(z.string().min(10).max(600)).min(2).max(10),
  keywordSuggestions: z.array(z.string().min(2).max(80)).default([]),
  jobAlignment: z
    .object({
      matchingStrengths: z.array(z.string().min(5).max(300)).default([]),
      missingWeakAreas: z.array(z.string().min(5).max(300)).default([]),
      keywordSuggestions: z.array(z.string().min(2).max(80)).default([]),
      experienceRecommendations: z.array(z.string().min(10).max(500)).default([]),
    })
    .nullable()
    .optional(),
  model: z.string().optional(),
});

export type ResumeSectionScore = z.infer<typeof resumeSectionScoreSchema>;
export type ResumeAnalyzerResult = z.infer<typeof resumeAnalyzerResultSchema>;

export interface ResumeAnalyzer {
  analyze(input: {
    careerProfile: CareerProfileDTO;
    resumeVersion?: ResumeVersionDTO | null;
    job?: JobDTO | null;
  }): Promise<ResumeAnalyzerResult>;
}
