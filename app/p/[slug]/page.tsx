import { notFound } from "next/navigation";
import { RecruiterNav } from "@/components/nav/RecruiterNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoResumeService } from "@/lib/services/videoResumeService";
import { ViewBeacon } from "@/components/public-profile/ViewBeacon";
import { ResumeDownloadButton } from "@/components/public-profile/ResumeDownloadButton";
import { CopyLinkButton } from "@/components/public-profile/CopyLinkButton";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const profile = await VideoResumeService.getPublicProfileBySlug(params.slug);
  if (!profile) return { title: "Profile not found — CareerFlow AI" };
  return { title: `${profile.name} — ${profile.title || "Professional"} — CareerFlow AI` };
}

function isSafeHttpUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export default async function PublicProfilePage({ params }: { params: { slug: string } }) {
  const profile = await VideoResumeService.getPublicProfileBySlug(params.slug);

  if (!profile) {
    // Intentionally minimal 404 — no leakage whether unpublished vs nonexistent
    notFound();
  }

  const hasVideo = !!profile.videoUrl;
  const hasLinkedin = isSafeHttpUrl(profile.linkedinUrl);
  const safeLinkedinUrl = hasLinkedin ? profile.linkedinUrl! : null;
  const safePortfolioUrl = isSafeHttpUrl(profile.portfolioUrl) ? profile.portfolioUrl : null;
  const displayName = profile.name || "Candidate";
  const title = profile.title || "Professional";

  return (
    <div className="min-h-screen bg-background pb-xl">
      <ViewBeacon slug={params.slug} />
      <RecruiterNav />
      <main className="pt-24 max-w-4xl mx-auto px-4 md:px-gutter lg:px-lg flex flex-col gap-lg">
        {/* Centered header — ADR-004 */}
        <header className="flex flex-col items-center text-center mt-8 mb-4">
          <h1 className="text-display font-bold text-on-surface">{displayName}</h1>
          <p className="text-headline-sm font-semibold text-secondary mb-8">{title}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {hasVideo ? (
              <a href={profile.videoUrl!} target="_blank" rel="noopener noreferrer">
                <Button className="bg-primary-container text-on-primary-container py-3 px-6 rounded-lg text-label-md font-bold hover:bg-primary hover:text-on-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">play_circle</span> Play Introduction Video
                </Button>
              </a>
            ) : (
              <Button disabled className="py-3 px-6 rounded-lg text-label-md font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">videocam_off</span> Video coming soon
              </Button>
            )}
            {profile.resumeUrl ? (
              <ResumeDownloadButton slug={params.slug} resumeUrl={profile.resumeUrl} />
            ) : (
              <Button variant="outline" disabled className="py-3 px-6 rounded-lg text-label-md flex items-center gap-2">
                <span className="material-symbols-outlined">description</span> Resume unavailable
              </Button>
            )}
            {hasLinkedin && safeLinkedinUrl && (
              <a href={safeLinkedinUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border border-outline-variant bg-surface-container-lowest text-on-surface py-3 px-6 rounded-lg text-label-md hover:bg-surface-container flex items-center gap-2 shadow-sm">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg> LinkedIn Profile
                </Button>
              </a>
            )}
            {safePortfolioUrl && (
              <a href={safePortfolioUrl} target="_blank" rel="noopener noreferrer" className="border border-outline-variant bg-surface-container-lowest text-on-surface py-3 px-6 rounded-lg text-label-md hover:bg-surface-container flex items-center gap-2 shadow-sm inline-flex">
                <span className="material-symbols-outlined text-[18px]">language</span> Portfolio
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6 text-label-sm text-on-surface-variant">
            {profile.location && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">location_on</span> {profile.location}
              </span>
            )}
            {profile.contactEmail && (
              <a href={`mailto:${profile.contactEmail}?subject=${encodeURIComponent("[CareerFlow] via your public profile")}`} className="flex items-center gap-1 hover:underline">
                <span className="material-symbols-outlined text-[16px]">mail</span> {profile.contactEmail}
              </a>
            )}
          </div>
        </header>

        {/* Hero video — aspect-video, inline playback, ADR-004 */}
        <Card className="overflow-hidden p-0 bg-black">
          <div className="relative aspect-video w-full overflow-hidden">
            {hasVideo ? (
              <video
                src={profile.videoUrl!}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
                data-testid="public-video"
                poster=""
              >
                Your browser does not support video. <a href={profile.videoUrl!}>Download video</a>
              </video>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-neutral-900 text-white p-8 text-center">
                <span className="material-symbols-outlined text-5xl opacity-60">videocam_off</span>
                <p className="text-body-sm opacity-80">The candidate hasn&apos;t published an introduction video yet.</p>
              </div>
            )}
            {/* Subtle gradient for hero polish when video present */}
            {hasVideo && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />}
          </div>
          <div className="px-4 py-2 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>Video is private — signed URL (300s TTL), not a public bucket object.</span>
            {hasVideo && <CopyLinkButton />}
          </div>
        </Card>

        {/* Single white resume card — Experience / Education / Skills & Tools */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8 md:p-12 flex flex-col gap-12">
          <section>
            <h2 className="text-headline-sm font-semibold text-on-surface mb-6 border-b border-outline-variant pb-2">Professional Experience</h2>
            {profile.experiences.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No experience listed.</p>
            ) : (
              <div className="space-y-8">
                {profile.experiences.map((exp, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                      <h3 className="text-headline-md font-semibold text-on-surface">{exp.title}</h3>
                      <span className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                        {exp.startDate ? new Date(exp.startDate).getFullYear() : "?"} — {exp.isCurrent ? "Present" : exp.endDate ? new Date(exp.endDate).getFullYear() : "?"}
                      </span>
                    </div>
                    <h4 className="text-label-md font-medium text-secondary mb-3">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</h4>
                    {exp.bullets.length > 0 ? (
                      <ul className="list-disc list-inside text-body-sm text-on-surface-variant space-y-1">
                        {exp.bullets.map((b, i) => (
                          <li key={i}>{b.text}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-body-sm text-on-surface-variant">No details provided.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-headline-sm font-semibold text-on-surface mb-6 border-b border-outline-variant pb-2">Education</h2>
            {profile.education.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No education listed.</p>
            ) : (
              <div className="space-y-6">
                {profile.education.map((edu, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                      <h3 className="text-headline-md font-semibold text-on-surface">{edu.degree}{edu.field ? ` · ${edu.field}` : ""}</h3>
                      <span className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                        {edu.startDate ? new Date(edu.startDate).getFullYear() : "?"} — {edu.isCurrent ? "Present" : edu.endDate ? new Date(edu.endDate).getFullYear() : "?"}
                      </span>
                    </div>
                    <h4 className="text-label-md text-on-surface-variant mb-1">{edu.institution}</h4>
                    {edu.description && <p className="text-body-sm text-on-surface-variant">{edu.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-headline-sm font-semibold text-on-surface mb-6 border-b border-outline-variant pb-2">Skills & Tools</h2>
            {profile.skills.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No skills listed.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {profile.skills.map((s) => (
                  <span key={s.name} className="bg-surface-container text-on-surface px-4 py-2 rounded-lg text-body-sm border border-outline-variant/30">
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </section>

          {profile.summary && (
            <section>
              <h2 className="text-headline-sm font-semibold text-on-surface mb-6 border-b border-outline-variant pb-2">About</h2>
              <p className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">{profile.summary}</p>
            </section>
          )}
        </div>

        {/* No analytics, no JD, no match dashboard — ADR-004 */}
      </main>
    </div>
  );
}
