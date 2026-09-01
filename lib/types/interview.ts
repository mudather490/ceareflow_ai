export type InterviewStatus = "draft" | "in_progress" | "completed" | "abandoned" | "creating" | "active" | "feedback_ready";

export type InterviewQuestionCategory = "behavioral" | "technical" | "role_specific" | "company" | "resume_based" | "situational";

export type InterviewDifficulty = "easy" | "medium" | "hard";

export type InterviewType = "behavioral" | "technical" | "mixed";

export type InterviewSessionDTO = {
  id: string;
  userId: string;
  jobId: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  questionCount: number;
  status: InterviewStatus;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    company: string;
    description: string;
  };
};

export type InterviewQuestionDTO = {
  id: string;
  sessionId: string;
  userId: string;
  question: string; // maps to question_text
  category: InterviewQuestionCategory;
  difficulty: InterviewDifficulty;
  order: number; // order_index
  idealFocus: string | null; // ideal_focus / hint
  status: "pending" | "active" | "answered" | "skipped";
  source: string;
  createdAt: string;
};

export type InterviewAnswerDTO = {
  id: string;
  sessionId: string; // interview_id
  questionId: string;
  userId: string;
  answer: string | null;
  feedback: string | null;
  score: number | null; // 0-100
  transcript: string | null;
  storagePath: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type InterviewFeedbackDTO = {
  id: string;
  sessionId: string;
  userId: string;
  overallScore: number;
  label: "needs_work" | "developing" | "proficient" | "strong";
  dimensions: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  aiRecommendation: string | null;
  model: string | null;
  createdAt: string;
};

export type InterviewSessionDetailDTO = InterviewSessionDTO & {
  questions: InterviewQuestionDTO[];
  answers: InterviewAnswerDTO[];
  feedback: InterviewFeedbackDTO | null;
  progress: {
    total: number;
    answered: number;
    averageScore: number | null;
    strongestCategory: string | null;
    weakestCategory: string | null;
  };
};
