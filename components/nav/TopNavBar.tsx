"use client";

import Link from "next/link";
import { useState } from "react";
import { MobileDrawer } from "./MobileDrawer";

export function TopNavBar({
  user,
}: {
  user?: { name: string; avatarUrl?: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 h-16 bg-surface-container-lowest border-b border-outline-variant fixed top-0 w-full z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined fill text-sm">psychology</span>
          </div>
          <span className="text-headline-sm font-black text-primary">CareerFlow AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            aria-label="Notifications"
            className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-on-surface-variant p-2">account_circle</span>
          )}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="p-2 rounded-lg hover:bg-surface-container text-primary"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>
      <MobileDrawer open={open} onOpenChange={setOpen} user={user} />
    </>
  );
}
