"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import type { ScriptDTO, MatchDTO, PublicProfileDTO } from "@/lib/types";

type Props = {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  initialScript: ScriptDTO;
  initialMatch: MatchDTO | null;
  existingPublicProfile: PublicProfileDTO | null;
};

function ScriptSectionCard({
  title,
  content,
  onChange,
}: {
  title: string;
  content: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  useEffect(() => setDraft(content), [content]);
  const isPlaceholder = content.includes("[NEEDS_USER");

  return (
    <Card className={`p-4 space-y-2 ${isPlaceholder ? "border-amber-300 bg-amber-50/50" : ""}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-label-md font-bold text-primary uppercase tracking-wider">{title}</h4>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-label-sm text-secondary hover:underline"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>
      {isPlaceholder && (
        <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-label-sm text-amber-800">
          <span className="font-semibold">Tell us more:</span> {content.match(/\[NEEDS_USER:([^\]]+)\]/)?.[1] || "Please add missing detail"}
        </div>
      )}
      {editing ? (
        <div className="space-y-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} />
          <Button
            size="sm"
            onClick={() => {
              onChange(draft);
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      ) : (
        <p className="text-body-sm text-on-surface leading-relaxed whitespace-pre-wrap">{content}</p>
      )}
    </Card>
  );
}

export default function ScriptAndRecorderClient({ jobId, jobTitle, jobCompany, initialScript, initialMatch, existingPublicProfile }: Props) {
  const router = useRouter();
  const [script, setScript] = useState<ScriptDTO>(initialScript);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const { state, error: recorderError, duration, stream, recordedBlob, previewUrl, startPreview, startRecording, stopRecording, retake } = useMediaRecorder(180);

  // Attach stream to video element for preview
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Auto-preview on mount
  useEffect(() => {
    if (state === "idle") startPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScriptVariant = async (mode: "regenerate" | "shorten" | "natural") => {
    setIsGenerating(true);
    setError(null);
    try {
      const apiMode = mode === "regenerate" ? "regenerate" : mode;
      // Use POST for variant to align with service
      const postRes = await fetch("/api/video-resume/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, mode: apiMode }),
      });
      const result = await postRes.json();
      if (!postRes.ok || result.error) throw new Error(result.error?.message || "Failed to generate script");
      setScript(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Script generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCustomScript = async () => {
    setIsSavingScript(true);
    setError(null);
    try {
      const res = await fetch("/api/video-resume/script", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          opening: script.opening,
          experience: script.experience,
          skills: script.skills,
          closing: script.closing,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error?.message || "Failed to save script");
      setScript(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save script");
    } finally {
      setIsSavingScript(false);
    }
  };

  const handleUploadVideo = async () => {
    if (!recordedBlob) return;
    setUploadState("uploading");
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("jobId", jobId);
      form.append("file", recordedBlob, "video.webm");
      form.append("durationSec", String(duration));

      const res = await fetch("/api/video-resume/video", {
        method: "POST",
        body: form,
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error?.message || "Upload failed");

      setUploadState("success");
      // Navigate to publish page for this job
      router.push(`/video-resume/publish/${jobId}`);
      router.refresh();
    } catch (e) {
      setUploadState("error");
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const updateSection = (key: keyof Pick<ScriptDTO, "opening" | "experience" | "skills" | "closing">, value: string) => {
    setScript((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Script */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="p-4 flex items-center justify-between sticky top-0 z-10 bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">description</span>
            <h3 className="text-headline-sm font-semibold">AI Script</h3>
            <span className="ml-2 bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-label-sm font-semibold">Generated</span>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => handleScriptVariant("regenerate")} disabled={isGenerating}>
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </Button>
          </div>
        </Card>

        {error && <ErrorAlert message={error} />}

        <div className="space-y-3">
          <ScriptSectionCard title="Opening" content={script.opening} onChange={(v) => updateSection("opening", v)} />
          <ScriptSectionCard title="Experience" content={script.experience} onChange={(v) => updateSection("experience", v)} />
          <ScriptSectionCard title="Skills" content={script.skills} onChange={(v) => updateSection("skills", v)} />
          <ScriptSectionCard title="Closing" content={script.closing} onChange={(v) => updateSection("closing", v)} />
        </div>

        <div className="p-4 bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant space-y-3">
          <p className="text-label-sm text-on-surface-variant italic text-center">Personalized from your Career Profile and job match. Edit to make it yours.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => handleScriptVariant("shorten")} disabled={isGenerating}>
              {isGenerating ? "Working..." : "Shorten"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => handleScriptVariant("natural")} disabled={isGenerating}>
              {isGenerating ? "Working..." : "More natural"}
            </Button>
          </div>
          <Button className="w-full" onClick={handleSaveCustomScript} disabled={isSavingScript}>
            {isSavingScript ? "Saving..." : "Save Script"}
          </Button>
          <p className="text-label-sm text-on-surface-variant text-center">{script.wordCount} words · ~{Math.ceil(script.wordCount / 2.2)}s spoken</p>
        </div>

        {initialMatch && (
          <Card className="p-4 bg-amber-50/60 border-amber-200">
            <h4 className="text-label-sm font-bold text-amber-800 mb-2">Talking points for this role</h4>
            <ul className="list-disc list-inside text-body-sm text-amber-900 space-y-1">
              {initialMatch.talkingPoints.map((tp, i) => (
                <li key={i}>{tp}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Right: Recorder */}
      <div className="lg:col-span-7">
        <Card className="overflow-hidden p-0 bg-neutral-900 border-neutral-800">
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
            {/* Video preview / stream */}
            {state === "recorded" && previewUrl ? (
              <video src={previewUrl} controls className="w-full h-full object-cover" data-testid="preview-video" />
            ) : (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" data-testid="live-video" />
            )}

            {/* Overlays */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
              <div className="flex items-center gap-2 bg-black/60 text-white px-3 py-1.5 rounded-full text-label-sm">
                <span className={`w-2 h-2 rounded-full ${state === "recording" ? "bg-red-500 animate-pulse" : "bg-white/50"}`} />
                {String(Math.floor(duration / 60)).padStart(2, "0")}:{String(duration % 60).padStart(2, "0")} / 3:00
              </div>
              <span className="text-white/80 text-label-sm hidden md:block">Target: {jobTitle} at {jobCompany}</span>
            </div>

            {/* Center placeholder when idle/error */}
            {(state === "idle" || state === "requesting") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
                <span className="material-symbols-outlined text-white text-4xl animate-pulse">videocam</span>
                <p className="text-white text-body-sm">Requesting camera...</p>
              </div>
            )}

            {recorderError && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center gap-3">
                <span className="material-symbols-outlined text-amber-400 text-4xl">videocam_off</span>
                <p className="text-white text-body-sm max-w-sm">{recorderError}</p>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={startPreview}>Try again</Button>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="video/webm,video/mp4"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        // Convert uploaded file to preview blob path via the same upload flow
                        // Reuse recordedBlob pipeline by creating object URL
                        const buf = await f.arrayBuffer();
                        const blob = new Blob([buf], { type: f.type });
                        // Store as recordedBlob via retake path hack: set via direct state is not exposed,
                        // so we upload directly without recorder
                        const form = new FormData();
                        form.append("jobId", jobId);
                        form.append("file", blob, f.name);
                        setUploadState("uploading");
                        try {
                          const res = await fetch("/api/video-resume/video", { method: "POST", body: form });
                          const result = await res.json();
                          if (!res.ok || result.error) throw new Error(result.error?.message || "Upload failed");
                          setUploadState("success");
                          router.push(`/video-resume/publish/${jobId}`);
                        } catch (err) {
                          setUploadState("error");
                          setUploadError(err instanceof Error ? err.message : "Upload failed");
                        }
                      }}
                    />
                    <span className="inline-flex items-center justify-center rounded-lg border border-white text-white px-4 py-2 text-label-sm hover:bg-white/10">
                      Upload video
                    </span>
                  </label>
                </div>
                <p className="text-white/60 text-label-sm">Or upload a pre-recorded WebM/MP4 (max 100 MB)</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 bg-neutral-900 flex flex-col gap-3">
            <div className="flex items-center justify-center gap-3">
              {state === "recording" ? (
                <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 gap-2">
                  <span className="w-3 h-3 rounded-sm bg-white" /> Stop
                </Button>
              ) : state === "recorded" ? (
                <>
                  <Button variant="outline" onClick={retake} className="bg-white text-black hover:bg-white/90">
                    Retake
                  </Button>
                  <Button onClick={handleUploadVideo} disabled={uploadState === "uploading"} className="bg-secondary text-white hover:bg-secondary/90 gap-2">
                    {uploadState === "uploading" ? "Saving..." : "Save & Continue"}
                  </Button>
                </>
              ) : (
                <Button onClick={startRecording} disabled={state !== "ready"} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 gap-2">
                  <span className="material-symbols-outlined">fiber_manual_record</span> Record
                </Button>
              )}
            </div>

            {state === "ready" && (
              <p className="text-center text-label-sm text-white/60">Camera ready — press Record. Teleprompter: read the script on the left while recording.</p>
            )}
            {state === "recorded" && <p className="text-center text-label-sm text-white/60">Preview your pitch above. Retake if needed, or Save to publish.</p>}

            {uploadError && <div className="text-center text-label-sm text-red-300">{uploadError}</div>}
            {uploadState === "success" && <p className="text-center text-label-sm text-green-300">Video saved — redirecting to publish...</p>}

            {/* Upload fallback always visible */}
            {state !== "error" && state !== "recording" && state !== "recorded" && (
              <label className="flex justify-center">
                <input
                  type="file"
                  accept="video/webm,video/mp4"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const buf = await f.arrayBuffer();
                    const blob = new Blob([buf], { type: f.type });
                    const form = new FormData();
                    form.append("jobId", jobId);
                    form.append("file", blob, f.name);
                    setUploadState("uploading");
                    setUploadError(null);
                    try {
                      const res = await fetch("/api/video-resume/video", { method: "POST", body: form });
                      const result = await res.json();
                      if (!res.ok || result.error) throw new Error(result.error?.message || "Upload failed");
                      setUploadState("success");
                      router.push(`/video-resume/publish/${jobId}`);
                    } catch (err) {
                      setUploadState("error");
                      setUploadError(err instanceof Error ? err.message : "Upload failed");
                    }
                  }}
                />
                <span className="text-label-sm text-white/70 hover:text-white underline cursor-pointer">Or upload a video file (WebM/MP4, ≤100 MB)</span>
              </label>
            )}
          </div>
        </Card>

        {existingPublicProfile && (
          <Card className="mt-4 p-4 flex items-center justify-between">
            <div>
              <p className="text-label-md font-semibold">Existing draft: {existingPublicProfile.slug}</p>
              <p className="text-label-sm text-on-surface-variant">{existingPublicProfile.isPublished ? "Published" : "Draft"} · {new Date(existingPublicProfile.updatedAt).toLocaleString()}</p>
            </div>
            <a href={`/video-resume/publish/${jobId}`}>
              <Button variant="outline" size="sm">Go to Publish</Button>
            </a>
          </Card>
        )}
      </div>
    </div>
  );
}
