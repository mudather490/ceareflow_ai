"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CareerProfileDTO, ResumeVersionDTO } from "@/lib/types";
import { ParsedResumeDTO } from "@/lib/ai/services/resumeParser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ResumeUploadModal } from "@/components/career-profile/ResumeUploadModal";
import { ReviewExtractedDataSheet } from "@/components/career-profile/ReviewExtractedDataSheet";
import { EditProfileModal } from "@/components/career-profile/EditProfileModal";

type Props = {
  initialProfile: CareerProfileDTO | null;
  initialResumeVersions?: ResumeVersionDTO[];
};

export function CareerProfileClient({ initialProfile, initialResumeVersions = [] }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<CareerProfileDTO | null>(initialProfile);
  const [resumeVersions, setResumeVersions] = useState<ResumeVersionDTO[]>(initialResumeVersions);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [stagedData, setStagedData] = useState<ParsedResumeDTO | null>(null);
  const [isScanned, setIsScanned] = useState(false);

  const hasProfile =
    Boolean(profile) &&
    Boolean(
      profile?.headlineTitle ||
      profile?.summary ||
      profile?.experiences?.length ||
      profile?.education?.length ||
      profile?.skills?.length
    );

  const handleExtracted = (data: ParsedResumeDTO, scanned?: boolean) => {
    setStagedData(data);
    setIsScanned(Boolean(scanned));
  };

  const handleRefresh = async () => {
    try {
      const [profileRes, resumeRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/profile/resume-versions"),
      ]);
      const profileJson = await profileRes.json().catch(() => null);
      const resumeJson = await resumeRes.json().catch(() => null);
      if (profileJson?.data) {
        setProfile(profileJson.data);
      }
      if (resumeJson?.data && Array.isArray(resumeJson.data)) {
        setResumeVersions(resumeJson.data as ResumeVersionDTO[]);
      }
      router.refresh();
    } catch {
      // Ignore refresh error
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-headline-lg font-semibold text-on-background">Your Career Profile</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            This centralized profile dynamically generates your resumes and guides your AI coaching sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Upload Resume PDF
          </Button>
          {hasProfile && profile && (
            <Button
              onClick={() => setIsEditHeaderOpen(true)}
              className="flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit Profile
            </Button>
          )}
        </div>
      </header>

      {/* Current Resume — proves persistence: always fetched from Supabase via GET /api/profile/resume-versions */}
      {resumeVersions.length > 0 ? (
        <Card className="p-5 border-secondary/20 bg-secondary/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-label-md font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">description</span>
                Current Resume — v{resumeVersions[0].versionNumber} • {resumeVersions[0].source} • {new Date(resumeVersions[0].createdAt).toLocaleDateString()}
              </h3>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Stored in private Supabase Storage at <code className="px-1 py-0.5 bg-surface-container rounded text-label-sm break-all">{resumeVersions[0].filePath || "private path"}</code> — reused by Resume AI, Video Resume, and Public Profile. Latest upload persists after reload.
              </p>
              {resumeVersions.length > 1 && (
                <p className="text-body-sm text-on-surface-variant mt-1">{resumeVersions.length} versions total — newest shown.</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)} className="shrink-0">
              <span className="material-symbols-outlined text-[16px] mr-1">upload_file</span> Replace Resume
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-5 border-dashed bg-surface-container-low">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant">description</span>
            <div>
              <p className="text-label-md font-semibold">No resume uploaded yet</p>
              <p className="text-body-sm text-on-surface-variant">Upload a PDF to create your first resume version. It will appear here and be reused across modules after you reload.</p>
            </div>
          </div>
        </Card>
      )}

      {!hasProfile || !profile ? (
        <EmptyState
          icon="person_book"
          title="No profile data yet"
          description="Upload your resume (PDF) to auto-fill your career profile with AI, or build it manually. You can review and edit all details before saving."
          actionLabel="Upload Resume (PDF)"
          onAction={() => setIsUploadOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
          {/* Main Column */}
          <div className="xl:col-span-8 space-y-gutter">
            {/* Header Card */}
            <Card className="p-6 relative group hover:shadow-level2 transition-shadow">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditHeaderOpen(true)}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-primary"
                title="Edit Personal Information"
              >
                <span className="material-symbols-outlined">edit</span>
              </Button>

              <div className="flex items-start gap-6 mb-6">
                <div className="w-20 h-20 rounded-full bg-surface-container border-4 border-surface-container-high flex items-center justify-center text-on-surface-variant font-bold text-headline-sm uppercase">
                  {profile.displayName.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h2 className="text-headline-md font-semibold text-on-background">{profile.displayName}</h2>
                  <p className="text-body-lg font-medium text-secondary">
                    {profile.headlineTitle || "Add a professional headline"}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-body-sm text-on-surface-variant">
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {profile.location}
                      </span>
                    )}
                    {profile.contactEmail && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                        {profile.contactEmail}
                      </span>
                    )}
                    {profile.linkedinUrl && (
                      <a
                        href={profile.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-secondary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">link</span>
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {profile.summary && (
                <div>
                  <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2 font-semibold">About</h3>
                  <p className="text-body-md text-on-background leading-relaxed whitespace-pre-line">
                    {profile.summary}
                  </p>
                </div>
              )}
            </Card>

            {/* Experience */}
            <Card className="p-6 hover:shadow-level2 transition-shadow">
              <div className="flex justify-between items-center mb-6 border-b border-outline-variant pb-3">
                <h2 className="text-headline-sm font-semibold flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-secondary">work</span> Experience
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadOpen(true)}
                  className="text-xs"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">sync</span> Update from Resume
                </Button>
              </div>

              {profile.experiences.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant italic">No work experience listed yet.</p>
              ) : (
                <div className="space-y-6">
                  {profile.experiences.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-outline-variant pl-4 py-1">
                      <h3 className="text-label-md font-bold text-on-background">{exp.title}</h3>
                      <p className="text-body-sm text-secondary font-medium">
                        {exp.company}
                        {exp.location ? ` • ${exp.location}` : ""}
                        {exp.startDate ? ` • ${exp.startDate}` : ""}
                        {exp.isCurrent ? " - Present" : exp.endDate ? ` - ${exp.endDate}` : ""}
                      </p>
                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="text-body-sm text-on-background list-disc list-inside mt-2 space-y-1">
                          {exp.bullets.map((b, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {b.text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Education */}
            <Card className="p-6 hover:shadow-level2 transition-shadow">
              <div className="flex justify-between items-center mb-6 border-b border-outline-variant pb-3">
                <h2 className="text-headline-sm font-semibold flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-secondary">school</span> Education
                </h2>
              </div>

              {profile.education.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant italic">No education entries listed yet.</p>
              ) : (
                <div className="space-y-4">
                  {profile.education.map((edu) => (
                    <div key={edu.id} className="border-l-2 border-outline-variant pl-4 py-1">
                      <h3 className="text-label-md font-bold text-on-background">{edu.institution}</h3>
                      <p className="text-body-sm text-secondary font-medium">
                        {edu.degree}
                        {edu.field ? ` in ${edu.field}` : ""}
                        {edu.startDate ? ` • ${edu.startDate}` : ""}
                        {edu.endDate ? ` - ${edu.endDate}` : ""}
                      </p>
                      {edu.description && (
                        <p className="text-body-sm text-on-surface-variant mt-1">{edu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="xl:col-span-4 space-y-gutter">
            {/* Profile Power / Completion widget */}
            <aside className="bg-gradient-to-br from-secondary-container/20 to-surface-container-highest border border-secondary-fixed rounded-xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-headline-sm font-semibold text-on-background flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">auto_awesome</span> Profile Strength
                  </h3>
                  <span className="text-headline-sm font-bold text-secondary">{profile.completionScore}%</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2 mb-3">
                  <div
                    className="bg-secondary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${profile.completionScore}%` }}
                  />
                </div>
                <p className="text-body-sm text-on-surface-variant mb-4">
                  A complete Career Profile unlocks precise AI resume tailoring, automated video script generation, and customized interview coaching.
                </p>
              </div>
            </aside>

            {/* Top Skills */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4 border-b border-outline-variant pb-2">
                <h3 className="text-label-md font-bold uppercase tracking-wider text-on-background">
                  Skills & Tools ({profile.skills.length})
                </h3>
              </div>
              {profile.skills.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant italic">No skills listed yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <span
                      key={s.id || s.name}
                      className="px-3 py-1 bg-surface-container text-on-surface text-label-sm rounded-md border border-outline-variant/30 font-medium"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* Certifications */}
            {profile.certifications.length > 0 && (
              <Card className="p-6">
                <h3 className="text-label-md font-bold uppercase tracking-wider text-on-background mb-3 border-b border-outline-variant pb-2">
                  Certifications
                </h3>
                <div className="space-y-3">
                  {profile.certifications.map((c) => (
                    <div key={c.id}>
                      <p className="text-label-md font-semibold text-primary">{c.name}</p>
                      {c.issuer && <p className="text-body-sm text-on-surface-variant">{c.issuer}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <ResumeUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onExtracted={handleExtracted}
      />

      {/* Review Staged Data Sheet */}
      {stagedData && (
        <ReviewExtractedDataSheet
          isOpen={Boolean(stagedData)}
          onClose={() => setStagedData(null)}
          stagedData={stagedData}
          isScanned={isScanned}
          onSaveSuccess={handleRefresh}
        />
      )}

      {/* Edit Header Modal */}
      {hasProfile && profile && (
        <EditProfileModal
          isOpen={isEditHeaderOpen}
          onClose={() => setIsEditHeaderOpen(false)}
          profile={profile}
          onSaved={handleRefresh}
        />
      )}
    </div>
  );
}
