"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { JobDTO } from "@/lib/types";
import type { InterviewSessionDTO } from "@/lib/types/interview";

type Props = {
  jobs: JobDTO[];
  sessions: InterviewSessionDTO[];
  hasProfile: boolean;
  completionScore?: number;
};

export function InterviewSetupClient({ jobs, sessions, hasProfile, completionScore }: Props) {
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || "");
  const [type, setType] = useState<"behavioral" | "technical" | "mixed">("mixed");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  async function handleStart() {
    setError(null);
    if (!selectedJobId) {
      setError("Please select a job to practice.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/interview/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId, type, difficulty, questionCount }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create session");
      }
      const session = json.data as InterviewSessionDTO;
      router.push(`/interview/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start interview");
    } finally {
      setLoading(false);
    }
  }

  if (!hasProfile) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[32px]">person_book</span>
        </div>
        <h2 className="text-headline-sm font-semibold">Career Profile Required</h2>
        <p className="text-body-sm text-on-surface-variant">
          Build your Career Profile first — Interview Coach reuses your experiences, skills and education to generate tailored questions.
        </p>
        <Button onClick={() => router.push("/career-profile")} className="mx-auto">
          Go to Career Profile
        </Button>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[32px]">work</span>
        </div>
        <h2 className="text-headline-sm font-semibold">No Jobs Yet</h2>
        <p className="text-body-sm text-on-surface-variant">
          Add a job through Video Resume or manually — Interview Coach prepares you for a specific role using the Job Description.
        </p>
        <Button onClick={() => router.push("/video-resume")} className="mx-auto">
          Create a Job
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
      {/* Left: Setup */}
      <div className="lg:col-span-8 space-y-6">
        {completionScore !== undefined && completionScore < 60 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
            <span className="material-symbols-outlined text-amber-600">warning</span>
            <div className="text-body-sm">
              <p className="font-medium text-amber-900">Profile completion {completionScore}% — questions may be generic</p>
              <p className="text-amber-800">Add more experiences, skills or education for sharper, resume-based questions.</p>
            </div>
          </div>
        )}

        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-headline-sm font-semibold">Select Job</h3>
            <p className="text-body-sm text-on-surface-variant">Choose one of your existing jobs. No need to re-upload your resume.</p>
          </div>

          <div className="space-y-2">
            <label className="text-label-md font-medium">Job</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company}
                </option>
              ))}
            </select>
            {selectedJob && (
              <div className="rounded-lg bg-surface-container p-4 mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{selectedJob.title}</Badge>
                  <span className="text-body-sm text-on-surface-variant">{selectedJob.company}</span>
                </div>
                <p className="text-body-sm text-on-surface-variant line-clamp-3">{selectedJob.description}</p>
              </div>
            )}
          </div>

          {/* Session Settings */}
          <div className="space-y-4 pt-2">
            <h4 className="text-label-md font-semibold">Session Settings</h4>

            <div>
              <p className="text-body-sm font-medium mb-2">Interview Type</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["behavioral", "technical", "mixed"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`rounded-xl border p-4 text-left transition-colors ${type === t ? "border-secondary bg-secondary-container/50 ring-1 ring-secondary" : "border-outline-variant bg-surface-container-low hover:bg-surface-container"}`}
                  >
                    <p className="text-label-md font-semibold capitalize">{t}</p>
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      {t === "behavioral" ? "STAR, culture & past behavior" : t === "technical" ? "Role-specific & technical depth" : "Balanced across all categories"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-body-sm font-medium mb-2">Difficulty</p>
              <div className="grid grid-cols-3 gap-3">
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`rounded-xl border px-4 py-3 text-center capitalize ${difficulty === d ? "border-secondary bg-secondary text-on-secondary" : "border-outline-variant bg-surface-container-low hover:bg-surface-container"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-body-sm font-medium mb-2">Number of Questions</p>
              <div className="flex gap-2">
                {[5, 10, 15].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`flex-1 rounded-xl border py-2.5 text-label-md font-medium ${questionCount === n ? "border-secondary bg-secondary-container" : "border-outline-variant"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-error-container text-on-error-container px-4 py-3 text-body-sm">{error}</div>
          )}

          <Button onClick={handleStart} disabled={loading} variant="secondary" size="lg" className="w-full">
            {loading ? "Generating questions..." : "Start Interview"}
            <span className="material-symbols-outlined">arrow_forward</span>
          </Button>
          <p className="text-body-sm text-on-surface-variant text-center">Generates {questionCount} tailored questions using your Career Profile + selected Job — mock mode works without GEMINI_API_KEY.</p>
        </Card>
      </div>

      {/* Right: Recent sessions */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="p-6">
          <h4 className="text-label-md font-semibold mb-4">Recent Sessions</h4>
          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
              <p className="text-body-sm text-on-surface-variant">No sessions yet.</p>
              <p className="text-body-sm text-on-surface-variant mt-1">Your practice history and feedback will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/interview/${s.id}`)}
                  className="w-full text-left rounded-xl border border-outline-variant p-4 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-body-md font-medium truncate">{s.job?.title || "Interview"}</p>
                    <Badge variant={s.status === "completed" || s.status === "feedback_ready" ? "default" : "secondary"} className="capitalize text-xs">
                      {s.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{s.job?.company || ""} · {s.questionCount} Qs · {s.interviewType}</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">{new Date(s.createdAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-secondary-container/30">
          <h4 className="text-label-md font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">psychology</span> How it works
          </h4>
          <ol className="list-decimal list-inside text-body-sm text-on-surface-variant mt-3 space-y-1">
            <li>Select a Job (reused from Video Resume)</li>
            <li>AI generates questions from Profile + JD</li>
            <li>Answer, get score & actionable feedback</li>
            <li>Review summary with strengths & gaps</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
