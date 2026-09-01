import { createClient } from "@/lib/supabase/server";
import { CareerProfileService } from "@/lib/services/careerProfileService";
import { JobService } from "@/lib/services/jobService";
import { ResumeAiClient } from "@/components/resume-ai/ResumeAiClient";

export const metadata = { title: "Resume AI — CareerFlow AI" };

export const dynamic = "force-dynamic";

export default async function ResumeAiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [resumeVersions, jobs] = await Promise.all([
    CareerProfileService.listResumeVersions(user.id),
    JobService.listJobs(user.id),
  ]);

  return (
    <div className="space-y-6">
      <header className="pb-4 border-b border-outline-variant">
        <h1 className="text-headline-lg font-semibold text-on-background">Resume AI</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Analyze your existing resume/profile — select a version and optional job for tailored, non-fabricated improvements. No re-upload needed.
        </p>
      </header>

      <ResumeAiClient resumeVersions={resumeVersions} jobs={jobs} />
    </div>
  );
}
