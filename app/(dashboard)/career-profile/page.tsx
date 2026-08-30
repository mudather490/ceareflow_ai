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
  if (user) {
    profile = await CareerProfileService.getProfileByUserId(user.id);
  }

  return <CareerProfileClient initialProfile={profile} />;
}
