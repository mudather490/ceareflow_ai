import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InterviewService } from "@/lib/services/interviewService";
import { InterviewSessionClient } from "@/components/interview/InterviewSessionClient";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: `Interview Session — CareerFlow AI` };
}

export default async function InterviewSessionPage({ params }: { params: { sessionId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessionId = params.sessionId;

  // Validate UUID format early
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <h1 className="text-headline-md font-semibold">Invalid Session</h1>
        <p className="text-body-md text-on-surface-variant">The interview session ID is malformed.</p>
        <a href="/interview" className="text-secondary underline">Back to Interview Coach</a>
      </div>
    );
  }

  const session = await InterviewService.getSessionById(user.id, sessionId);

  if (!session) {
    // Could be not found or not owned — show notFound for IDOR protection (don't leak existence)
    notFound();
  }

  if (session.questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <h1 className="text-headline-md font-semibold">Questions not ready</h1>
        <p className="text-body-md text-on-surface-variant">Question generation failed or is still in progress. Please return to Interview Coach and try again.</p>
        <a href="/interview" className="text-secondary underline">Back to Interview Coach</a>
      </div>
    );
  }

  return <InterviewSessionClient initialSession={session} />;
}
