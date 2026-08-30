import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Interview Coach — CareerFlow AI" };

export default function InterviewPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-lg font-semibold text-on-background">Interview Coach</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Setup → Live → Results. Full immersive session ships in Phase 5.</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <Card className="lg:col-span-8 p-6">
          <h3 className="text-headline-sm font-semibold mb-2">Start a new session</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Pick a Job from your shared jobs list — no need to re-paste.</p>
          <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
            <p className="text-body-sm text-on-surface-variant">Job picker + session settings (type, difficulty, 10Q) — Phase 5a</p>
          </div>
          <Button disabled className="mt-4">Start Interview</Button>
        </Card>
        <Card className="lg:col-span-4 p-6">
          <h4 className="text-label-md font-semibold mb-2">Recent sessions</h4>
          <p className="text-body-sm text-on-surface-variant">No sessions yet. Your feedback bento will appear here after Phase 5.</p>
        </Card>
      </div>
    </div>
  );
}
