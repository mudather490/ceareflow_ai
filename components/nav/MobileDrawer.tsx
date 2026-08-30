"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavKey } from "./SideNavBar";

const navItems: { key: NavKey; label: string; href: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { key: "careerProfile", label: "Career Profile", href: "/career-profile", icon: "person_book" },
  { key: "videoResume", label: "Video Resume", href: "/video-resume", icon: "video_camera_front" },
  { key: "interview", label: "Interview Coach", href: "/interview", icon: "psychology" },
  { key: "resumeAi", label: "Resume AI", href: "/resume-ai", icon: "description" },
  { key: "applications", label: "My Applications", href: "/applications", icon: "work_history" },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: "analytics" },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings" },
];

function getActiveKey(pathname: string): NavKey | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "dashboard";
  if (pathname.startsWith("/career-profile")) return "careerProfile";
  if (pathname.startsWith("/video-resume")) return "videoResume";
  if (pathname.startsWith("/interview")) return "interview";
  if (pathname.startsWith("/resume-ai")) return "resumeAi";
  if (pathname.startsWith("/applications")) return "applications";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

export function MobileDrawer({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: { name: string; avatarUrl?: string };
}) {
  const pathname = usePathname();
  const current = getActiveKey(pathname ?? "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined fill text-[20px]">psychology</span>
            </div>
            <div>
              <SheetTitle className="text-headline-sm font-black text-primary text-left">
                CareerFlow AI
              </SheetTitle>
              <p className="text-label-sm text-on-surface-variant">Active Career Profile</p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-2 mt-3 text-body-sm text-on-surface-variant">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" />
              ) : null}
              <span>{user.name}</span>
            </div>
          )}
        </SheetHeader>

        <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = current === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-label-md transition-colors",
                  isActive
                    ? "bg-secondary-container text-on-secondary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                <span className={cn("material-symbols-outlined", isActive && "fill")}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-outline-variant">
          <Link
            href="/applications"
            onClick={() => onOpenChange(false)}
            className="w-full bg-primary text-on-primary py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-surface-tint transition-colors text-label-md font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Application
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
