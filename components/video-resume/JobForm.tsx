"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { ResumeVersionDTO, CareerProfileDTO } from "@/lib/types";

type Props = {
  profile: CareerProfileDTO;
  resumeVersions: ResumeVersionDTO[];
};

export function JobForm({ profile, resumeVersions }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [selectedResumeVersionId, setSelectedResumeVersionId] = useState<string>(
    resumeVersions[0]?.id || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    if (description.trim().length < 20) {
      setError("Please provide a more detailed job description (at least 20 characters).");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/video-resume/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          company: company.trim(),
          description: description.trim(),
          resumeVersionId: selectedResumeVersionId || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.message || "Failed to match job requirements");
      }

      router.push(`/video-resume/match/${result.data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error executing job match.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column: Base Resume selection */}
        <div className="lg:col-span-5 space-y-gutter">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-outline-variant pb-3">
              <span className="material-symbols-outlined text-secondary">description</span>
              <h2 className="text-headline-sm font-semibold text-on-surface">Base Profile & CV</h2>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Matching compares your verified Career Profile against the target job requirements.
            </p>

            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-label-md font-bold text-primary">{profile.displayName}</span>
                <span className="text-label-sm font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                  {profile.completionScore}% Complete
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant line-clamp-1">
                {profile.headlineTitle || "Profile Active"}
              </p>
              <p className="text-label-sm text-on-surface-variant">
                {profile.experiences.length} experience entries • {profile.skills.length} skills
              </p>
            </div>

            {resumeVersions.length > 0 && (
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Associated Resume Version
                </Label>
                <select
                  value={selectedResumeVersionId}
                  onChange={(e) => setSelectedResumeVersionId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  {resumeVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      Version {v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Target Job Details */}
        <div className="lg:col-span-7 space-y-gutter">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">work</span>
                <h2 className="text-headline-sm font-semibold text-on-surface">Target Job Details</h2>
              </div>
              <span className="bg-secondary/10 text-secondary text-label-sm px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span> Paste JD for AI Match
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Product Designer"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="jobDescription">Job Description & Requirements *</Label>
                <span className="text-label-sm text-on-surface-variant">
                  {description.length} characters
                </span>
              </div>
              <Textarea
                id="jobDescription"
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste the full job posting, key responsibilities, and required qualifications here..."
                required
              />
            </div>

            <div className="pt-4 border-t border-outline-variant flex justify-end">
              <Button
                type="submit"
                disabled={isLoading || !title.trim() || !company.trim() || description.length < 20}
                className="min-w-[200px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Analyzing Match…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    Match My Resume
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
