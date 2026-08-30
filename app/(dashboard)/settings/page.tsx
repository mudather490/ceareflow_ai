import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Settings — CareerFlow AI" };

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-headline-lg font-semibold">Settings</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Manage account, privacy, and storage preferences.</p>
      </header>

      <Card className="p-6">
        <h3 className="text-headline-sm font-semibold mb-1">Account</h3>
        <p className="text-body-sm text-on-surface-variant mb-4">Signed in via Supabase Auth (PKCE + Google OAuth).</p>
        <form action="/auth/signout" method="post">
          <Button variant="outline" type="submit">
            <span className="material-symbols-outlined text-[18px]">logout</span> Sign out
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-headline-sm font-semibold mb-1">Storage</h3>
        <p className="text-body-sm text-on-surface-variant">Private buckets: resumes (10 MB), videos (100 MB, 180s), interview-answers. Usage bar ships in Phase 7.</p>
        <div className="w-full bg-surface-container h-2 rounded-full mt-3">
          <div className="bg-secondary h-2 rounded-full" style={{ width: "12%" }} />
        </div>
        <p className="text-label-sm text-on-surface-variant mt-2">12% of soft 500 MB cap used (mock).</p>
      </Card>

      <Card className="p-6 border-error/20">
        <h3 className="text-headline-sm font-semibold text-error mb-1">Danger zone</h3>
        <p className="text-body-sm text-on-surface-variant mb-4">Delete account cascades to profile, videos, and views.</p>
        <Button variant="ghost" disabled className="text-error border border-error/30 hover:bg-error-container">Delete account (Phase 8)</Button>
      </Card>
    </div>
  );
}
