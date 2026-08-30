"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavKey =
  | "dashboard"
  | "careerProfile"
  | "videoResume"
  | "interview"
  | "resumeAi"
  | "applications"
  | "analytics"
  | "settings";

const navItems: { key: NavKey; label: string; href: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { key: "careerProfile", label: "Career Profile", href: "/career-profile", icon: "person_book" },
  { key: "videoResume", label: "Video Resume", href: "/video-resume", icon: "video_camera_front" },
  { key: "interview", label: "Interview Coach", href: "/interview", icon: "psychology" },
  { key: "resumeAi", label: "Resume AI", href: "/resume-ai", icon: "description" },
  { key: "applications", label: "My Applications", href: "/applications", icon: "work_history" },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: "analytics" },
];

function getActiveKey(pathname: string): NavKey | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/career-profile")) return "careerProfile";
  if (pathname.startsWith("/video-resume")) return "videoResume";
  if (pathname.startsWith("/interview")) return "interview";
  if (pathname.startsWith("/resume-ai")) return "resumeAi";
  if (pathname.startsWith("/applications")) return "applications";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

export function SideNavBar({
  user,
  active,
}: {
  user?: { name: string; avatarUrl?: string };
  active?: NavKey;
}) {
  const pathname = usePathname();
  const current = active ?? getActiveKey(pathname ?? "");

  return (
    <nav className="hidden lg:flex flex-col h-screen fixed left-0 top-0 pt-lg pb-md px-sm border-r border-outline-variant bg-surface-container-lowest w-64 z-40">
      {/* Brand Header */}
      <div className="mb-xl flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary shrink-0">
          <span className="material-symbols-outlined fill">psychology</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-headline-sm font-black text-primary leading-none tracking-tight">
            CareerFlow AI
          </h1>
          <p className="text-label-sm text-on-surface-variant mt-0.5 flex items-center gap-1.5">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : null}
            Active Career Profile
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = current === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-label-md transition-all duration-200 group",
                isActive
                  ? "bg-secondary-container text-on-secondary-container font-bold scale-[0.98]"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[20px]",
                  isActive && "fill"
                )}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-label-md transition-all duration-200 mt-auto group",
            current === "settings"
              ? "bg-secondary-container text-on-secondary-container font-bold scale-[0.98]"
              : "text-on-surface-variant hover:bg-surface-container-high"
          )}
        >
          <span className={cn("material-symbols-outlined", current === "settings" && "fill")}>
            settings
          </span>
          <span>Settings</span>
        </Link>
      </div>

      {/* CTA */}
      <div className="mt-4 px-2">
        <Link
          href="/applications"
          className="w-full bg-primary text-on-primary py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-surface-tint transition-colors text-label-md font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Application
        </Link>
      </div>
    </nav>
  );
}
