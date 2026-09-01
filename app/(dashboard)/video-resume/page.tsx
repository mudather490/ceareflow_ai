import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CareerProfileService } from "@/lib/services/careerProfileService";
import { VideoResumeStepper } from "@/components/video-resume/VideoResumeStepper";
import { JobForm } from "@/components/video-resume/JobForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CareerProfileDTO, ResumeVersionDTO } from "@/lib/types";

export const metadata = { title: "Video Resume — Step 1: Match Job — CareerFlow AI" };

export default async function VideoResumePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: CareerProfileDTO | null = null;
  let resumeVersions: ResumeVersionDTO[] = [];

  if (user) {
    [profile, resumeVersions] = await Promise.all([
      CareerProfileService.getProfileByUserId(user.id),
      CareerProfileService.listResumeVersions(user.id),
    ]);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-headline-lg font-semibold text-on-background">Create Your Video Pitch</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Generate an AI-tailored video resume pitch aligned precisely to your target role.
          </p>
        </div>
      </header>

      {/* Stepper */}
      <VideoResumeStepper currentStep={1} />

      {!profile || profile.experiences.length === 0 ? (
        <Card className="p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[32px]">person_book</span>
          </div>
          <h2 className="text-headline-sm font-semibold text-primary">Career Profile Required</h2>
          <p className="text-body-sm text-on-surface-variant">
            To generate an accurate, non-fabricated job match and video script, please upload your resume or build your Career Profile first.
          </p>
          <div className="pt-2">
            <Link href="/career-profile">
              <Button className="flex items-center gap-2 mx-auto">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Set Up Career Profile
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <JobForm profile={profile} resumeVersions={resumeVersions} />
      )}
    </div>
  );
}
