"use client";

import { useState } from "react";
import { ParsedResumeDTO } from "@/lib/ai/services/resumeParser";
import { CareerProfileInput } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/shared/ErrorAlert";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  stagedData: ParsedResumeDTO;
  isScanned?: boolean;
  onSaveSuccess: () => void;
};

export function ReviewExtractedDataSheet({
  isOpen,
  onClose,
  stagedData,
  isScanned,
  onSaveSuccess,
}: Props) {
  const [formData, setFormData] = useState<CareerProfileInput>(() => ({
    displayName: stagedData.name || "",
    headlineTitle: stagedData.headlineTitle || "",
    summary: stagedData.summary || "",
    location: stagedData.location || "",
    contactEmail: stagedData.contactEmail || "",
    linkedinUrl: stagedData.linkedinUrl || "",
    portfolioUrl: stagedData.portfolioUrl || "",
    experiences: (stagedData.experiences || []).map((exp, idx) => ({
      company: exp.company,
      title: exp.title,
      location: exp.location || "",
      startDate: exp.startDate || "",
      endDate: exp.endDate || "",
      isCurrent: exp.isCurrent,
      bullets: exp.bullets || [],
      orderIndex: idx,
    })),
    education: (stagedData.education || []).map((edu) => ({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field || "",
      startDate: edu.startDate || "",
      endDate: edu.endDate || "",
      isCurrent: edu.isCurrent,
      description: edu.description || "",
    })),
    skills: (stagedData.skills || []).map((s) => ({
      name: s.name,
      category: s.category || "General",
      proficiency: null,
    })),
    projects: (stagedData.projects || []).map((p, idx) => ({
      name: p.name,
      description: p.description || "",
      url: p.url || "",
      techStack: p.techStack || [],
      orderIndex: idx,
    })),
    certifications: (stagedData.certifications || []).map((c) => ({
      name: c.name,
      issuer: c.issuer || "",
      issuedDate: c.issuedDate || "",
      url: c.url || "",
    })),
  }));

  const [newSkill, setNewSkill] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    const skills = formData.skills || [];
    if (!skills.some((s) => s.name.toLowerCase() === newSkill.trim().toLowerCase())) {
      setFormData({
        ...formData,
        skills: [...skills, { name: newSkill.trim(), category: "General", proficiency: null }],
      });
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillName: string) => {
    setFormData({
      ...formData,
      skills: (formData.skills || []).filter((s) => s.name !== skillName),
    });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.message || "Failed to commit profile updates");
      }

      onSaveSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-background h-full overflow-y-auto shadow-2xl flex flex-col border-l border-outline-variant">
        {/* Header banner */}
        <div className="p-6 border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-20 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-secondary text-[22px]">auto_awesome</span>
              <h2 className="text-headline-sm font-semibold text-on-surface">Review Extracted Profile</h2>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              AI extracted this information from your resume. Review and edit all sections before saving to your canonical profile.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary p-1 rounded-md"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {isScanned && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-900 text-body-sm">
              <span className="material-symbols-outlined text-amber-600 mt-0.5">warning</span>
              <div>
                <p className="font-semibold">Scanned PDF Detected</p>
                <p>This PDF appears to be a scanned image. Some text extraction may be limited. Please review each section carefully.</p>
              </div>
            </div>
          )}

          {error && <ErrorAlert message={error} />}

          {/* Personal Info */}
          <Card className="p-5 space-y-4">
            <h3 className="text-label-md font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Full Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName || ""}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. Alex Mercer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="headlineTitle">Professional Title</Label>
                <Input
                  id="headlineTitle"
                  value={formData.headlineTitle || ""}
                  onChange={(e) => setFormData({ ...formData, headlineTitle: e.target.value })}
                  placeholder="e.g. Senior Product Designer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ""}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail || ""}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="alex.mercer@example.com"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input
                  id="linkedinUrl"
                  value={formData.linkedinUrl || ""}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/alexmercer"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="summary">Professional Summary</Label>
              <Textarea
                id="summary"
                rows={3}
                value={formData.summary || ""}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief summary of your career focus and experience..."
              />
            </div>
          </Card>

          {/* Work Experience */}
          <Card className="p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <h3 className="text-label-md font-bold uppercase tracking-wider text-primary">
                Work Experience ({(formData.experiences || []).length})
              </h3>
            </div>

            {(formData.experiences || []).length === 0 ? (
              <p className="text-body-sm text-on-surface-variant italic">No experience entries detected.</p>
            ) : (
              <div className="space-y-4">
                {(formData.experiences || []).map((exp, idx) => (
                  <div key={idx} className="p-4 bg-surface-container-lowest border border-outline-variant/60 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Company</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) => {
                            const next = [...(formData.experiences || [])];
                            next[idx].company = e.target.value;
                            setFormData({ ...formData, experiences: next });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={exp.title}
                          onChange={(e) => {
                            const next = [...(formData.experiences || [])];
                            next[idx].title = e.target.value;
                            setFormData({ ...formData, experiences: next });
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Bullet Points</Label>
                      {exp.bullets.map((bullet, bIdx) => (
                        <Textarea
                          key={bIdx}
                          rows={2}
                          className="text-body-sm mb-1"
                          value={bullet.text}
                          onChange={(e) => {
                            const next = [...(formData.experiences || [])];
                            next[idx].bullets[bIdx].text = e.target.value;
                            setFormData({ ...formData, experiences: next });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Education */}
          <Card className="p-5 space-y-4">
            <h3 className="text-label-md font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-2">
              Education ({(formData.education || []).length})
            </h3>
            {(formData.education || []).length === 0 ? (
              <p className="text-body-sm text-on-surface-variant italic">No education entries detected.</p>
            ) : (
              <div className="space-y-3">
                {(formData.education || []).map((edu, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-lowest border border-outline-variant/60 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Institution</Label>
                      <Input
                        value={edu.institution}
                        onChange={(e) => {
                          const next = [...(formData.education || [])];
                          next[idx].institution = e.target.value;
                          setFormData({ ...formData, education: next });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Degree & Field</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => {
                          const next = [...(formData.education || [])];
                          next[idx].degree = e.target.value;
                          setFormData({ ...formData, education: next });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Skills */}
          <Card className="p-5 space-y-4">
            <h3 className="text-label-md font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-2">
              Skills & Competencies
            </h3>
            <div className="flex flex-wrap gap-2">
              {(formData.skills || []).map((skill) => (
                <span
                  key={skill.name}
                  className="bg-surface-container text-on-surface px-3 py-1.5 rounded-full text-label-sm border border-outline-variant/30 flex items-center gap-1.5 group"
                >
                  {skill.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.name)}
                    className="text-on-surface-variant hover:text-error rounded-full"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add a skill (press Enter)..."
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddSkill}>
                Add Skill
              </Button>
            </div>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-outline-variant bg-surface-container-lowest sticky bottom-0 z-20 flex justify-between items-center gap-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel & Discard
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="min-w-[180px]">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Saving Profile…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check</span>
                Save Career Profile
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
