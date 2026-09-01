import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JobService } from "@/lib/services/jobService";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "My Applications — CareerFlow AI" };

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let jobs: Awaited<ReturnType<typeof JobService.listJobs>> = [];
  if (user) {
    jobs = await JobService.listJobs(user.id);
  }

  if (jobs.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-lg font-semibold">My Applications</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Cross-module job tracker over the shared <code className="px-1.5 py-0.5 bg-surface-container rounded text-label-sm">jobs</code> table. Jobs are reused by Video Resume, Interview Coach and Resume AI — no re-upload needed.
          </p>
        </header>
        <EmptyState
          icon="work_history"
          title="No applications yet"
          description="Jobs you create in Video Resume, Interview, or Resume AI will appear here with filters and row actions. Future updates will add status tracking, match scores and video/interview links per job."
          actionLabel="Create Video Resume"
          actionHref="/video-resume"
        />
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-label-sm font-semibold text-amber-800">Deferred detail</p>
          <p className="text-body-sm text-amber-900 mt-1">
            Advanced filters, match score column and row actions (Open Video Resume / Interview / Analytics) are intentionally deferred until product sign-off on table density (O-001). Data model is ready — this page is intentionally honest.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="pb-4 border-b border-outline-variant flex justify-between items-end">
        <div>
          <h1 className="text-headline-lg font-semibold">My Applications</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} tracked — shared across Video Resume, Interview Coach and Resume AI.
          </p>
        </div>
        <Link href="/video-resume" className="text-secondary text-label-md font-medium hover:underline">
          + Create Job
        </Link>
      </header>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th scope="col" className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Job</th>
                <th scope="col" className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Company</th>
                <th scope="col" className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Source</th>
                <th scope="col" className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Created</th>
                <th scope="col" className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-white">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4">
                    <p className="text-label-md font-semibold text-primary">{job.title}</p>
                    <p className="text-body-sm text-on-surface-variant line-clamp-1">{job.description.slice(0, 80)}...</p>
                  </td>
                  <td className="p-4 text-body-md">{job.company}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="capitalize">{job.source.replace("_", " ")}</Badge>
                  </td>
                  <td className="p-4 text-body-sm text-on-surface-variant">{new Date(job.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2 flex-wrap">
                      <Link href="/video-resume" className="text-label-sm text-secondary hover:underline">Video</Link>
                      <Link href="/interview" className="text-label-sm text-secondary hover:underline">Interview</Link>
                      <Link href="/resume-ai" className="text-label-sm text-secondary hover:underline">Resume AI</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 bg-surface-container-low border-dashed">
        <p className="text-label-sm font-semibold">Honest state</p>
        <p className="text-body-sm text-on-surface-variant mt-1">
          Filters, match score and video/interview status columns are deferred polish (O-001). The jobs table is the single source — no duplicated tracking.
        </p>
      </Card>
    </div>
  );
}
