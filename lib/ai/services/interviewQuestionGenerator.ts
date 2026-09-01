import { z } from "zod";
import { CareerProfileDTO, JobDTO } from "@/lib/types";

export const interviewQuestionCategorySchema = z.enum([
  "behavioral",
  "technical",
  "role_specific",
  "company",
  "resume_based",
  "situational",
]);

export const interviewDifficultySchema = z.enum(["easy", "medium", "hard"]);

export const interviewGeneratedQuestionSchema = z.object({
  question: z.string().min(10).max(500),
  category: interviewQuestionCategorySchema,
  difficulty: interviewDifficultySchema,
  idealFocus: z.string().min(10).max(500),
  order: z.number().int().min(0).max(30),
});

export const interviewQuestionsResultSchema = z.object({
  questions: z.array(interviewGeneratedQuestionSchema).min(3).max(15),
});

export type InterviewGeneratedQuestion = z.infer<typeof interviewGeneratedQuestionSchema>;
export type InterviewQuestionsResult = z.infer<typeof interviewQuestionsResultSchema>;

export interface InterviewQuestionGenerator {
  generate(input: {
    careerProfile: CareerProfileDTO;
    job: JobDTO;
    type: "behavioral" | "technical" | "mixed";
    difficulty: "easy" | "medium" | "hard";
    questionCount: number;
  }): Promise<InterviewQuestionsResult>;
}
