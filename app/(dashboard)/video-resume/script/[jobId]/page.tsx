import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobService } from "@/lib/services/jobService";
import { VideoResumeService } from "@/lib/services/videoResumeService";
import { VideoResumeStepper } from "@/components/video-resume/VideoResumeStepper";
import ScriptAndRecorderClient from "@/components/video-resume/ScriptAndRecorderClient";

export const dynamic = "force-dynamic";

export default async function ScriptPage({ params }: { params: { jobId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = params.jobId;
  const job = await JobService.getJobById(user.id, jobId);
  if (!job) notFound();

  const match = await VideoResumeService.getMatchByJobId(user.id, jobId);

  // Server: ensure script exists (initial generation if missing)
  const script = await VideoResumeService.getOrCreateScript(user.id, jobId, "initial");

  // Fetch existing draft public profile if any (to know video status)
  const publicProfile = await VideoResumeService.getPublicProfileByJobId(user.id, jobId);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-headline-lg font-semibold text-on-background">Create Your Introduction</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {job.title} at {job.company} — refine your AI script and record your video pitch.
          </p>
        </div>
      </header>

      <VideoResumeStepper currentStep={2} />

      <ScriptAndRecorderClient
        jobId={job.id}
        jobTitle={job.title}
        jobCompany={job.company}
        initialScript={script}
        initialMatch={match}
        existingPublicProfile={publicProfile}
      />
    </div>
  );
}
