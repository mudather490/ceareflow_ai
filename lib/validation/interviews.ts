import { z } from "zod";

export const interviewSetupSchema = z.object({
  jobId: z.string().uuid("Select a job"),
  type: z.enum(["behavioral", "technical", "mixed"]).default("mixed"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  questionCount: z.number().int().min(3).max(15).default(10),
});

export type InterviewSetupInput = z.infer<typeof interviewSetupSchema>;

export const interviewQuestionGenerateSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
});

export type InterviewQuestionGenerateInput = z.infer<typeof interviewQuestionGenerateSchema>;

export const interviewAnswerSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  questionId: z.string().uuid("Invalid question ID"),
  answer: z.string().min(1, "Answer is required").max(5000, "Answer is too long (max 5000)").trim(),
});

export type InterviewAnswerInput = z.infer<typeof interviewAnswerSchema>;

export const interviewSessionPatchSchema = z.object({
  status: z.enum(["draft", "in_progress", "completed", "abandoned", "active", "creating", "feedback_ready"]),
});

export type InterviewSessionPatchInput = z.infer<typeof interviewSessionPatchSchema>;

export const interviewAnswerFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()).min(1).max(5),
  weaknesses: z.array(z.string()).min(1).max(5),
  improvement: z.string().min(1).max(1000),
  betterAnswer: z.string().min(1).max(1500),
  feedback: z.string().min(1).max(1500),
});
