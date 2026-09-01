import { createClient } from "@/lib/supabase/server";
import { CareerProfileService } from "./careerProfileService";
import { JobService } from "./jobService";
import { getAIProvider } from "@/lib/ai/provider";
import { InterviewSetupInput } from "@/lib/validation/interviews";
import { AnalyticsService } from "./analyticsService";
import {
  InterviewSessionDTO,
  InterviewSessionDetailDTO,
  InterviewQuestionDTO,
  InterviewAnswerDTO,
} from "@/lib/types/interview";

function mapInterviewRow(row: Record<string, unknown>): InterviewSessionDTO {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    jobId: row.job_id as string,
    interviewType: (row.interview_type as InterviewSessionDTO["interviewType"]) || "mixed",
    difficulty: (row.difficulty as InterviewSessionDTO["difficulty"]) || "medium",
    questionCount: row.question_count as number,
    status: row.status as InterviewSessionDTO["status"],
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) || (row.created_at as string),
  };
}

function mapQuestionRow(row: Record<string, unknown>): InterviewQuestionDTO {
  return {
    id: row.id as string,
    sessionId: row.interview_id as string,
    userId: row.user_id as string,
    question: row.question_text as string,
    category: (row.category as InterviewQuestionDTO["category"]) || "behavioral",
    difficulty: (row.difficulty as InterviewQuestionDTO["difficulty"]) || "medium",
    order: row.order_index as number,
    idealFocus: (row.ideal_focus as string) || (row.hint as string) || null,
    status: row.status as InterviewQuestionDTO["status"],
    source: row.source as string,
    createdAt: row.created_at as string,
  };
}

function mapAnswerRow(row: Record<string, unknown>): InterviewAnswerDTO {
  return {
    id: row.id as string,
    sessionId: row.interview_id as string,
    questionId: row.question_id as string,
    userId: row.user_id as string,
    answer: (row.answer as string) || (row.transcript as string) || null,
    feedback: row.feedback as string | null,
    score: row.score as number | null,
    transcript: row.transcript as string | null,
    storagePath: row.storage_path as string | null,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) || (row.created_at as string),
  };
}

export class InterviewService {
  static async createSession(
    userId: string,
    input: InterviewSetupInput
  ): Promise<InterviewSessionDTO> {
    const supabase = await createClient();

    // Verify job ownership (IDOR guard)
    const job = await JobService.getJobById(userId, input.jobId);
    if (!job) {
      throw new Error("Job not found or unauthorized");
    }

    const careerProfile = await CareerProfileService.getProfileByUserId(userId);

    if (!careerProfile) {
      throw new Error("Career profile not found. Please complete your profile first.");
    }

    // Insert interview session
    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .insert({
        user_id: userId,
        job_id: input.jobId,
        interview_type: input.type,
        difficulty: input.difficulty,
        question_count: input.questionCount,
        status: "active",
      })
      .select("*")
      .single();

    if (interviewError || !interview) {
      throw new Error(`Failed to create interview session: ${interviewError?.message}`);
    }

    // Generate questions via AI provider
    const ai = getAIProvider();
    const generated = await ai.interviewQuestionGenerator.generate({
      careerProfile,
      job,
      type: input.type,
      difficulty: input.difficulty,
      questionCount: input.questionCount,
    });

    // Insert questions
    const questionRows = generated.questions.map((q, idx) => ({
      interview_id: interview.id,
      user_id: userId,
      question_text: q.question,
      hint: q.idealFocus,
      category: q.category,
      difficulty: q.difficulty,
      ideal_focus: q.idealFocus,
      order_index: q.order ?? idx,
      source: "llm_initial",
      status: idx === 0 ? "active" : "pending",
    }));

    const { error: qError } = await supabase.from("interview_questions").insert(questionRows);

    if (qError) {
      // Cleanup interview on failure
      await supabase.from("interviews").delete().eq("id", interview.id).eq("user_id", userId);
      throw new Error(`Failed to create interview questions: ${qError.message}`);
    }

    // Analytics: interview_started
    try {
      await AnalyticsService.recordEvent({
        userId,
        eventType: "interview_started",
        jobId: input.jobId,
        publicProfileId: null,
        metadata: { interview_id: interview.id, type: input.type, difficulty: input.difficulty, questionCount: input.questionCount },
      });
    } catch {}

    return mapInterviewRow(interview);
  }

  static async listSessions(userId: string): Promise<InterviewSessionDTO[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("interviews")
      .select("*, jobs!inner(title,company)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row: Record<string, unknown>) => {
      const base = mapInterviewRow(row);
      const jobs = row.jobs as Record<string, unknown> | undefined;
      if (jobs) {
        return {
          ...base,
          job: {
            id: row.job_id as string,
            title: jobs.title as string,
            company: jobs.company as string,
            description: "",
          },
        };
      }
      return base;
    });
  }

  static async getSessionById(
    userId: string,
    sessionId: string
  ): Promise<InterviewSessionDetailDTO | null> {
    const supabase = await createClient();

    const { data: interview, error } = await supabase
      .from("interviews")
      .select("*, jobs(title,company,description)")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (error || !interview) return null;

    const base = mapInterviewRow(interview);
    const jobs = interview.jobs as Record<string, unknown> | undefined;

    const session: InterviewSessionDTO = {
      ...base,
      job: jobs
        ? {
            id: interview.job_id as string,
            title: jobs.title as string,
            company: jobs.company as string,
            description: jobs.description as string,
          }
        : undefined,
    };

    const [{ data: questions }, { data: answers }, { data: feedback }] = await Promise.all([
      supabase
        .from("interview_questions")
        .select("*")
        .eq("interview_id", sessionId)
        .order("order_index", { ascending: true }),
      supabase.from("interview_answers").select("*").eq("interview_id", sessionId),
      supabase.from("interview_feedback").select("*").eq("interview_id", sessionId).maybeSingle(),
    ]);

    const mappedQuestions: InterviewQuestionDTO[] = (questions || []).map((r: Record<string, unknown>) => mapQuestionRow(r));
    const mappedAnswers: InterviewAnswerDTO[] = (answers || []).map((r: Record<string, unknown>) => mapAnswerRow(r));

    // Compute progress
    const answered = mappedAnswers.length;
    const total = mappedQuestions.length;
    const avgScore =
      mappedAnswers.length > 0 && mappedAnswers.some((a) => a.score !== null)
        ? Math.round(
            mappedAnswers.filter((a) => a.score !== null).reduce((sum, a) => sum + (a.score as number), 0) /
              mappedAnswers.filter((a) => a.score !== null).length
          )
        : null;

    // Category analysis if answers have question linkage
    let strongestCategory: string | null = null;
    let weakestCategory: string | null = null;
    if (mappedAnswers.length > 0) {
      const categoryScores: Record<string, number[]> = {};
      for (const ans of mappedAnswers) {
        if (ans.score === null) continue;
        const q = mappedQuestions.find((qq) => qq.id === ans.questionId);
        if (!q) continue;
        if (!categoryScores[q.category]) categoryScores[q.category] = [];
        categoryScores[q.category].push(ans.score);
      }
      const avgByCat = Object.entries(categoryScores).map(([cat, scores]) => ({
        cat,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      }));
      if (avgByCat.length > 0) {
        avgByCat.sort((a, b) => b.avg - a.avg);
        strongestCategory = avgByCat[0].cat;
        weakestCategory = avgByCat[avgByCat.length - 1].cat;
      }
    }

    // Map feedback
    let feedbackDto = null as InterviewSessionDetailDTO["feedback"];
    if (feedback) {
      feedbackDto = {
        id: feedback.id,
        sessionId: feedback.interview_id,
        userId: feedback.user_id,
        overallScore: feedback.overall_score,
        label: feedback.label,
        dimensions: feedback.dimensions || {},
        strengths: feedback.strengths || [],
        weaknesses: feedback.weaknesses || [],
        aiRecommendation: feedback.ai_recommendation,
        model: feedback.model,
        createdAt: feedback.created_at,
      };
    }

    return {
      ...session,
      questions: mappedQuestions,
      answers: mappedAnswers,
      feedback: feedbackDto,
      progress: {
        total,
        answered,
        averageScore: avgScore,
        strongestCategory,
        weakestCategory,
      },
    };
  }

  static async patchSession(
    userId: string,
    sessionId: string,
    status: string
  ): Promise<InterviewSessionDTO> {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("interviews")
      .select("id,status")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      throw new Error("Session not found or unauthorized");
    }

    const updates: Record<string, unknown> = { status };
    if (status === "completed" || status === "feedback_ready") {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("interviews")
      .update(updates)
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !data) throw new Error(`Failed to update session: ${error?.message}`);

    // If completed, generate overall feedback if not exists and answers exist
    if (status === "completed") {
      await this.generateSessionFeedbackIfNeeded(userId, sessionId);
    }

    return mapInterviewRow(data);
  }

  static async submitAnswer(
    userId: string,
    input: { sessionId: string; questionId: string; answer: string }
  ): Promise<{ answer: InterviewAnswerDTO; feedback: { score: number; feedback: string; strengths: string[]; weaknesses: string[]; improvement: string; betterAnswer: string } }> {
    const supabase = await createClient();

    // Verify session ownership
    const session = await this.getSessionById(userId, input.sessionId);
    if (!session) throw new Error("Session not found or unauthorized");

    const question = session.questions.find((q) => q.id === input.questionId);
    if (!question) throw new Error("Question not found or does not belong to session");

    const job = session.job;
    if (!job) throw new Error("Job not found for session");

    const careerProfile = await CareerProfileService.getProfileByUserId(userId);
    if (!careerProfile) throw new Error("Career profile not found");

    // Evaluate via AI
    const ai = getAIProvider();
    const evaluation = await ai.interviewAnswerEvaluator.evaluate({
      question: question.question,
      answer: input.answer,
      careerProfile,
      job: {
        id: session.jobId,
        userId,
        title: job.title,
        company: job.company,
        description: job.description,
        descriptionHash: "",
        source: "interview",
        createdAt: session.createdAt,
      },
      category: question.category,
      difficulty: question.difficulty,
    });

    // Insert answer
    const { data: answerRow, error: ansError } = await supabase
      .from("interview_answers")
      .insert({
        interview_id: input.sessionId,
        user_id: userId,
        question_id: input.questionId,
        answer: input.answer,
        transcript: input.answer,
        feedback: evaluation.feedback,
        score: evaluation.score,
        status: "ready",
      })
      .select("*")
      .single();

    if (ansError || !answerRow) {
      throw new Error(`Failed to save answer: ${ansError?.message}`);
    }

    // Insert per-answer feedback details
    await supabase.from("interview_answer_feedback").insert({
      interview_id: input.sessionId,
      question_id: input.questionId,
      answer_id: answerRow.id,
      dimension_scores: { overall: evaluation.score },
      feedback: evaluation.feedback,
    });

    // Update question status to answered, and activate next pending
    await supabase
      .from("interview_questions")
      .update({ status: "answered" })
      .eq("id", input.questionId)
      .eq("user_id", userId);

    const nextPending = session.questions.find((q) => q.status === "pending" && q.order > question.order);
    if (nextPending) {
      await supabase
        .from("interview_questions")
        .update({ status: "active" })
        .eq("id", nextPending.id)
        .eq("user_id", userId);
    }

    // If all questions answered, auto-complete session and generate feedback
    const remainingPending = session.questions.filter((q) => q.status === "pending").length;
    // We just answered one, so check if all answered now
    const totalAnsweredAfter = session.answers.length + 1;
    if (totalAnsweredAfter >= session.questions.length && remainingPending === 0) {
      await supabase
        .from("interviews")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", input.sessionId)
        .eq("user_id", userId);
      await this.generateSessionFeedbackIfNeeded(userId, input.sessionId);
    }

    return {
      answer: mapAnswerRow(answerRow),
      feedback: evaluation,
    };
  }

  static async generateSessionFeedbackIfNeeded(
    userId: string,
    sessionId: string
  ): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("interview_feedback")
      .select("id")
      .eq("interview_id", sessionId)
      .maybeSingle();
    if (existing) return;

    const session = await this.getSessionById(userId, sessionId);
    if (!session || session.answers.length === 0) return;

    const scores = session.answers.filter((a) => a.score !== null).map((a) => a.score as number);
    if (scores.length === 0) return;

    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    let label: "needs_work" | "developing" | "proficient" | "strong" = "needs_work";
    if (overallScore >= 80) label = "strong";
    else if (overallScore >= 65) label = "proficient";
    else if (overallScore >= 45) label = "developing";

    // Aggregate dimensions from answer feedback if available, else mock
    // Fetch per-answer feedback for future dimension calculation (reserved)
    await supabase.from("interview_answer_feedback").select("dimension_scores,feedback").eq("interview_id", sessionId);

    // Simplified dimensions
    const dimensions: Record<string, number> = {
      communication: Math.min(100, overallScore + 5),
      technical: overallScore,
      structure: Math.max(0, overallScore - 5),
      confidence: Math.min(100, overallScore + 3),
      conciseness: Math.max(0, overallScore - 2),
    };

    const strengths = session.answers
      .slice(0, 2)
      .map((a) => a.feedback || "Clear response")
      .slice(0, 3);
    const weaknesses = session.questions
      .filter((q) => !session.answers.some((a) => a.questionId === q.id))
      .map((q) => `Practice ${q.category} questions`)
      .slice(0, 2);
    if (weaknesses.length === 0) weaknesses.push("Add more quantified outcomes");

    await supabase.from("interview_feedback").insert({
      interview_id: sessionId,
      user_id: userId,
      overall_score: overallScore,
      label,
      dimensions,
      strengths: strengths.length ? strengths : ["Structured answers"],
      weaknesses: weaknesses.length ? weaknesses : ["Include more metrics"],
      ai_recommendation:
        overallScore >= 80
          ? "Excellent work — focus on tightening stories to 90 seconds and adding company-specific tailoring."
          : overallScore >= 60
            ? "Solid progress — practice STAR with one verified metric per answer and research the company product."
            : "Focus on STAR structure and review your Career Profile to anchor answers in verified experience. Use [NEEDS_USER] gaps as preparation prompts.",
      model: process.env.GEMINI_MODEL || "mock",
    });

    // Also update interview status to feedback_ready
    await supabase
      .from("interviews")
      .update({ status: "feedback_ready" })
      .eq("id", sessionId)
      .eq("user_id", userId);

    // Analytics: interview_completed
    try {
      await AnalyticsService.recordEvent({
        userId,
        eventType: "interview_completed",
        jobId: session.jobId,
        metadata: { interview_id: sessionId, overallScore },
      });
    } catch {}
  }

  static async generateQuestionsForSession(
    userId: string,
    sessionId: string
  ): Promise<InterviewQuestionDTO[]> {
    const session = await this.getSessionById(userId, sessionId);
    if (!session) throw new Error("Session not found or unauthorized");
    return session.questions;
  }
}
