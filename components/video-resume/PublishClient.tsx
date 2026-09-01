"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PublicProfileDTO } from "@/lib/types";

type Props = {
  jobId: string;
  publicProfile: PublicProfileDTO;
  publicUrl: string;
  videoSignedUrl: string | null;
};

export default function PublishClient({ publicProfile: initial, publicUrl, videoSignedUrl }: Props) {
  const [profile, setProfile] = useState(initial);
  const [isToggling, setIsToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePublish = async () => {
    setIsToggling(true);
    setError(null);
    try {
      const res = await fetch(`/api/public-profile/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !profile.isPublished }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error?.message || "Failed to update");
      setProfile(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setIsToggling(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("input");
      el.value = publicUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-4">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-headline-sm font-semibold">Share your recruiter link</h3>
              <p className="text-body-sm text-on-surface-variant">Slug is immutable — you can change publish state anytime.</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${profile.isPublished ? "bg-[#e6f4ea] text-[#137333] border border-[#ceead6]" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>
              {profile.isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-body-sm font-mono truncate">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">link</span>
              <span className="truncate">{publicUrl}</span>
            </div>
            <Button onClick={copyLink} variant="outline" className="shrink-0">
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>

          {error && <p className="text-label-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={togglePublish} disabled={isToggling} className={profile.isPublished ? "bg-amber-600 hover:bg-amber-700" : "bg-secondary hover:bg-secondary/90"}>
              {isToggling ? "Updating..." : profile.isPublished ? "Unpublish" : "Publish now"}
            </Button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
              <Button variant="outline" className="gap-2">
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                {profile.isPublished ? "Open public page" : "Preview (owner)"}
              </Button>
            </a>
          </div>

          <p className="text-label-sm text-on-surface-variant">
            {profile.isPublished ? "Public page returns 200 for recruiters. Unpublishing makes it 404 within seconds." : "Draft profiles return 404 to the public. Publish to make it discoverable at the slug above."}
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="text-label-md font-semibold mb-2">What the recruiter sees</h4>
          <ul className="text-body-sm text-on-surface-variant list-disc list-inside space-y-1">
            <li>Your name + professional title (centered)</li>
            <li>Your introduction video (prominent play hero)</li>
            <li>Single resume card — Experience, Education, Skills & Tools (no score, no JD, no private data)</li>
            <li>Actions: Play, Download CV, LinkedIn (if linked), Copy link</li>
          </ul>
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-4">
        <Card className="overflow-hidden p-0">
          <div className="aspect-video bg-black relative flex items-center justify-center">
            {videoSignedUrl ? (
              <video src={videoSignedUrl} controls className="w-full h-full object-cover" data-testid="published-video" />
            ) : (
              <div className="text-center p-8">
                <span className="material-symbols-outlined text-white/60 text-5xl">videocam_off</span>
                <p className="text-white/80 text-body-sm mt-2">No video yet — record on the previous step.</p>
              </div>
            )}
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant">Preview uses owner-signed URL (300s TTL)</span>
            {videoSignedUrl && (
              <a href={videoSignedUrl} target="_blank" rel="noopener noreferrer" className="text-label-sm text-secondary hover:underline">
                Open raw video
              </a>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-surface-container-low border-dashed">
          <p className="text-label-sm font-semibold text-secondary">Owner analytics</p>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Views, plays and resume downloads for <code className="bg-white px-1 py-0.5 rounded border">/{profile.slug}</code> appear in <a href="/analytics" className="text-secondary hover:underline">Analytics</a> (daily IP-hash dedup, privacy-safe, no raw IP).
          </p>
        </Card>
      </div>
    </div>
  );
}
