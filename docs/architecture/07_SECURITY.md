# Security — CareerFlow AI

> Security is not a phase — it is a constraint every phase satisfies. This file is the checklist for implementation-phase review. Every API route, table, and public surface must be reviewed against it.

---

## 1. Threat Model Summary

| Asset | Threat | Severity | Mitigation |
|---|---|---|---|
| User resumes, profile, interviews, analytics | Account takeover, leaked data | **Critical** | Supabase Auth + RLS + no secrets in bundle (§2, §3) |
| AI provider key | Key exfiltration via client | **Critical** | Server-only env; handler isolation (§2) |
| Recruiter public page | Enumeration, de-anonymized analytics, private JD leakage | **High** | Slug space, whitelisting, PII-free analytics (§4, §5) |
| File uploads (PDF/video) | Malicious payload, quota/limit abuse | **High** | MIME + header + size + type checks, bucket limits (§6) |
| LLM prompt injection | Prompt jailbreak, instruction-override, fabricated facts | **High** | Anti-fabrication preamble, input sanitization (§7) |
| OAuth ghost account, IDOR | Row read/write across users | **High** | Proven auth UID derivation + RLS doubly (§3) |

---

## 2. Authentication & Session

- **Provider:** Supabase Auth (`auth.users` managed). Client never stores token in `localStorage`; Next.js SSR helpers manage an `httpOnly` `sb-*` cookie + refresh. Any `localStorage.setItem('access_token')` pattern is forbidden by lint (`docs/implementation/01_PROJECT_FOUNDATION.md:1`).
- **Email + password:** min 8 chars (matching signup mock helper). Bcrypt via Supabase; no custom hash.
- **OAuth:** Google OAuth via PKCE code exchange (`/auth/callback` handler validates `code` + `state`). No implicit flow.
- **Session handling:**
  - `middleware.ts` runs `supabase.auth.getUser()` on every request (exempts only `/p/*` and `/` and static).
  - Auth-gated pages (`/dashboard`, `/career-profile`, `/video-resume/*`, `/interview/*`, `/resume-ai/*`, `/analytics*`, `/settings`) redirect to `/login?next=...` when `!user`.
  - Logout clears cookie + invalidates refresh token (`supabase.auth.signOut()`).
- **Rate limits:** `/api/auth/signup`, `/api/auth/login` 5 / min / IP; brute force on login triggers incremental backoff (future).
- **No secret leakage:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally scoped (can't read un-policed tables); `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are never prefixed with `NEXT_PUBLIC_` and guarded by build-time env audit (`NEXT_PUBLIC` prefix check in CI).

---

## 3. Authorization (Row Level Security)

Every data-bearing table has:

```sql
alter table public.<table> enable row level security;
```

### Core pattern

```sql
-- Example: career_profiles
create policy "owner crud"
on public.career_profiles for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

Applied to: `career_profiles`, `experiences`, `education`, `skills`, `projects`, `certifications`, `resumes`, `resume_versions`, `jobs`, `job_matches`, `scripts`, `videos`, `interviews`, `interview_questions`, `interview_answers`, `interview_feedback`, `resume_analyses`, `resume_suggestions`.

### Exception: `public_profiles` — split surface

```sql
-- Owner full CRUD
create policy "public_profiles owner"
on public.public_profiles for all
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Anon read ONLY via a view (not direct table SELECT):
create view public_profile_public_view as
  select slug, video_id, resume_version_id, user_id /* plus whitelisted cols */, null as job_id -- job omitted
  from public.public_profiles where is_published = true;

grant select on public_profile_public_view to anon, authenticated;
-- No policy permitting anon to SELECT from the base table directly.
```

Implementation via handlers: `GET /p/[slug]` calls the **service_role** client but picks the whitelisted view (or constructs a select limited to public columns). No handler selects `*` from `public_profiles` for the anon path.

### Exception: `public_profile_views`

```sql
-- INSERT permitted when caller has resolved a published profile's id (handler verifies slug)
-- Implemented as: anon can insert but cannot read
create policy "anon insert views"
on public.public_profile_views for insert
with check (true);  -- gate enforced in handler (slug existence), not RLS alone
-- SELECT only for owners via join indirection (below 06):
-- Better: NO select policy for anon; owners read via:
create policy "owner read views"
on public.public_profile_views for select
using (public_profile_id in (select id from public.public_profiles where user_id = auth.uid()));
```

### Enforcement check

Handlers must **also** re-check ownership before returning data (defense in depth). RLS is the final line; the handler pre-check yields a typed 403 without a full table scan.

### Migration guard

No migration file may contain `create table ... without enable row level security;` — this is checked by a CI `grep` step.

---

## 4. Public vs Private Data Boundary

Documented centrally here; enforcement spans code + views.

**NEVER exposed on `GET /p/[slug]`:** `jobs.description`, `job_matches` (score/breakdown), `scripts` contents, `interview*`, `resume_analyses/suggestions`, `private analytics`, private email/phone (unless the candidate explicitly opted in to show it on the public card), raw `user_id`.

**Exposed:** name, title, location, summary, experiences, education, skills, video signed URL, resume signed URL, (optional) LinkedIn/portfolio links, contact mechanism `mailto:` if present.

Audit: any new field added to `public_profiles` or `videos` requires a new entry in this section + an explicit whitelisting change — otherwise it is private by default.

---

## 5. Analytics Privacy (PII Minimization)

- **No cookie.** The view beacon does not `document.cookie` or fingerprint.
- **No raw IP stored.** Only `ip_hash = sha256(ip + dailySalt + profileId)`. Salt rotates daily (`env IP_HASH_SALT + date`); `ip_hash` is irreversible and not joinable across days.
- **No full user-agent returned.** Stored truncated (512) and aggregated to device bucket before returning JSON.
- **No referrer precision.** Query bucket aggregates by family; raw referrer not returned.
- **Retention & erasure.** Cascade delete on profile/user FK; 365-day retention on raw views, then prune.

---

## 6. File Upload & Storage Security

### 6.1 Resume PDF

Checks (app handler + bucket config):

| Layer | Check |
|---|---|
| Client | `accept="application/pdf"`, ≤10 MB hint |
| App handler | `file.type === 'application/pdf'`, magic prefix `%PDF`, `file.size ≤ 10MB`, content sniff for `%3Cscript` / JBIG2 blob heuristics (lightweight scan if lib available), `isEncrypted` flag reject. |
| Storage bucket `resumes` | `fileSizeLimit: 10485760`; MIME whitelist `application/pdf`; private |
| RLS | key prefix `resumes/{userId}/...` must equal `auth.uid()` for upsert via storage policies. |

Response on rejection: safe message `Unsupported file. Please upload a text-based PDF resume ≤10 MB.` — not raw error stack.

### 6.2 Video uploads

| Layer | Check |
|---|---|
| Client | `accept="video/*"`, duration check via `HTMLVideoElement.loadedmetadata` before submit; limit 100 MB |
| App handler | `contentType.startsWith('video/')`, `file.size ≤ 104857600`, duration hint ≤180s (video resume) / ≤120s (interview answer) |
| Bucket `videos` / `interview-answers` | private, `fileSizeLimit: 104857600`, allowedMimes `video/webm,video/mp4` |
| Supabase Storage RLS | first folder segment must match `auth.uid()` |

Filenames from client are discarded; new UUID is the key. Path traversals `../` canonicalize to failure (Storage never interprets them as filesystem).

### 6.3 Signed URL issuance

- Minted server-side only (`lib/storage/signedUrl.ts` using `service_role` client).
- TTL: resume 60s, video 300s, interview answer 300s. Expired URLs return 403 from Supabase; client re-mints by re-fetching `GET /api/public/:slug` or handler.
- No handler lists bucket contents — listing policy is denied.

### 6.4 Resource exhaustion

- Handler enforces pre-upload size cap with `Request.body` limit check and returns `413 FILE_TOO_LARGE`.
- Storage quota per user (soft cap 500 MB combined) — checked before accept in Phase 8.

---

## 7. Prompt Injection & LLM Abuse

| Vector | Mitigation |
|---|---|
| JD text contains adversarial instruction (ignore previous instructions…) | Input is always passed via a *data* channel (`<job_description>` XML-like tag) separate from the system instruction preamble; model-level `instruction_hierarchy: system > developer > user_input` is used where provider supports it. |
| Resume PDF text contains injection payload | Same data-channel wrapping. Overlapping checks in output validator: any instruction to "ignore" inside model output is rejected and re-prompted once with stronger isolation. |
| Open-ended chat is never used | No chat route exists; model is not exposed as a chatbot on the public page. |
| Output hijacking (LLM tries to emit `<script>` or link) | Output is plain JSON → validated by `zod` output schema; no raw HTML is ever rendered from LLM output — only string interpolation into predefined components. |
| Cost amplification / DoS | Per-endpoint rate limits (§ Rate Limits in 03) limit LLM calls per user. |
| Fabrication (data injection masquerading as HR instruction) | Anti-fabrication preamble (`docs/architecture/04_AI_ARCHITECTURE.md:1` §5) + output validator that forbids metrics not present in `allowedFacts`. |

---

## 8. Injection & Browser Security

- **SQL injection:** No raw string interpolation. All queries via Supabase client parameterized bindings; no `rpc(sql_string)` built from user input.
- **SSRF:** The only outbound HTTP from server is to `generativelanguage.googleapis.com` (or OpenAI) — hard-coded via provider. No `fetch(req.body.url)` ever.
- **XSS:**
  - Resume text, JD, script, and suggestions are rendered through controlled components; any HTML payload in them is **escaped** (never `dangerouslySetInnerHTML` and no `innerHTML`).
  - Supabase text fields are never exec'd as JS; sanitization is `encode-on-render`, not mutate-on-write.
  - CSP header (Phase 8): `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live` (Next.js required) — tightened later; media blob sources allowed `blob:`.
- **CSRF:** Since auth is cookie-based, handlers use the `Origin` / `Referer` safe check (Next.js CSRF protection via same-origin POST without `fetch` from evil origin due to `SameSite=Lax` cookie; explicit `csrfToken` not needed in MVP but re-evaluated if cookies become `None`).
- **CORS:** Default `same-origin`; no `Access-Control-Allow-Origin: *` on data APIs. `POST /api/public/:slug/view` accepts beacon from same-origin only (recruiter already on `/p/[slug]` origin).

---

## 9. Secure Headers & Edge

Planned `next.config.mjs` headers (Phase 8 hardening):

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY   (public page may need SAMEORIGIN if preview iframe — use allowlisted frame-ancestor)
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(self), geolocation=()
Content-Security-Policy: (above)
```

---

## 10. Audit, Logging & Monitoring (Minimal)

- Structured logger: `{ requestId, method, path, userIdHash, service, latencyMs, status }` — never logs `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, raw JD/PDF contents, or raw IP.
- Each mutation (delete profile, unpublish, delete user) logs an entry in `audit_logs` (optional table) or structured log — `who did what when`.
- Error tracking: Sentry (optional) redacts `authorization` header.

---

## 11. Data Deletion (GDPR-type)

| Trigger | Action |
|---|---|
| User deletes single public profile | Drop `public_profiles` row (cascade drops `public_profile_views`), revoke signed URLs (they expire anyway) |
| User deletes account (`DELETE /api/profile` danger zone) | Transaction deletes `users` row (cascade drops owned postgres rows), trigger worker enumerates Storage `videos|resumes|interview-answers/{userId}/` and removes objects |
| Retention expiry | Cron deletes `public_profile_views.viewed_at < now()-365d`; `interview_answers` blobs older than 30d of completed sessions unless `keep = true` |

---

## 12. Review Checklist (Use at every PR)

- [ ] New route handler derives `userId` from `auth.getUser()` (no body field trusted).
- [ ] New table has RLS enabled and an `owner` policy (or documented anon exception with justification).
- [ ] No handler imports `createServiceClient` except `app/api/public/*` + `lib/storage/signedUrl.ts`.
- [ ] No handler sends `GEMINI_API_KEY` to the client or logs it.
- [ ] File uploads checked for MIME prefix + magic + size + duration.
- [ ] LLM inputs are wrapped in data channels, not string-interpolated into system prompt.
- [ ] Public page's new field has been added as public vs private in §4 boundary (or left private).
- [ ] Signed URLs with short TTLs rather than long-lived public URL rewriters.
- [ ] `post-review` test: run `axe` + try IDOR via other user's ID — must 403.

