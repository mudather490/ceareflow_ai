import { createClient } from "@/lib/supabase/server";
import { CareerProfileService } from "@/lib/services/careerProfileService";
import { CareerProfileClient } from "./CareerProfileClient";

export const metadata = { title: "Career Profile — CareerFlow AI" };

export default async function CareerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let resumeVersions: Awaited<ReturnType<typeof CareerProfileService.listResumeVersions>> = [];
  if (user) {
    [profile, resumeVersions] = await Promise.all([
      CareerProfileService.getProfileByUserId(user.id),
      CareerProfileService.listResumeVersions(user.id),
    ]);
  }

  return <CareerProfileClient initialProfile={profile} initialResumeVersions={resumeVersions} />;
}
