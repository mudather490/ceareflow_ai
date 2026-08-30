import { RecruiterNav } from "@/components/nav/RecruiterNav";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Public Profile — CareerFlow AI" };

// Phase 1 stub — real whitelisting + signed URLs land in Phase 3c
export default function PublicProfilePage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  return (
    <div className="min-h-screen bg-background pb-xl">
      <RecruiterNav />
      <main className="pt-24 max-w-4xl mx-auto px-4 md:px-gutter lg:px-lg flex flex-col gap-lg">
        <header className="flex flex-col items-center text-center mt-8 mb-4">
          <h1 className="text-display font-bold text-on-surface">Alex Mercer</h1>
          <p className="text-headline-sm font-semibold text-secondary mb-8">Senior Product Designer</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button className="bg-primary-container text-on-primary-container py-3 px-6 rounded-lg text-label-md font-bold hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined">play_circle</span> Play Introduction Video
            </button>
            <button className="border border-outline-variant bg-surface-container-lowest text-on-surface py-3 px-6 rounded-lg text-label-md hover:bg-surface-container transition-colors flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined">download</span> Download Resume
            </button>
            <button className="border border-outline-variant bg-surface-container-lowest text-on-surface py-3 px-6 rounded-lg text-label-md hover:bg-surface-container transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg> LinkedIn Profile
            </button>
          </div>
          <p className="text-label-sm text-on-surface-variant mt-4">Public slug: <code className="bg-surface-container px-2 py-1 rounded">{slug}</code> — minimal view, no analytics or JD visible</p>
        </header>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8 md:p-12 flex flex-col gap-12">
          <section>
            <h2 className="text-headline-sm font-semibold text-on-surface mb-6 border-b border-outline-variant pb-2">Professional Experience</h2>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                  <h3 className="text-headline-md font-semibold text-on-surface">Senior Product Designer</h3>
                  <span className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-1 rounded">2020 - Present</span>
                </div>
                <h4 className="text-label-md font-medium text-secondary mb-3">TechNova Solutions</h4>
                <p className="text-body-md text-on-surface-variant mb-4">Spearheaded design system overhaul resulting in 25% increase in dev velocity. Mentored juniors and established UX research protocols.</p>
              </div>
              <div>
                <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                  <h3 className="text-headline-md font-semibold text-on-surface">UX/UI Designer</h3>
                  <span className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-1 rounded">2017 - 2020</span>
                </div>
                <h4 className="text-label-md text-on-surface-variant mb-3">CreativeLoop Agency</h4>
                <p className="text-body-md text-on-surface-variant mb-4">Delivered end-to-end design for 15+ B2B clients, focusing on data visualization dashboards.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-headline-sm font-semibold text-on-surface mb-6 border-b border-outline-variant pb-2">Education</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                  <h3 className="text-headline-md font-semibold text-on-surface">M.S. Human-Computer Interaction</h3>
                  <span className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-1 rounded">2015 - 2017</span>
                </div>
                <h4 className="text-label-md text-on-surface-variant mb-3">Carnegie Mellon University</h4>
              </div>
              <div>
                <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                  <h3 className="text-headline-md font-semibold text-on-surface">B.S. Graphic Design</h3>
                  <span className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-1 rounded">2011 - 2015</span>
                </div>
                <h4 className="text-label-md text-on-surface-variant mb-3">Rhode Island School of Design</h4>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-headline-sm font-semibold text-on-surface mb-6 border-b border-outline-variant pb-2">Skills & Tools</h2>
            <div className="flex flex-wrap gap-3">
              {["User Research", "Wireframing", "Interaction Design", "Information Architecture", "Usability Testing", "Figma", "Framer", "Miro", "Principle", "HTML/CSS"].map((skill) => (
                <span key={skill} className="bg-surface-container text-on-surface px-4 py-2 rounded-lg text-body-sm border border-outline-variant/30">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        </div>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-label-sm text-amber-800">
            <span className="font-semibold">Foundation note:</span> This public shell renders with static Alex Mercer data. Phase 3c will wire Supabase whitelisting view + signed URLs (60s resume, 300s video) + view beacon. No private fields are exposed.
          </p>
        </Card>
      </main>
    </div>
  );
}
