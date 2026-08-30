import Link from "next/link";

export function RecruiterNav() {
  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-gutter h-16 bg-surface border-b border-outline-variant">
      <Link href="/" className="text-headline-md font-bold text-primary">
        CareerFlow AI
      </Link>
      <div className="flex items-center gap-3">
        <button className="bg-secondary-container text-on-secondary-container text-label-md font-semibold px-4 py-2 rounded-lg hover:bg-secondary hover:text-on-secondary transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
          Save Profile
        </button>
        <button className="border border-outline-variant text-on-surface-variant px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-label-md font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">share</span>
          Share
        </button>
      </div>
    </nav>
  );
}
