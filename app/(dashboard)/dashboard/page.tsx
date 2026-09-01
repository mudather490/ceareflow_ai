import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CareerProfileService } from "@/lib/services/careerProfileService";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Dashboard — CareerFlow AI" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let jobs: { id: string; title: string; company: string; created_at: string }[] = [];
  let resumeAnalyses: { id: string }[] = [];
  let publicProfilesCount = 0;
  let latestInterviewScore: number | null = null;
  let resumeScore: number | null = null;

  if (user) {
    profile = await CareerProfileService.getProfileByUserId(user.id);
    const [jobsRes, analysesRes, profilesRes, feedbackRes] = await Promise.all([
      supabase.from("jobs").select("id,title,company,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("resume_analyses").select("id,category_scores").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
      supabase.from("public_profiles").select("id,is_published").eq("user_id", user.id),
      supabase.from("interview_feedback").select("overall_score").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    ]);
    jobs = (jobsRes.data as typeof jobs) || [];
    resumeAnalyses = (analysesRes.data as typeof resumeAnalyses) || [];
    publicProfilesCount = (profilesRes.data?.length as number) || 0;
    latestInterviewScore = (feedbackRes.data?.[0] as { overall_score: number } | undefined)?.overall_score ?? null;
    const catScores = (analysesRes.data?.[0] as { category_scores: { overall?: number } | null } | undefined)?.category_scores;
    resumeScore = catScores?.overall ?? null;
  }

  const displayName = profile?.displayName || user?.email?.split("@")[0] || "Candidate";
  const completionScore = profile?.completionScore ?? 0;
  const isProfileComplete = completionScore >= 80;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-display font-bold text-primary">Welcome back, {displayName}.</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">Here&apos;s your career momentum for today.</p>
        </div>
        <div className="text-right">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Overall Readiness</p>
          <p className="text-headline-md font-semibold text-secondary">
            {completionScore >= 80 ? "A-" : completionScore >= 50 ? "B" : "Needs Setup"}
          </p>
        </div>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-sm lg:gap-md">
        <Card className="md:col-span-8 p-6 relative overflow-hidden group hover:shadow-level2 transition-shadow">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-surface-container-high/30 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-headline-sm font-semibold text-primary">Career Profile</h3>
                <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-label-sm font-semibold">
                  {isProfileComplete ? "Strong Standing" : "In Progress"}
                </span>
              </div>
              <p className="text-body-md text-on-surface-variant max-w-md">
                {isProfileComplete
                  ? "Your profile is primed and ready. All AI modules are fully synchronized with your experience."
                  : "Complete your Career Profile to unlock tailored video resumes, AI interview coaching, and smart optimizations."}
              </p>
            </div>
            <div className="mt-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-headline-md font-semibold text-primary">
                  {completionScore}% <span className="text-body-md font-normal text-on-surface-variant">complete</span>
                </span>
                <Link
                  href="/career-profile"
                  className="text-secondary text-label-md font-medium hover:underline flex items-center gap-1"
                >
                  {completionScore === 0 ? "Create Profile" : "Complete Profile"}{" "}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2.5">
                <div
                  className="bg-secondary h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionScore}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="md:col-span-4 bg-primary text-on-primary rounded-xl p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <h3 className="text-headline-sm font-semibold mb-6 relative z-10">Quick Actions</h3>
          <div className="flex flex-col gap-3 relative z-10">
            {[
              { icon: "video_camera_front", label: "Create Video Resume", href: "/video-resume" },
              { icon: "mic", label: "Practice Interview", href: "/interview" },
              { icon: "edit_document", label: "Improve Resume", href: "/resume-ai" },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="w-full bg-white/10 hover:bg-white/20 transition-colors py-3 px-4 rounded-lg flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">{a.icon}</span>
                </div>
                <span className="text-label-md font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <Card className="md:col-span-3 p-5 hover:shadow-level2 transition-shadow group">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-on-primary transition-colors">
            <span className="material-symbols-outlined">description</span>
          </div>
          <h4 className="text-label-md text-on-surface-variant mb-1">Resume Optimization</h4>
          {resumeScore !== null ? (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-headline-md font-semibold text-primary">{resumeScore}</span>
                <span className="text-label-sm text-on-surface-variant pb-1">Score</span>
              </div>
              <div className="w-full bg-surface-container h-1 rounded-full mb-3">
                <div className="bg-primary h-1 rounded-full" style={{ width: `${Math.min(100, resumeScore)}%` }} />
              </div>
              <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span> Latest analysis
              </p>
            </>
          ) : (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-headline-md font-semibold text-on-surface-variant">—</span>
                <span className="text-label-sm text-on-surface-variant pb-1">No data</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">Run Resume AI to get your quality score.</p>
              <Link href="/resume-ai" className="text-secondary text-label-sm font-medium hover:underline mt-2 inline-block">Analyze Resume →</Link>
            </>
          )}
        </Card>

        <Card className="md:col-span-3 p-5 hover:shadow-level2 transition-shadow group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            {latestInterviewScore !== null ? (
              <span className="bg-[#e6f4ea] text-[#137333] px-2 py-1 rounded text-[10px] font-bold">{latestInterviewScore}/100</span>
            ) : (
              <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded text-[10px] font-bold">No sessions</span>
            )}
          </div>
          <h4 className="text-label-md text-on-surface-variant mb-1">Interview Coach</h4>
          {latestInterviewScore !== null ? (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-headline-md font-semibold text-primary">{latestInterviewScore}</span>
                <span className="text-label-sm text-on-surface-variant pb-1">Recent Score</span>
              </div>
              <p className="text-label-sm text-on-surface-variant line-clamp-2">
                Latest feedback ready — review your strongest and weakest categories.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-headline-md font-semibold text-on-surface-variant">—</span>
                <span className="text-label-sm text-on-surface-variant pb-1">No sessions</span>
              </div>
              <p className="text-label-sm text-on-surface-variant">Practice with a job to get a scored feedback bento.</p>
              <Link href="/interview" className="text-secondary text-label-sm font-medium hover:underline mt-2 inline-block">Start Interview →</Link>
            </>
          )}
        </Card>

        <Card className="md:col-span-3 p-5 border-secondary/20 bg-[#f0f4ff] hover:shadow-[0_4px_20px_rgba(70,72,212,0.1)] transition-shadow relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] fill">auto_awesome</span>
              </div>
              <span className="text-label-sm font-bold text-secondary uppercase tracking-wider">Resume AI</span>
            </div>
            {resumeAnalyses.length > 0 ? (
              <>
                <h4 className="text-headline-md font-semibold text-primary mb-2">
                  {resumeAnalyses.length} <span className="text-body-md font-normal text-on-surface-variant">Analyses</span>
                </h4>
                <p className="text-body-sm text-on-surface-variant mb-4">
                  Latest analysis available — suggestions are evidence-based and never fabricated.
                </p>
              </>
            ) : (
              <>
                <h4 className="text-headline-md font-semibold text-primary mb-2">
                  — <span className="text-body-md font-normal text-on-surface-variant">Analyses</span>
                </h4>
                <p className="text-body-sm text-on-surface-variant mb-4">No analyses yet. Analyze your resume to get strengths, issues and job alignment.</p>
              </>
            )}
            <Link
              href="/resume-ai"
              className="text-secondary text-label-md font-semibold hover:underline flex items-center gap-1"
            >
              Review Insights <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </Card>

        <Card className="md:col-span-3 p-5 hover:shadow-level2 transition-shadow group">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-on-primary transition-colors">
            <span className="material-symbols-outlined">video_camera_front</span>
          </div>
          <h4 className="text-label-md text-on-surface-variant mb-4">Video Resume</h4>
          {publicProfilesCount > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-12 h-12 rounded bg-surface-container overflow-hidden flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">play_circle</span>
                </div>
                <div>
                  <p className="text-label-sm font-semibold text-primary">{publicProfilesCount} Profile{publicProfilesCount === 1 ? "" : "s"}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#137333]" />
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Active</span>
                  </div>
                </div>
              </div>
              <Link href="/video-resume" className="text-secondary text-label-sm font-medium hover:underline">Manage Video Resumes →</Link>
            </>
          ) : (
            <>
              <p className="text-body-sm text-on-surface-variant mb-3">No video resume yet. Create one from your Career Profile + target job.</p>
              <Link href="/video-resume" className="text-secondary text-label-sm font-medium hover:underline">Create Video Resume →</Link>
            </>
          )}
        </Card>
      </div>

      {/* Recent Applications — real jobs or honest empty */}
      <Card className="overflow-hidden p-0">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-white rounded-t-xl">
          <h3 className="text-headline-sm font-semibold text-primary">Recent Applications</h3>
          <Link href="/applications" className="text-label-md text-secondary hover:underline">
            View All
          </Link>
        </div>
        {jobs.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">work_history</span>
            <p className="text-body-md font-medium">No jobs yet</p>
            <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">Jobs you create in Video Resume, Interview Coach or Resume AI appear here. Each job is shared across modules — no re-upload needed.</p>
            <Link href="/video-resume" className="inline-flex mt-2 text-secondary font-medium hover:underline">Create your first job →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th scope="col" className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Job Title</th>
                  <th scope="col" className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Company</th>
                  <th scope="col" className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Created</th>
                  <th scope="col" className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Status</th>
                  <th scope="col" className="p-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant bg-white">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="p-4">
                      <p className="text-label-md font-semibold text-primary">{job.title}</p>
                      <p className="text-body-sm text-on-surface-variant">Created {new Date(job.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4 text-body-md text-primary">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-[12px] font-bold">{job.company.charAt(0).toUpperCase()}</span> {job.company}
                      </span>
                    </td>
                    <td className="p-4 text-body-sm text-on-surface-variant">{new Date(job.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-outline-variant">Tracked</span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/video-resume`} className="text-secondary text-label-sm hover:underline">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
