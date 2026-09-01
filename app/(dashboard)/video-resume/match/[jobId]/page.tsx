import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobService } from "@/lib/services/jobService";
import { VideoResumeService } from "@/lib/services/videoResumeService";
import { VideoResumeStepper } from "@/components/video-resume/VideoResumeStepper";
import { MatchScoreRing } from "@/components/video-resume/MatchScoreRing";
import { SkillsBreakdown } from "@/components/video-resume/SkillsBreakdown";
import { TalkingPoints } from "@/components/video-resume/TalkingPoints";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MatchResultPage({ params }: { params: { jobId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = params.jobId;
  const job = await JobService.getJobById(user.id, jobId);
  if (!job) notFound();

  const match = await VideoResumeService.getMatchByJobId(user.id, jobId);
  if (!match) {
    // If match not found yet (rare race), show fallback and trigger client retry
    return (
      <div className="space-y-6">
        <VideoResumeStepper currentStep={1} />
        <Card className="p-8 text-center max-w-xl mx-auto">
          <p className="text-body-md text-on-surface-variant">Match is being generated. Please refresh.</p>
          <Link href="/video-resume" className="mt-4 inline-block">
            <Button variant="outline">Back to Video Resume</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-headline-lg font-semibold text-on-background">AI Match Results</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {job.title} at {job.company}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/video-resume">
            <Button variant="outline">Edit Job</Button>
          </Link>
          <Link href={`/video-resume/script/${job.id}`}>
            <Button className="gap-2">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Create My Introduction
            </Button>
          </Link>
        </div>
      </header>

      <VideoResumeStepper currentStep={1} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Score ring + insight */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-6 flex flex-col items-center">
            <MatchScoreRing score={match.score} />
            <p className="text-body-sm text-on-surface-variant text-center mt-4 max-w-sm">
              {match.score >= 80
                ? "Strong alignment — your profile covers the core requirements."
                : match.score >= 60
                ? "Good alignment — a few transferable gaps to address in your video."
                : "Alignment gaps identified — focus your talking points to bridge them."}
            </p>
          </Card>
          <Card className="p-4 bg-secondary/5 border-secondary/20">
            <div className="flex gap-2 items-start">
              <span className="material-symbols-outlined text-secondary text-[20px]">lightbulb</span>
              <div>
                <p className="text-label-sm font-bold text-secondary">AI Insight</p>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  {match.talkingPoints[0] || "Focus your introduction on transferable strengths and address one gap with adaptability."}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: breakdown + talking points */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6">
            <SkillsBreakdown breakdown={match.breakdown} />
          </Card>
          <Card className="p-6">
            <TalkingPoints talkingPoints={match.talkingPoints} />
          </Card>
        </div>
      </div>
    </div>
  );
}
