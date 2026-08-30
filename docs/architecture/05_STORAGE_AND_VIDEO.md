# Storage & Video — CareerFlow AI

> Bucket model, upload constraints, signed-URL strategy, MediaRecorder lifecycle, and video processing outlook. Video is the recruiter's first impression — storage correctness and playback latency are architectural.

---

## 1. Bucket Topology (Supabase Storage)

| Bucket | Visibility | Objects example | Max per object (bucket + app) | Duration cap | Retention |
|---|---|---|---|---|---|
| `resumes` | private | `resumes/{userId}/{versionId}.pdf` | 10 MB | — | forever (immutable versions) |
| `videos` | private | `videos/{userId}/{jobId}/{videoId}.webm` | 100 MB | 180 s | until public profile deleted or user deletes |
| `interview-answers` | private | `interview-answers/{userId}/{interviewId}/{questionId}.webm` | 100 MB per answer | 120 s per answer (advisory) | 30 days rolling (owner opt-keep), cascade on user delete |

All buckets:

- **Private** — no public read; objects accessible only via signed URLs minted server-side or via auth-scoped client with same `user_id` RLS-equivalent.
- **Deduplicated:** keys use UUIDv4, never client-supplied filenames (which are dropped).
- **MIME validation:** `resumes`: `application/pdf` only. `videos`, `interview-answers`: `video/webm` preferred (`video/webm;codecs=vp9,opus`) but `video/mp4` accepted for Safari.

Created via migration `010_storage_buckets.sql` (`docs/architecture/02_DATABASE_SCHEMA.md:1`).

---

## 2. PDF Upload Flow (Resume Bucket)

```ts
// lib/storage/resume.ts
export async function uploadResumePDF(userId: string, file: File): Promise<string> {
  // validate MIME + magic %PDF + 10 MB
  const versionId = crypto.randomUUID();
  const path = `resumes/${userId}/${versionId}.pdf`;
  const { error } = await storage.from('resumes').upload(path, file, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new StorageError('STORAGE_ERROR', error.message);
  return path;
}
```

Handler `POST /api/profile/resume` awaits this insert, then creates `resume_versions.file_path = path` + enqueues LLM extraction (outside the upload transaction to avoid holding the object lock).

**PDF validation checklist (app layer + DB hook future):**

- [ ] `file.type === 'application/pdf'` (client hint only — not sufficient)
- [ ] Header bytes `0x25 0x50 0x44 0x46` (`%PDF`)
- [ ] Not password-protected (parsing library throws `encrypted` which we map to a safe UX error)
- [ ] Text layer extractable — scanned-image-only PDFs flagged: `warn "This PDF looks scanned — text extraction may be limited. Please export a text-based PDF for best results."` but still accepted.

---

## 3. Video Capture & Upload (Video Bucket)

### 3.1 Client lifecycle — `useMediaRecorder` hook

Hook signature (planned `hooks/useMediaRecorder.ts`):

```ts
type MediaRecorderState = 'idle'|'acquiring'|'recording'|'paused'|'previewing'|'error';
type UseMediaRecorderReturn = {
  state: MediaRecorderState;
  stream: MediaStream | null;
  durationSec: number;
  blob: Blob | null;
  videoUrl: string | null; // object URL for preview
  start(): Promise<void>;
  stop(): void;
  discard(): void; // revoke URL + clear blob
  setTeleprompterSpeed(v:number): void;
  error: string | null;
};
```

Sequence per spec (`docs/modules/01_VIDEO_RESUME.md:1` Step 2 + `interview_coach_live_session` recorder):

```
1. acquire:  await navigator.mediaDevices.getUserMedia({ video:true, audio:true })
             // permission UX: if NotAllowedError → state='error' with helper copy + showUploadFallback
2. construct: mr = new MediaRecorder(stream, { mimeType: pickMimeType(), bitsPerSecond: 2500000 })
             chunks = []
3. start:    mr.start(1000)  // timeslice to surface duration tick
4. tick:     setInterval 1s → durationSec++; autoStop at 180s → mr.stop()
5. stop:     mr.stop(); assemble Blob(chunks, {type:'video/webm'});
             previewUrl = URL.createObjectURL(blob)
             status → 'previewing'
6. on preview "Save":  PUT /api/video-resume/video  as FormData (jobId + blob)
             await server response (insert + storage upload)
             on 200 → discard() + navigate to publish page
             on 413/503 → toast + keep previewUrl for retry
```

Duration limit: 180 s for video resume heroes, 120 s per answer for interview (advisory; enforced server-side but also enforced client).

**MIME selection** (order):

1. `video/webm;codecs=vp9,opus` — preferred Chrome/Firefox quality
2. `video/webm;codecs=vp8,opus` — fallback WebM
3. `video/webm` — bare WebM
4. `video/mp4` — Safari fallback; capability probe via `MediaRecorder.isTypeSupported`.

### 3.2 Server upload

`POST /api/video-resume/video` and `PUT /api/interviews/:id/answers` share a storage helper:

```ts
// lib/storage/video.ts
export async function uploadVideoBlob(
  userId: string,
  jobOrInterviewId: string,
  blob: Blob,
  bucket: 'videos'|'interview-answers'
): Promise<{ storagePath: string; durationSec:number; fileSize:number }> {
  // validate blob.type startsWith 'video/', size ≤ 100MB, probe duration via returned metadata or stored hint
  const id = crypto.randomUUID();
  const path = `${bucket}/${userId}/${jobOrInterviewId}/${id}.webm`;
  const { error } = await storage.from(bucket).upload(path, blob, {
    contentType: blob.type || 'video/webm',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new StorageError('STORAGE_ERROR', error.message);
  return { storagePath: path, durationSec: estimateDuration(blob), fileSize: blob.size };
}
```

File metadata written to the corresponding Postgres row (`videos` or `interview_answers`).

### 3.3 Playback

Playback on `GET /p/[slug]` uses **inline video with controls** (not a modal) per the minimal spec.

Server mints a **signed URL**:

```ts
// lib/storage/signedUrl.ts — service-role client only
export async function createSignedUrl(path: string, ttlSec: number): Promise<string> {
  const { data, error } = await serviceClient.storage.from(bucketFromPath(path))
    .createSignedUrl(path, ttlSec);
  if (error) throw error;
  return data.signedUrl;
}
```

- **Hero video** TTL 300 s, refreshed on page revalidate (ISR) — long enough to watch a 90–150s intro multiple times.
- **Resume PDF** TTL 60 s — download/view click regenerates; no long-lived leakage.
- **Interview answers** TTL 300 s, only held by the owner (never public).

No transform/CDN proxy required for signed objects — Supabase edge caches after signature validation.

---

## 4. Upload Alternatives (Fallbacks)

| Case | Fallback |
|---|---|
| `MediaRecorder` unsupported (very old Safari) | Direct `<input type="file" accept="video/*">` upload — validated same as captured blob. |
| Camera permission denied | Heavily styled permission helper + file input. Video resume still completable; interview offers **typed fallback** (textarea) which still participates in LLM follow-ups. |
| Signed URL expired mid-playback | `<video onerror>` retries by re-fetching `GET /api/public/:slug` which re-mints a fresh URL. |

---

## 5. Video Processing Roadmap (Future — NOT MVP)

MVP uses MediaRecorder's native output with **no transcoding, no thumbnail service, no CDN transcode**. Recorded `video/webm` plays directly via native `<video>`.

When analytics or reported playback issues demand it (Phase 9+), consider:

- **Thumbnail:** server-side frame extraction (first frame → `thumbnail_{videoId}.jpg` in bucket) via Vercel Function with `ffmpeg.wasm` or external service (Mux / Cloudflare Stream).
- **Transcoding:** background job that converts `video/webm` → `mp4` for Safari or `hls` segments for adaptive bitrate. Out-of-bucket deliver.
- **Python sidecar option:** if STT/sentiment or heavy processing is later required, a Python microservice (FastAPI + whisper) would consume `interview-answers` and produce transcripts (`docs/architecture/04_AI_ARCHITECTURE.md:1` Future Option).

Do **not** implement these in Phase 3 MVP — document as `05_STORAGE_AND_VIDEO.md` outlook and feature-flag `videoProcessing`.

---

## 6. Security Considerations

See also `docs/architecture/07_SECURITY.md:1`.

- No bucket is public — `GET /storage/v1/object/public/<bucket>/<path>` must never succeed.
- Storage keys are UUIDs — not user filenames — preventing path traversal (`../../` patterns are invalid and never interpreted as FS paths; Supabase Storage canonicalizes them anyway).
- MIME validation includes **magic-byte re-check** on server (read first bytes of blob server-side if runtime exposes bytes; on Node fallback validate `file.type` prefix + extension mapping).
- File-size limits are enforced at the **bucket config level** *and* app handler (defense-in-depth). App returns `413 FILE_TOO_LARGE` before consuming the upload.
- Ownership: Storage RLS (Supabase storage policies) mirror Postgres RLS: `auth.uid() = (storage.foldername(name))[1]` (first folder segment is userId). Service-role bypass is only for signed URL minting, not for listing.

---

## 7. Acceptance Criteria (Storage subsystem)

- [ ] `resumes` rejects non-PDF, >10 MB, password-locked with clear UX.
- [ ] `videos`/`interview-answers` rejects `>100MB` or duration violations with `413`/`VALIDATION_ERROR`.
- [ ] MediaRecorder flow on Chrome/Firefox/Safari captures a blob, yields preview, saves, and the resulting file plays back via signed URL within 5s of save.
- [ ] Copy-pasted signed video URL after 6 minutes is expired (`403` from Supabase) and the page re-mints on next navigation.
- [ ] Unauthenticated `GET /p/[slug]` plays hero video via signed URL (no auth), but listing `GET /storage/v1/object/list/...` as anon is denied.
- [ ] Deleting the owning user cascades Storage objects (cleaned via worker triggered by Postgres cascade).

