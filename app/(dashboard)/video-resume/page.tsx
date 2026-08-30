import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = { title: "Video Resume — CareerFlow AI" };

export default function VideoResumePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-lg font-semibold text-on-background">Video Resume</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          3-step workflow: Match → Script + Video → Publish. Foundation shell — full workflow lands in Phase 3.
        </p>
      </header>

      {/* Stepper header */}
      <div className="flex items-center gap-2 max-w-3xl mx-auto py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center text-label-sm font-bold">1</div>
          <span className="text-label-md font-medium text-on-surface">Match Job</span>
        </div>
        <div className="flex-1 border-t-2 border-outline-variant mx-2" />
        <div className="flex items-center gap-2 opacity-50">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center text-label-sm">2</div>
          <span className="text-label-md text-on-surface-variant">Script & Video</span>
        </div>
        <div className="flex-1 border-t-2 border-outline-variant mx-2 opacity-50" />
        <div className="flex items-center gap-2 opacity-50">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center text-label-sm">3</div>
          <span className="text-label-md text-on-surface-variant">Publish</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <Card className="lg:col-span-8 p-6">
          <h3 className="text-headline-sm font-semibold mb-2">Match your resume to a job</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Pick a resume version and paste a target job to see alignment.</p>
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
              <p className="text-body-sm text-on-surface-variant">Resume picker + Job form will be built in Phase 3a</p>
              <p className="text-label-sm text-on-surface-variant mt-1">Shell preserves JobService reuse contract — no mock AI score generated here.</p>
            </div>
            <Button disabled>
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span> Match My Resume
            </Button>
          </div>
        </Card>
        <Card className="lg:col-span-4 p-6 bg-surface-container-low">
          <h4 className="text-label-md font-semibold text-on-surface mb-2">What happens next?</h4>
          <ul className="space-y-2 text-body-sm text-on-surface-variant">
            <li className="flex gap-2"><span className="text-secondary">•</span> Score shown as alignment indicator</li>
            <li className="flex gap-2"><span className="text-secondary">•</span> Talking points for your video</li>
            <li className="flex gap-2"><span className="text-secondary">•</span> Then generate script without fabrication</li>
          </ul>
          <Link href="/dashboard" className="inline-flex mt-4 text-label-md font-medium text-secondary hover:underline">Back to dashboard</Link>
        </Card>
      </div>
    </div>
  );
}
