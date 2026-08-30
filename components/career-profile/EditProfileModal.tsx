"use client";

import { useState } from "react";
import { CareerProfileDTO } from "@/lib/types";
import { CareerProfileInput } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ErrorAlert } from "@/components/shared/ErrorAlert";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: CareerProfileDTO;
  onSaved: () => void;
};

export function EditProfileModal({ isOpen, onClose, profile, onSaved }: Props) {
  const [formData, setFormData] = useState<CareerProfileInput>({
    displayName: profile.displayName,
    headlineTitle: profile.headlineTitle || "",
    summary: profile.summary || "",
    location: profile.location || "",
    contactEmail: profile.contactEmail || "",
    linkedinUrl: profile.linkedinUrl || "",
    portfolioUrl: profile.portfolioUrl || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Preserve existing children
          experiences: profile.experiences.map((exp) => ({
            company: exp.company,
            title: exp.title,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrent: exp.isCurrent,
            bullets: exp.bullets,
            orderIndex: exp.orderIndex,
          })),
          education: profile.education.map((edu) => ({
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            startDate: edu.startDate,
            endDate: edu.endDate,
            isCurrent: edu.isCurrent,
            description: edu.description,
          })),
          skills: profile.skills.map((s) => ({
            name: s.name,
            category: s.category,
            proficiency: s.proficiency,
          })),
          projects: profile.projects.map((p) => ({
            name: p.name,
            description: p.description,
            url: p.url,
            techStack: p.techStack,
            orderIndex: p.orderIndex,
          })),
          certifications: profile.certifications.map((c) => ({
            name: c.name,
            issuer: c.issuer,
            issuedDate: c.issuedDate,
            url: c.url,
          })),
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.message || "Failed to update profile");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full border border-outline-variant shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="text-headline-sm font-semibold text-on-surface">Edit Career Profile Header</h3>
          <button onClick={onClose} disabled={isSubmitting} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && <ErrorAlert message={error} />}

          <div className="space-y-1.5">
            <Label htmlFor="editName">Full Name</Label>
            <Input
              id="editName"
              value={formData.displayName || ""}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editTitle">Professional Title</Label>
            <Input
              id="editTitle"
              value={formData.headlineTitle || ""}
              onChange={(e) => setFormData({ ...formData, headlineTitle: e.target.value })}
              placeholder="e.g. Senior Product Designer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="editLocation">Location</Label>
              <Input
                id="editLocation"
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. San Francisco, CA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editEmail">Contact Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.contactEmail || ""}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="alex.mercer@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editLinkedin">LinkedIn Profile URL</Label>
            <Input
              id="editLinkedin"
              value={formData.linkedinUrl || ""}
              onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/alexmercer"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editSummary">About / Summary</Label>
            <Textarea
              id="editSummary"
              rows={4}
              value={formData.summary || ""}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Strategic overview of your expertise and focus..."
            />
          </div>

          <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
