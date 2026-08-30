import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Resume AI — CareerFlow AI" };

export default function ResumeAiPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-lg font-semibold text-on-background">Resume AI</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Analyze → Editor → Apply. Suggestions are evidence-based — no fabricated metrics.</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <Card className="lg:col-span-8 p-6">
          <h3 className="text-headline-sm font-semibold mb-2">Analyze your resume</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Choose a version and an optional job for targeted improvements.</p>
          <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
            <p className="text-body-sm text-on-surface-variant">Analyzer + two-pane diff editor ships in Phase 6</p>
          </div>
          <Button disabled className="mt-4">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span> Analyze
          </Button>
        </Card>
        <Card className="lg:col-span-4 p-6 bg-secondary-container/10 border-secondary/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-secondary">shield</span>
            <h4 className="text-label-md font-semibold text-on-surface">Non-fabrication guarantee</h4>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Missing evidence produces <span className="px-1.5 py-0.5 rounded border border-dashed border-amber-500 bg-amber-50 text-amber-800 text-label-sm">[NEEDS_USER: …]</span> placeholders, never hallucinated numbers.
          </p>
        </Card>
      </div>
    </div>
  );
}
