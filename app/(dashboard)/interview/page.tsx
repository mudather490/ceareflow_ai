import { createClient } from "@/lib/supabase/server";
import { CareerProfileService } from "@/lib/services/careerProfileService";
import { JobService } from "@/lib/services/jobService";
import { InterviewService } from "@/lib/services/interviewService";
import { InterviewSetupClient } from "@/components/interview/InterviewSetupClient";

export const metadata = { title: "Interview Coach — CareerFlow AI" };

export default async function InterviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profile, jobs, sessions] = await Promise.all([
    CareerProfileService.getProfileByUserId(user.id),
    JobService.listJobs(user.id),
    InterviewService.listSessions(user.id),
  ]);

  const hasProfile = !!profile && profile.experiences.length > 0;

  return (
    <div className="space-y-6">
      <header className="pb-4 border-b border-outline-variant">
        <h1 className="text-headline-lg font-semibold text-on-background">Interview Coach</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Prepare for a specific job using your Career Profile and selected Job — no resume re-upload required.
        </p>
      </header>

      <InterviewSetupClient
        jobs={jobs}
        sessions={sessions}
        hasProfile={hasProfile}
        completionScore={profile?.completionScore}
      />
    </div>
  );
}
