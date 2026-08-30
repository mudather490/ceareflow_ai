# API Architecture — CareerFlow AI

> Contract and conventions for every Route Handler. The API is a **thin, auth-aware, z-validated, typed boundary** — not business logic. Logic lives in `lib/services/*` and `lib/ai/*` (`docs/architecture/04_AI_ARCHITECTURE.md:1`).

---

## 1. Conventions

### 1.1 Stack

- **Runtime:** Next.js Route Handlers (`app/api/**/route.ts`) on Vercel Node runtime (not edge — required for `@google/generative-ai` + Supabase gRPC).
- **Auth:** `createServerClient` (auth-scoped) per request; `createServiceClient` restricted to beacon insert and signed URL minting.
- **Validation:** `zod` schemas in `lib/validation/<domain>.ts` shared between client and server — the single source of validation truth.
- **Typing:** Handlers return `NextResponse<{ ok?:true, data?:T, error?:ApiError }>`; domain DTOs in `lib/types/*`.
- **Errors:** JSON envelope only, never HTML. On auth fail, no private row data is returned.

### 1.2 URL style

- Resource-oriented plural: `/api/profile`, `/api/jobs` (not `/api/job`).
- Job/jobMatch lifetimes are split — but `jobs` handles the shared job creation (used by every module).

### 1.3 Error envelope

```ts
export type ApiError = {
  code: 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
        | 'CONFLICT' | 'RATE_LIMITED' | 'AI_UNAVAILABLE' | 'FILE_TOO_LARGE'
        | 'UNSUPPORTED_MEDIA_TYPE' | 'STORAGE_ERROR' | 'INTERNAL_ERROR';
  message: string;         // human-safe, never raw DB/AI exception
  field?: string;          // for VALIDATION_ERROR
  requestId?: string;      // echoed for support
};
```

Status codes: `400` validation, `401` unauth, `403` forbidden/IDOR, `404` not found / unpublished, `409` conflict (no-net-change, duplicate slug), `413` too large, `429` rate limit, `503` AI unavailable.

### 1.4 Request / Response shape

Every handler:

```ts
// lib/supabase/server.ts provides per-request auth-scoped client
export async function POST(req: Request) {
  const reqId = crypto.randomUUID(); // struct log aid
  const supabase = await createServerClient(); // reads httpOnly cookie
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code:'UNAUTHENTICATED', message:'Please sign in.', requestId:reqId } }, { status:401 });

  const raw = await req.json().catch(()=>null);
  const parsed = matchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error:{ code:'VALIDATION_ERROR', message: parsed.error.issues[0].message }}, {status:400});

  // rate limit check BEFORE LLM
  // delegate to service
  const result = await VideoService.matchResumeToJob(user.id, parsed.data);
  return NextResponse.json({ data: result });
}
```

- No `userId` accepted from the client body — always derived from `user.id`.
- All public-file endpoints (`/api/public/:slug/*`) are the *only* ones that call `createServiceClient` — and only for view insertion / signed URL creation (never for reading private columns).
- Every handler sets `Cache-Control: no-store` unless the endpoint is `GET /p/[slug]`.

---

## 2. Endpoint Catalogue

### 2.1 Auth (thin wrappers — mostly delegated to Supabase + next middleware)

| Method | Path | Body / Query | Response | Auth | Notes |
|---|---|---|---|---|---|
| POST | `/api/auth/signup` | `{ email, password }` | `{ data:{ userId } }` | No | Forwards to supabase.auth.signUp; rate-limit. |
| POST | `/api/auth/login` | `{ email, password }` | `{ data:{ userId } }` | No | Sets cookie via SSR helper. |
| POST | `/api/auth/signout` | — | `{ ok:true }` | Yes | |
| GET | `/api/auth/session` | — | `{ data:{ user?, profile? } }` | Optional | Light check for client hydration. |

Google OAuth is a redirect flow via `supabase.auth.signInWithOAuth` on the page (no route API needed beyond `GET /auth/callback` handler).

### 2.2 Profile & Resumes

| Method | Path | Body / Query | Response | Auth |
|---|---|---|---|---|
| GET | `/api/profile` | — | `{ data: CareerProfileDTO }` | Yes |
| PATCH | `/api/profile` | `Partial<CareerProfileInput>` | `{ data: CareerProfileDTO }` | Yes |
| POST | `/api/profile/resume` | `multipart/form-data: file (PDF)` | `{ data: { resumeVersionId } }` | Yes |
| GET | `/api/profile/resume-versions` | `?resumeId?` | `{ data: ResumeVersionDTO[] }` | Yes |
| PATCH | `/api/profile/experiences/:id` | `ExperienceInput` | `{ data: ExperienceDTO }` | Yes |
| POST | `/api/profile/experiences` | `ExperienceInput` | `{ data: ExperienceDTO }` | Yes |
| DELETE | `/api/profile/experiences/:id` | — | `{ ok:true }` | Yes |
| (analogous) | `/api/profile/education/*` `/api/profile/skills/*` etc | | | Yes |

`POST /api/profile/resume` details:

- Accepts `FormData` (`file`).
- Validates `application/pdf`, `≤10MB`, magic bytes `%PDF`, not encrypted.
- Uploads to `resumes/{userId}/{uuid}.pdf`.
- Inserts `resumes` + `resume_versions` row.
- Triggers `CareerProfileService.hydrateFromResumeVersion(resumeVersionId)` (LLM parser) asynchronously — the response is immediate with `resumeVersionId`; the profile hydration is observed via polling or SWR revalidation.

### 2.3 Jobs (shared)

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/jobs` | `{ title, company, description }` | `{ data: JobDTO }` | Yes |
| GET | `/api/jobs` | `?status=&q=` | `{ data: JobDTO[] }` | Yes |
| GET | `/api/jobs/:id` | — | `{ data: JobDTO }` | Yes |
| PATCH | `/api/jobs/:id` | `Partial<JobInput>` | `{ data: JobDTO }` | Yes |

`POST /api/jobs` performs deduplication by `description_hash` (application-layer).

### 2.4 Video Resume

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/video-resume/match` | `{ resumeVersionId, jobTitle, company, jobDescription, jobId? }` | `{ data: { jobId, jobMatchId } }` | Yes |
| GET | `/api/video-resume/match/:id` | — | `{ data: JobMatchDTO }` | Yes |
| GET | `/api/video-resume/script` | `?jobId=` | `{ data: ScriptDTO|null }` | Yes |
| POST | `/api/video-resume/script` | `{ jobId }` → generate | `{ data: ScriptDTO }` | Yes |
| PATCH | `/api/video-resume/script/:id` | `Partial<ScriptInput>` | `{ data: ScriptDTO }` | Yes |
| POST | `/api/video-resume/script/:id/regenerate` | `{ variant?:'shorten'|'natural' }` | `{ data: ScriptDTO }` | Yes |
| POST | `/api/video-resume/video` | `multipart/form-data: jobId, file (video/*)` | `{ data: VideoDTO }` | Yes |
| PATCH | `/api/public-profile/:id` | `{ isPublished:boolean }` | `{ data: PublicProfileDTO }` | Yes |
| GET | `/api/public-profile/:id/analytics` | — | `{ data: AnalyticsDTO }` | Yes |

`POST /api/video-resume/video`:

- Accepts `video/webm` or `video/mp4` `≤100MB`; validates effective duration ≤180s (read `loadedmetadata` server-side where possible or trust client hint + re-check via ffprobe if enabled).
- Stores to `videos/{userId}/{jobId}/{videoId}.webm`.
- Inserts `videos` row with `status: ready`.
- Upserts `public_profiles` draft (if none) — generates `slug` `nanoid10`.

### 2.5 Public (unauthenticated)

| Method | Path | Body / Headers | Response | Auth |
|---|---|---|---|---|
| GET | `/api/public/:slug` | — + `Host` | `{ data: PublicRecruiterViewDTO }` | No* |
| POST | `/api/public/:slug/view` | `{ referer?: string }` + `User-Agent`, `X-Forwarded-For`, `Country` headers | `{ ok:true }` | No* |

*Uses `createServiceClient` narrowly: resolves `public_profiles` by slug with `is_published = true`, then either returns whitelisted fields or inserts `public_profile_views`. On not-found/unpublished, returns `404` with generic message.

Rate limit: `10 / hour / IP` for `POST .../view` (exceeded → still returns `ok:true` but does not insert — prevents view inflation and avoids leaking limit behavior).

Signed URLs live as transient properties inside `PublicRecruiterViewDTO` (`signedResumeUrl`, `signedVideoUrl`) minted per-request; they are never cached.

### 2.6 Interviews

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/interviews` | `{ jobId, interviewType, difficulty, questionCount }` | `{ data: InterviewDTO }` | Yes |
| GET | `/api/interviews` | `?status=` | `{ data: InterviewDTO[] }` | Yes |
| GET | `/api/interviews/:id` | — | `{ data: InterviewDTO }` | Yes |
| GET | `/api/interviews/:id/next-question` | — | `{ data: QuestionDTO }` | Yes |
| PUT | `/api/interviews/:id/answers` | `multipart/form-data: questionId, file?, transcript?` | `{ data:{ answerId, nextQuestion?:QuestionDTO, isComplete:boolean } }` | Yes |
| PATCH | `/api/interviews/:id` | `{ status:'abandoned' }` | `{ data: InterviewDTO }` | Yes |
| GET | `/api/interviews/:id/feedback` | — | `{ data: InterviewFeedbackDTO }` | Yes |
| POST | `/api/interviews/:id/feedback/refresh` | — (re-run feedback) | `{ data: InterviewFeedbackDTO }` | Yes |

See also `docs/modules/04_INTERVIEW_COACH.md:1` state machine for status transitions.

### 2.7 Resume AI

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/resume-ai/analyze` | `{ resumeVersionId, jobId? }` | `{ data: { analysisId } }` | Yes |
| GET | `/api/resume-ai/analyses/:id` | — | `{ data: { analysis: ResumeAnalysisDTO, suggestions: ResumeSuggestionDTO[] } }` | Yes |
| POST | `/api/resume-ai/suggestions/:id/accept` | — | `{ data: ResumeSuggestionDTO }` | Yes |
| POST | `/api/resume-ai/suggestions/:id/reject` | — | `{ data: ResumeSuggestionDTO }` | Yes |
| POST | `/api/resume-ai/suggestions/:id/edit` | `{ editedText:string }` | `{ data: ResumeSuggestionDTO }` | Yes |
| POST | `/api/resume-ai/analyses/:id/apply` | — | `{ data: { resumeVersionId } }` | Yes |

---

## 3. Validation Schemas (zod) — shared

Example sketches (the actual files live in `lib/validation/`):

```ts
export const jobSchema = z.object({
  title: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(120),
  description: z.string().trim().min(50).max(20000),
});
export const matchSchema = z.object({
  resumeVersionId: z.string().uuid(),
  jobTitle: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(120),
  jobDescription: z.string().trim().min(50).max(20000),
});
export const videoSchema = z.object({
  jobId: z.string().uuid(),
  file: z.instanceof(File), // checked MIME + 100MB + duration
});
export const scriptPatchSchema = z.object({
  opening: z.string().max(5000).optional(),
  experience: z.string().max(5000).optional(),
  skills: z.string().max(5000).optional(),
  closing: z.string().max(5000).optional(),
});
```

Client `<Form>` and server handler both import the same schema — disagreement yields `VALIDATION_ERROR` with field pointer.

---

## 4. Rate Limiting & Quotas

| Route pattern | Limit | Store | Notes |
|---|---|---|---|
| `POST /api/video-resume/match` | 10 / hour / user | Supabase counter table or Upstash Redis | Before invoking `ResumeJobMatcher` |
| `POST /api/video-resume/script/*` | 10 / min / user | same | Regenerate budget |
| `POST /api/video-resume/video` | 5 / hour / user | same | Storage ingest |
| `POST /api/interviews` | 6 / hour / user | same | |
| `PUT /api/interviews/:id/answers` | 30 / hour / user | same | per-interview much higher internally |
| `POST /api/resume-ai/analyze` | 6 / hour / user | same | |
| `POST /api/public/:slug/view` | 10 / hour / IP | edge KV | public — IP scoped |

All rate-limited routes return `429` with `Retry-After` seconds header; the beacon case swallows it but does not insert.

---

## 5. Caching Headers

| Route | Cache |
|---|---|
| `GET /p/[slug]` (public page) | `revalidate = 300` ISR; `Cache-Control: public, s-maxage=300, stale-while-revalidate=60` |
| `GET /api/public/:slug` | `no-store` (contains short-lived signed URLs) |
| `POST /api/public/:slug/view` | `no-store` |
| All auth `GET /api/*` | `no-store` |
| `GET /api/public-profile/:id/analytics` | `private, max-age=30` |

---

## 6. Security Invariants (API layer)

- `userId` is never taken from the body; handlers always resolve it from `auth.getUser()`.
- `createServiceClient` is **only** imported in `app/api/public/*` handlers and `lib/storage/signedUrl.ts`; eslint rule enforces a lint error elsewhere.
- File uploads are validated against MIME prefix (`application/pdf` or `video/*`) + magic bytes (PDF header) + file size + duration; filenames from client are never reused as storage keys (new UUID used).
- AI provider key is never forwarded in a response; only server route handlers call `lib/ai/providers/*`.
- IDOR protection: every resource read checks `row.user_id === auth.uid()` (the RLS layer ensures it even if handler forgets, but handler re-checks to give a typed 403).
- CORS: default Next.js same-origin; public endpoints set `Vary: Origin` but do not need a wildcard; beacon handles `fetch(..., { mode:'same-origin' })` — no cross-domain fancying in MVP.

---

## 7. Open Questions

- Streaming response for `POST /api/resume-ai/analyze` vs complete JSON — choose based on p95 under load-spike testing in Phase 6.
- Exact file-size quota for storage buckets: `resumes 10 MB`, `videos 100 MB`, `interview-answers 100 MB` — needs budget review before Terraform/Bicep in Phase 8.
