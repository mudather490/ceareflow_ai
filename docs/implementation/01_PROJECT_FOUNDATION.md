# Implementation — 01 Project Foundation (Phase 1)

> Checklist and scaffolding tasks that MUST be completed before any module code merges. Phase independently testable: a fresh clone can `npm install && npm run dev && npm run build` and authenticated routes render their shell (stub data acceptable).

---

## 1. Goal

A bootable Next.js app with TypeScript, Tailwind (tokens from `DESIGN.md`), shadcn/ui, Supabase clients, and a verified auth gate — without wiring AI features or Storage yet.

---

## 2. Stack (Frozen for Phase 1)

| Tool | Version signal | Rationale |
|---|---|---|
| `next` App Router | 14+ | RSC + Route Handlers per `docs/decisions/ADR-001` |
| `react` / `react-dom` | 18 | |
| `typescript` | 5, `strict:true` | |
| `tailwindcss` | 3, plugins `forms` | Already used in every Stitch mock |
| `shadcn/ui` | (CLI `npx shadcn@latest init`) | Supplies Button/Card/Badge/Dialog/Sheet/Input/Textarea/Separator/Tabs/Skeleton |
| `@supabase/supabase-js` + `@supabase/ssr` | latest | `createBrowserClient` / `createServerClient` / `createServiceClient` split |
| `zod` | latest | Shared validation layer (client+server) |
| `react-hook-form` + `@hookform/resolvers` | latest | Used with `zodResolver` |
| `nanoid` | latest | Public slugs + requestId |
| dev: `eslint` (+ `eslint-plugin-no-restricted-imports`) | | Enforce `no-service-client-in-handlers` |

-do not- add in Phase 1: `puppeteer`, `ffmpeg`, `@google/generative-ai`, `recharts`, `framer-motion`, or Python deps.

---

## 3. Commands to Run (When implementation actually starts — document, do not run now)

```bash
# 0. Confirm workspace is `E:\creare_ai` and Node ≥ 20
node -v && npm -v

# 1. Bootstrap Next.js (do this inside E:\creare_ai — inspect dir is empty apart from `dising stitch/` and `docs/`)
npx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Elect YES to Turbopack once; validate build.

# 2. Tailwind + tokens: overwrite tailwind.config.mjs with DESIGN.md tokens
#    (see §4)

# 3. shadcn init + primitives
npx shadcn@latest init -d
npx shadcn@latest add button card badge input textarea label dialog sheet skeleton separator tabs

# 4. Supabase
npm i @supabase/supabase-js @supabase/ssr

# 5. Validation & utils
npm i zod react-hook-form @hookform/resolvers nanoid
```

All file-generation steps below include the concrete file path and what to verify.

---

## 4. Tailwind Configuration (Tokens from `DESIGN.md`)

File: `tailwind.config.mjs`

Map:

- `colors` object from `design/stitch/careerflow_ai/DESIGN.md` (`surface`, `surface-container-lowest`, etc.). Keep names **verbatim** to match every Stitch `code.html` class list (`bg-surface`, `text-secondary`, `border-outline-variant`, …) — do not rename to `primary` in place of `secondary`.
- `borderRadius` `DEFAULT:0.25rem lg:0.5rem xl:0.75rem full:9999px`
- `spacing` base-4 scale + lg `40px` for section spacing
- `fontFamily` all `Inter` + mapping per `typography` branch
- `fontSize` from token file + explicit `lineHeight`, `letterSpacing`, `fontWeight`
- plugin: `require('@tailwindcss/forms')`

Verify: `npm run dev` + a `bg-secondary` button renders indigo; `rounded-lg` = 8px per spec.

---

## 5. Supabase Clients

### 5.1 Environment

```
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # secret, never NEXT_PUBLIC_
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=...                   # secret, not NEXT_PUBLIC_
GEMINI_MODEL=gemini-1.5-pro
AI_PROVIDER=gemini
```

Create `.env.example` (checked in) with empty values + `.gitignore` entry for `.env.local`.

### 5.2 Client files

- `lib/supabase/client.ts` — `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`
- `lib/supabase/server.ts` — `createServerClient` via `next/headers` `cookies()` — per-request auth-scoped.
- `lib/supabase/service.ts` — `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` — server-only. Must include:

  ```ts
  if (typeof window !== 'undefined') throw new Error('service client is server-only');
  ```

- `middleware.ts` at repo root — `createServerClient` + `supabase.auth.getUser()` refresh on each request for `/dashboard|/career-profile|/video-resume|/interview|/resume-ai|/analytics|/settings`.

Verify: `npm run build` fails if `SUPABASE_SERVICE_ROLE_KEY` has `NEXT_PUBLIC_` prefix (checked by env audit util in `lib/env.ts`).

---

## 6. Layouts & Navigation Scaffolding

### 6.1 App Router groups

```
app/
  layout.tsx              (root: <html lang="en"><body class="bg-background antialiased font-body-md">)
  (marketing)/page.tsx    Landing
  (auth)/login/page.tsx, signup/page.tsx   (centered card shell)
  (dashboard)/
    layout.tsx            (imports SideNavBar + TopNavBar, gates auth via server redirect)
    dashboard/page.tsx
    career-profile/page.tsx
    video-resume/  (stub)
    interview/     (stub)
    resume-ai/     (stub)
    analytics/     (stub)
    settings/      (stub)
    onboarding/page.tsx   (stub)
  p/[slug]/page.tsx       (isolated, no (dashboard) layout)
  auth/callback/route.ts  (OAuth code exchange)
```

### 6.2 Navigation components

- `components/nav/SideNavBar.tsx` — desktop 64px-width fixed sidebar (verified copy from `user_dashboard_careerflow_ai` + `career_profile_careerflow_ai`). Props: `active: 'dashboard'|'careerProfile'|'videoResume'|...`, `user: { name, avatarUrl? }`.
- `components/nav/TopNavBar.tsx` — mobile `h-16` fixed top bar: wordmark left, bell + avatar right.
- `components/nav/RecruiterNav.tsx` — minimal top bar for `/p/[slug]` (wordmark left, Save/Share right).
- `components/nav/MobileDrawer.tsx` — sheet (shadcn Sheet) opened by hamburger, shows SideNavBar items.

Active state: `bg-secondary-container text-on-secondary-container font-bold rounded-lg scale-95 transition-transform` (verbatim from mocks).

### 6.3 Global UI helpers

- `components/shared/EmptyState.tsx` (`EmptyStates` slot)
- `components/shared/ErrorAlert.tsx` (reused per page)
- `lib/utils.ts` — `cn(...)` (`clsx` + `tailwind-merge`) exactly as shadcn generates.

---

## 7. Error Handling Foundation

- `app/error.tsx` — error boundary with `Try Again` + `Back to Dashboard`.
- `app/not-found.tsx` — 404 `This page isn't available` minimal.
- `app/(dashboard)/error.tsx` — scoped to dashboard shell (remains with sidebar).
- Route handler envelope: shared helper `lib/api/response.ts` → `apiOk(data)` / `apiErr(code,message,status,field?)`.

Sentry: optional toggle `SENTRY_DSN` in later phase; stub placeholder comment in `error.tsx`.

---

## 8. Validation & Domain Types

- `lib/validation/auth.ts` — `signupSchema`, `loginSchema` (zod)
- `lib/validation/profile.ts`, `jobs.ts`, `videoResume.ts`, `interviews.ts`, `resumeAi.ts`
- `lib/types/index.ts` — shared `JobDTO`, `ResumeVersionDTO`, `MatchDTO`, etc. (placeholder shapes; fleshed per phase)

Zod helpers must be importable by both client (`useForm` resolver) and server (Route Handler).

---

## 9. Lint & Security Rules

`.eslintrc.json` addition:

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "paths": [{
        "name": "@/lib/supabase/service",
        "message": "service client is only allowed in app/api/public/* and lib/storage/signedUrl.ts"
      }]
    }]
  }
}
```

Plus `no-restricted-globals: console in app/api` except structured logger.

---

## 10. Testing Smoke (Phase 1, see 05_TESTING)

- `npm run build` passes with no TypeScript errors.
- `npm run lint` passes.
- Manual: `GET /` renders landing hero; `GET /dashboard` unauthenticated redirects to `/login`; Google OAuth and email auth both create a `users` row + `career_profiles` draft (verified via Supabase console).
- Mobile: TopNav + SideNav collapse verified on 375×844 (Safari emulator).

---

## 11. Exit Criteria (Gate before Phase 2)

- [ ] Repo scaffolding is committed with TypeScript strict + Tailwind tokens + shadcn primitives.
- [ ] Supabase clients + `middleware.ts` cover all auth-gated routes; service-role key cannot leak to the browser (env audit passes).
- [ ] `(dashboard)/layout.tsx` mounts SideNav + TopNav with active states and renders the inter-module links without mixing recruiter chrome.
- [ ] `(auth)` and `(marketing)` layouts do NOT render SideNav.
- [ ] `zod` schemas live in `lib/validation/` and are consumed by both `page.tsx` (RHF) and a sample route handler.
- [ ] CI gate `npm run build` passes in Vercel preview of the Phase 1 PR.

