"use client";

import { Button } from "@/components/ui/button";
import { trackResumeDownload } from "./ViewBeacon";

type Props = { slug: string; resumeUrl: string };

export function ResumeDownloadButton({ slug, resumeUrl }: Props) {
  const handleClick = () => {
    trackResumeDownload(slug);
  };
  return (
    <a href={resumeUrl} target="_blank" rel="noopener noreferrer" download onClick={handleClick}>
      <Button
        variant="outline"
        className="border border-outline-variant bg-surface-container-lowest text-on-surface py-3 px-6 rounded-lg text-label-md hover:bg-surface-container flex items-center gap-2 shadow-sm"
      >
        <span className="material-symbols-outlined">download</span> Download CV
      </Button>
    </a>
  );
}
