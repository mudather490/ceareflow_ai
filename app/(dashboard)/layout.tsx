import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SideNavBar } from "@/components/nav/SideNavBar";
import { TopNavBar } from "@/components/nav/TopNavBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards, but double-check for direct server rendering
  if (!user) {
    redirect("/login");
  }

  // Check public.users table first for updated profile display name
  const { data: dbUser } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName =
    dbUser?.display_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Candidate";

  const avatarUrl = dbUser?.avatar_url || (user.user_metadata?.avatar_url as string | undefined);

  return (
    <div className="min-h-screen bg-background">
      <SideNavBar user={{ name: displayName, avatarUrl }} />
      <TopNavBar user={{ name: displayName, avatarUrl }} />
      {/* Mobile top bar offset */}
      <div className="lg:ml-64">
        <div className="h-16 lg:hidden" aria-hidden />
        <main className="max-w-container-max mx-auto px-4 md:px-gutter py-md lg:py-lg">
          {children}
        </main>
      </div>
    </div>
  );
}
