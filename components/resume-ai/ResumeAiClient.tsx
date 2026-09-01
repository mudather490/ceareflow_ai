"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ResumeVersionDTO, JobDTO } from "@/lib/types";
import type { ResumeAnalyzerResult } from "@/lib/ai/services/resumeAnalyzer";

type Props = {
  resumeVersions: ResumeVersionDTO[];
  jobs: JobDTO[];
};

function ScoreRing({ score }: { score: number }) {
  const r = 45;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? "text-success" : score >= 60 ? "text-secondary" : score < 45 ? "text-error" : "text-amber-600";
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} stroke="currentColor" className="text-outline-variant" strokeWidth="8" fill="none" />
        <circle cx="56" cy="56" r={r} stroke="currentColor" className={color} strokeWidth="8" fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <p className={`text-headline-md font-bold ${color}`}>{score}</p>
        <p className="text-label-sm text-on-surface-variant">/100</p>
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: ResumeAnalyzerResult["sectionScores"][number] }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-label-md font-semibold capitalize">{section.section}</h4>
        <Badge variant={section.score >= 70 ? "default" : section.score >= 50 ? "secondary" : "outline"}>{section.score}/100</Badge>
      </div>
      {section.strengths.length > 0 && (
        <div>
          <p className="text-label-sm font-medium text-success">Strengths</p>
          <ul className="list-disc list-inside text-body-sm text-on-surface-variant space-y-0.5">
            {section.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {section.issues.length > 0 && (
        <div>
          <p className="text-label-sm font-medium text-error">Issues</p>
          <ul className="list-disc list-inside text-body-sm text-on-surface-variant space-y-0.5">
            {section.issues.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {section.recommendations.length > 0 && (
        <div className="rounded-lg bg-secondary-container/30 p-3">
          <p className="text-label-sm font-medium">Recommendations</p>
          <ul className="list-disc list-inside text-body-sm space-y-0.5">
            {section.recommendations.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function ResumeAiClient({ resumeVersions, jobs }: Props) {
  const [selectedResumeId, setSelectedResumeId] = useState<string>(resumeVersions[0]?.id || "");
  const [selectedJobId, setSelectedJobId] = useState<string>(""); // empty = general
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeAnalyzerResult | null>(null);

  const hasResume = resumeVersions.length > 0;

  async function handleAnalyze() {
    if (!selectedResumeId) {
      setError("Please select a resume version.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/resume-ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeVersionId: selectedResumeId,
          jobId: selectedJobId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Analysis failed");
      setResult(json.data as ResumeAnalyzerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze");
    } finally {
      setLoading(false);
    }
  }

  if (!hasResume) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[32px]">description</span>
        </div>
        <h2 className="text-headline-sm font-semibold">No Resume Yet</h2>
        <p className="text-body-sm text-on-surface-variant">Upload your resume in Career Profile to enable AI analysis. Your Career Profile remains the canonical source.</p>
        <Button onClick={() => (window.location.href = "/career-profile")} className="mx-auto">
          Go to Career Profile
        </Button>
      </Card>
    );
  }

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <Card className="p-6 space-y-5">
        <div>
          <h3 className="text-headline-sm font-semibold">Select Resume</h3>
          <p className="text-body-sm text-on-surface-variant">Choose an existing resume version. No re-upload needed.</p>
        </div>
        <div className="space-y-3">
          <label className="text-label-md font-medium">Resume Version</label>
          <select
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            {resumeVersions.map((rv) => (
              <option key={rv.id} value={rv.id}>
                v{rv.versionNumber} — {rv.createdAt.slice(0, 10)} — {rv.source}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-label-md font-medium">Target Job (optional)</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            <option value="">General analysis (no job)</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} — {j.company}
              </option>
            ))}
          </select>
          {selectedJob && (
            <div className="rounded-lg bg-surface-container p-3 text-body-sm">
              <p className="font-medium">{selectedJob.title} at {selectedJob.company}</p>
              <p className="text-on-surface-variant line-clamp-2">{selectedJob.description.slice(0, 160)}...</p>
            </div>
          )}
          {!selectedJob && <p className="text-body-sm text-on-surface-variant">General analysis evaluates summary, experience, skills, education, and formatting quality.</p>}
        </div>

        {error && <div className="rounded-lg bg-error-container text-on-error-container px-4 py-3 text-body-sm">{error}</div>}

        <Button onClick={handleAnalyze} disabled={loading} variant="secondary" size="lg" className="w-full">
          {loading ? "Analyzing..." : "Analyze Resume"}
          <span className="material-symbols-outlined">auto_awesome</span>
        </Button>
        <p className="text-body-sm text-on-surface-variant text-center">Mock mode works without GEMINI_API_KEY. Validates output via Zod.</p>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <ScoreRing score={result.overallScore} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-headline-sm font-semibold">{selectedJob ? "Resume Alignment Score" : "Resume Quality Score"}</h3>
                  <Badge variant={result.overallScore >= 70 ? "default" : "secondary"} className="capitalize">
                    {result.label || (result.overallScore >= 80 ? "strong" : result.overallScore >= 65 ? "proficient" : result.overallScore >= 45 ? "developing" : "needs_work")}
                  </Badge>
                  {result.model && <span className="text-body-sm text-on-surface-variant">model: {result.model}</span>}
                </div>
                <p className="text-body-md text-on-surface-variant">{result.summary}</p>
                {result.jobAlignment && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-body-sm">
                    <p className="font-medium">Job Alignment</p>
                    <p>Matching strengths: {result.jobAlignment.matchingStrengths.join(", ") || "—"}</p>
                    <p>Missing/weak: {result.jobAlignment.missingWeakAreas.join(", ") || "—"}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Section Scores */}
          <div>
            <h4 className="text-headline-sm font-semibold mb-3">Section Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.sectionScores.map((s) => (
                <SectionCard key={s.section} section={s} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h4 className="text-label-md font-semibold text-success flex items-center gap-1.5">
                <span className="material-symbols-outlined">check_circle</span> Strengths
              </h4>
              <ul className="list-disc list-inside text-body-sm space-y-1 mt-3">
                {result.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h4 className="text-label-md font-semibold text-error flex items-center gap-1.5">
                <span className="material-symbols-outlined">warning</span> Issues
              </h4>
              <ul className="list-disc list-inside text-body-sm space-y-1 mt-3">
                {result.issues.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h4 className="text-label-md font-semibold">Recommendations</h4>
            <ol className="list-decimal list-inside text-body-sm space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="leading-relaxed">
                  {r.includes("[NEEDS_USER") ? (
                    <span>
                      {r.split(/(\[NEEDS_USER:[^\]]+\])/).map((part, idx) =>
                        part.startsWith("[NEEDS_USER") ? (
                          <span key={idx} className="px-1.5 py-0.5 rounded border border-dashed border-amber-500 bg-amber-50 text-amber-800 text-label-sm">
                            {part}
                          </span>
                        ) : (
                          <span key={idx}>{part}</span>
                        )
                      )}
                    </span>
                  ) : (
                    r
                  )}
                </li>
              ))}
            </ol>
            {result.keywordSuggestions.length > 0 && (
              <div>
                <p className="text-label-sm font-medium">Keyword Suggestions (use only if truthful)</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.keywordSuggestions.map((k) => (
                    <Badge key={k} variant="outline">
                      {k}
                    </Badge>
                  ))}
                </div>
                <p className="text-body-sm text-on-surface-variant mt-2">Only add keywords that reflect verified experience — do not fabricate skills.</p>
              </div>
            )}
            {result.jobAlignment && result.jobAlignment.experienceRecommendations.length > 0 && (
              <div className="rounded-lg bg-secondary-container/40 p-4">
                <p className="text-label-sm font-semibold">Experience Recommendations</p>
                <ul className="list-disc list-inside text-body-sm space-y-1 mt-2">
                  {result.jobAlignment.experienceRecommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
