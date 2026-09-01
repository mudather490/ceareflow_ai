import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobService } from "@/lib/services/jobService";
import { VideoResumeService } from "@/lib/services/videoResumeService";
import { VideoResumeStepper } from "@/components/video-resume/VideoResumeStepper";
import PublishClient from "@/components/video-resume/PublishClient";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PublishPage({ params }: { params: { jobId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = params.jobId;
  const job = await JobService.getJobById(user.id, jobId);
  if (!job) notFound();

  const publicProfile = await VideoResumeService.getPublicProfileByJobId(user.id, jobId);

  if (!publicProfile) {
    return (
      <div className="space-y-6">
        <VideoResumeStepper currentStep={3} />
        <Card className="p-8 text-center max-w-xl mx-auto space-y-3">
          <h2 className="text-headline-sm font-semibold">No draft yet</h2>
          <p className="text-body-sm text-on-surface-variant">Record a video to generate your public profile draft.</p>
          <Link href={`/video-resume/script/${jobId}`}>
            <Button>Go to Script & Record</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Fetch video for preview if exists
  let videoSignedUrl: string | null = null;
  if (publicProfile.videoId) {
    const { data: video } = await supabase.from("videos").select("storage_path").eq("id", publicProfile.videoId).single();
    if (video?.storage_path) {
      try {
        const { createSignedDownloadUrl } = await import("@/lib/storage/signedUrl");
        videoSignedUrl = await createSignedDownloadUrl("videos", video.storage_path, 300, true);
      } catch {
        videoSignedUrl = null;
      }
    }
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const publicUrl = `${origin}/p/${publicProfile.slug}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-headline-lg font-semibold">Publish & Share</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {job.title} at {job.company} — control your recruiter link.
          </p>
        </div>
      </header>

      <VideoResumeStepper currentStep={3} />

      <PublishClient
        jobId={jobId}
        publicProfile={publicProfile}
        publicUrl={publicUrl}
        videoSignedUrl={videoSignedUrl}
      />
    </div>
  );
}
