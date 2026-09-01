"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewSessionDetailDTO, InterviewQuestionDTO } from "@/lib/types/interview";

type Props = {
  initialSession: InterviewSessionDetailDTO;
};

export function InterviewSessionClient({ initialSession }: Props) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [currentIdx, setCurrentIdx] = useState(() => {
    const firstUnanswered = initialSession.questions.findIndex((q) => q.status !== "answered");
    // If all answered, show last
    return firstUnanswered === -1 ? Math.max(0, initialSession.questions.length - 1) : firstUnanswered;
  });
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<null | { score: number; strengths: string[]; weaknesses: string[]; improvement: string; betterAnswer: string; feedback: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const question: InterviewQuestionDTO | undefined = session.questions[currentIdx];
  const answered = session.answers.find((a) => a.questionId === question?.id);
  const isLast = currentIdx === session.questions.length - 1;
  const progress = session.progress;

  async function handleSubmit() {
    if (!question) return;
    if (!answer.trim()) {
      setError("Answer is required");
      return;
    }
    if (answer.length > 5000) {
      setError("Answer too long (max 5000)");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/interview/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, questionId: question.id, answer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to submit answer");
      setFeedback(json.data.feedback);
      // Refresh session to update progress/status
      const freshRes = await fetch(`/api/interview/sessions/${session.id}`);
      const freshJson = await freshRes.json();
      if (freshRes.ok && freshJson.data) setSession(freshJson.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setFeedback(null);
    setAnswer("");
    setError(null);
    if (!isLast) setCurrentIdx((i) => i + 1);
  }

  function handleSkip() {
    if (isLast) return;
    setFeedback(null);
    setAnswer("");
    setError(null);
    setCurrentIdx((i) => i + 1);
  }

  async function handleComplete() {
    try {
      await fetch(`/api/interview/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const freshRes = await fetch(`/api/interview/sessions/${session.id}`);
      const freshJson = await freshRes.json();
      if (freshRes.ok) setSession(freshJson.data);
    } catch {}
  }

  const allAnswered = session.questions.length > 0 && session.answers.length >= session.questions.length;
  const showFeedbackBento = allAnswered && session.feedback;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-headline-md font-semibold">Interview Coach</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-body-sm">
            <span className="font-medium">{session.job?.title}</span>
            <span className="text-on-surface-variant">at {session.job?.company}</span>
            <Badge variant="secondary" className="capitalize">{session.interviewType}</Badge>
            <Badge variant="outline" className="capitalize">{session.difficulty}</Badge>
            <Badge variant="outline">{session.status.replace("_", " ")}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-label-sm text-on-surface-variant">Progress</p>
            <p className="text-label-md font-semibold">{progress.answered} / {progress.total} answered</p>
            {progress.averageScore !== null && <p className="text-body-sm text-on-surface-variant">Avg {progress.averageScore}/100</p>}
          </div>
          <Button variant="outline" onClick={() => router.push("/interview")}>Back to Coach</Button>
        </div>
      </header>

      {/* Preparation overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-label-sm text-on-surface-variant">Job</p>
          <p className="text-body-md font-medium">{session.job?.title} — {session.job?.company}</p>
          <p className="text-body-sm text-on-surface-variant line-clamp-2 mt-1">{session.job?.description?.slice(0, 120)}...</p>
        </Card>
        <Card className="p-4">
          <p className="text-label-sm text-on-surface-variant">Questions</p>
          <p className="text-headline-sm font-semibold">{session.questions.length}</p>
          <p className="text-body-sm text-on-surface-variant">Category mix: {session.questions.map((q) => q.category).slice(0, 3).join(", ")}...</p>
        </Card>
        <Card className="p-4">
          <p className="text-label-sm text-on-surface-variant">Session Progress</p>
          <div className="w-full h-2 rounded-full bg-surface-container mt-2">
            <div className="h-2 rounded-full bg-secondary" style={{ width: `${Math.round((progress.answered / Math.max(1, progress.total)) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-body-sm mt-2">
            <span>Strongest: {progress.strongestCategory || "—"}</span>
            <span className="text-error">Needs: {progress.weakestCategory || "—"}</span>
          </div>
        </Card>
      </div>

      {/* Final summary bento if completed */}
      {showFeedbackBento && (
        <Card className="p-6 space-y-4 border-secondary/30 bg-secondary-container/10">
          <div className="flex items-center justify-between">
            <h3 className="text-headline-sm font-semibold">Final Preparation Summary</h3>
            <Badge variant="secondary">{session.feedback!.label.replace("_", " ")}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 p-6 rounded-xl bg-surface-container-lowest border text-center">
              <p className="text-display-md font-bold text-secondary">{session.feedback!.overallScore}<span className="text-headline-sm">/100</span></p>
              <p className="text-label-md capitalize">{session.feedback!.label.replace("_", " ")}</p>
              <div className="mt-4 space-y-2 text-left">
                {Object.entries(session.feedback!.dimensions).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-body-sm"><span className="capitalize">{k}</span><span>{v as number}</span></div>
                    <div className="h-1.5 rounded-full bg-surface-container">
                      <div className={`h-1.5 rounded-full ${(v as number) >= 70 ? "bg-secondary" : "bg-tertiary"}`} style={{ width: `${v as number}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div>
                <p className="text-label-md font-semibold text-success">Strengths</p>
                <ul className="list-disc list-inside text-body-sm mt-1 space-y-1">
                  {session.feedback!.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-label-md font-semibold text-error">Areas to improve</p>
                <ul className="list-disc list-inside text-body-sm mt-1 space-y-1">
                  {session.feedback!.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
              {session.feedback!.aiRecommendation && (
                <div className="rounded-xl bg-gradient-to-r from-secondary/10 to-primary/10 p-4">
                  <p className="text-label-md font-semibold">AI Recommendation</p>
                  <p className="text-body-sm mt-1">{session.feedback!.aiRecommendation}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/interview")}>Practice Another Job</Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </div>
        </Card>
      )}

      {/* Question card */}
      {question && !showFeedbackBento && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1 self-stretch rounded-full bg-secondary" aria-hidden />
              <Badge variant="secondary" className="capitalize">{question.category.replace("_", " ")}</Badge>
              <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
              {question.status === "answered" && <Badge className="bg-success text-on-success">Answered</Badge>}
            </div>
            <span className="text-body-sm text-on-surface-variant">Question {currentIdx + 1} of {session.questions.length}</span>
          </div>

          <h2 className="text-headline-sm font-semibold leading-relaxed">{question.question}</h2>
          {question.idealFocus && (
            <div className="rounded-lg bg-secondary-container/40 border border-secondary/20 p-3">
              <p className="text-label-sm font-semibold flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">lightbulb</span> Ideal focus</p>
              <p className="text-body-sm mt-1">{question.idealFocus}</p>
            </div>
          )}

          {/* Answer area */}
          <div className="space-y-3 pt-2">
            <label className="text-label-md font-medium">Your answer</label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Structure with STAR (Situation, Task, Action, Result). Include a measurable outcome if possible..."
              rows={6}
              maxLength={5000}
              className="min-h-[140px]"
              disabled={!!feedback || !!answered}
            />
            <div className="flex justify-between text-body-sm text-on-surface-variant">
              <span>{answer.length} / 5000</span>
              {answered && <span className="text-success">Already answered — score {answered.score}/100</span>}
            </div>

            {error && <div className="rounded-lg bg-error-container text-on-error-container px-4 py-2 text-body-sm">{error}</div>}

            {/* Feedback after submission */}
            {feedback && (
              <div className="rounded-xl border border-outline-variant p-4 space-y-3 bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-headline-sm font-bold">{feedback.score}</div>
                  <div>
                    <p className="text-label-md font-semibold">Score {feedback.score}/100</p>
                    <p className="text-body-sm text-on-surface-variant">{feedback.feedback}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-label-sm font-semibold text-success">What went well</p>
                    <ul className="list-disc list-inside text-body-sm space-y-1 mt-1">
                      {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-label-sm font-semibold text-error">What to improve</p>
                    <ul className="list-disc list-inside text-body-sm space-y-1 mt-1">
                      {feedback.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-label-sm font-semibold">Better answer strategy</p>
                  <p className="text-body-sm mt-1">{feedback.betterAnswer}</p>
                  <p className="text-body-sm mt-2"><span className="font-medium">Improvement:</span> {feedback.improvement}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!feedback && !answered ? (
                <>
                  <Button onClick={handleSubmit} disabled={submitting} variant="secondary" className="flex-1">
                    {submitting ? "Evaluating..." : "Submit Answer"}
                  </Button>
                  <Button variant="outline" onClick={handleSkip} disabled={currentIdx === session.questions.length - 1}>Skip</Button>
                </>
              ) : (
                <>
                  {isLast ? (
                    <Button variant="secondary" onClick={handleComplete} className="flex-1">Complete Session</Button>
                  ) : (
                    <Button variant="secondary" onClick={handleNext} className="flex-1">Next Question</Button>
                  )}
                  <Button variant="outline" onClick={() => { setFeedback(null); setAnswer(answered?.answer || ""); }}>Review Answer</Button>
                </>
              )}
            </div>
          </div>

          {/* Question navigation dots */}
          <div className="flex gap-1.5 justify-center pt-2">
            {session.questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => { setCurrentIdx(idx); setFeedback(null); setAnswer(session.answers.find(a => a.questionId === q.id)?.answer || ""); setError(null); }}
                className={`h-2 rounded-full transition-all ${idx === currentIdx ? "w-6 bg-secondary" : q.status === "answered" || session.answers.some(a => a.questionId === q.id) ? "w-2 bg-success" : "w-2 bg-outline-variant"}`}
                aria-label={`Go to question ${idx + 1}`}
              />
            ))}
          </div>
        </Card>
      )}

      {/* All answered but no feedback yet */}
      {allAnswered && !session.feedback && (
        <Card className="p-6 text-center space-y-3">
          <h3 className="text-headline-sm font-semibold">All questions answered!</h3>
          <p className="text-body-sm text-on-surface-variant">Complete the session to generate your final preparation summary.</p>
          <Button variant="secondary" onClick={handleComplete}>Generate Summary</Button>
        </Card>
      )}
    </div>
  );
}
