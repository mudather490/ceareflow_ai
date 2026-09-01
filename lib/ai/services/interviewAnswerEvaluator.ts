import { z } from "zod";
import { CareerProfileDTO, JobDTO } from "@/lib/types";

export const interviewFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string().min(5).max(300)).min(1).max(5),
  weaknesses: z.array(z.string().min(5).max(300)).min(1).max(5),
  improvement: z.string().min(10).max(1000),
  betterAnswer: z.string().min(10).max(1500),
  feedback: z.string().min(10).max(1500),
});

export type InterviewFeedback = z.infer<typeof interviewFeedbackSchema>;

export interface InterviewAnswerEvaluator {
  evaluate(input: {
    question: string;
    answer: string;
    careerProfile: CareerProfileDTO;
    job: JobDTO;
    category?: string;
    difficulty?: string;
  }): Promise<InterviewFeedback>;
}
