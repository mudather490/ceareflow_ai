"use client";

import { useEffect } from "react";

type Props = { slug: string };

export function ViewBeacon({ slug }: Props) {
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referer: typeof document !== "undefined" ? document.referrer : "" }),
      cache: "no-store",
      keepalive: true,
    }).catch(() => {});

    const timeout = window.setTimeout(() => {
      const video = document.querySelector<HTMLVideoElement>('video[data-testid="public-video"]');
      if (!video) return;
      const onPlay = () => {
        let fired = false;
        const onTimeUpdate = () => {
          if (!fired && video.currentTime >= 3) {
            fired = true;
            fetch(`/api/public/${encodeURIComponent(slug)}/video-play`, { method: "POST", keepalive: true }).catch(() => {});
            video.removeEventListener("timeupdate", onTimeUpdate);
          }
        };
        video.addEventListener("timeupdate", onTimeUpdate);
      };
      video.addEventListener("play", onPlay, { once: true });
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [slug]);

  return null;
}

export function trackResumeDownload(slug: string) {
  fetch(`/api/public/${encodeURIComponent(slug)}/resume-download`, { method: "POST", keepalive: true }).catch(() => {});
}
