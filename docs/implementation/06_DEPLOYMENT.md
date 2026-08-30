# Implementation — 06 Deployment & Cross-Cutting

> Phases 7–10: cross-module integration, security hardening, testing consolidation, and production cut. Each phase is independently shippable; nothing in Phases 7–10 reworks working module UX without an ADR.

Also records the **known decisions and open questions** tracker for the whole blueprint.

---

## Phase 7 — Cross-Module Integration (After Resume AI lands)

### Goal

The app feels like ONE product — no dead ends crossing from Video Resume into Interview into Resume AI.

### Tasks

| # | Task | Detail |
|---|---|---|
| 7.1 | **Job reuse sweep** | Verify `JobService` dedup path is used on all three modules (grep that no module contains inline `INSERT INTO jobs` without `JobService`). Remove any leftover duplication. |
| 7.2 | **Deep-link preservation** | `?jobId=` param allowable across `/video-resume`, `/interview`, `/resume-ai`. Implement a shared helper `getJobByIdForUser(jobId)` — if canonicalization fails, show safe form pre-fill with inline job selector rather than 500. |
| 7.3 | **Dashboard ↔ module CTAs** | Every module card + Quick Action card actually deep-links correctly even when the target module hasn't yet been visited (e.g. no interview sessions yet → `/interview` still loads Setup with existing job pre-selected). |
| 7.4 | **Nav consistency pass** | SideNavBar header normalized to `avatar + name (label-md)` + `Active Career Profile (label-sm)`, across all authenticated routes. Mobile topnav wordmark must not diverge by page. |
| 7.5 | **Analytics wiring pass** | View beacon already ships; now connect `play`/`download` CTA events (hidden analytics props) and confirm canary 500-view load latency holds. No regression on public page LCP. |
| 7.6 | **Polish My Applications + Settings** | Table filters, status edit guard (owner only), storage usage bar wired, account-delete e2e (DB absence + Storage absence verified). |

### Acceptance

- [ ] Machine test: create a Job via Video Resume, then immediately start Interview without re-pasting JD — same `jobs` row is re-used, no duplicate row in `jobs`.
- [ ] Machine test: interview started for Job X then `GET /video-resume?jobId=X` shows that job pre-selected if returned to.
- [ ] Visual pass: nav shell screenshot diff <1% across phases.
- [ ] e2e `video→interview→resumeAi` chained suite passes.

---

## Phase 8 — Security Hardening (Parallel to Phase 7)

### Tasks

| # | Task | Detail |
|---|---|---|
| 8.1 | **RLS audit** | Script `scripts/rls_audit.sh` lists every table with `enable row level security` false — PR fails if non-empty. Every table has an `owner` policy (or documented anon exception). |
| 8.2 | **Storage policies audit** | Confirm bucket RLS for `resumes|videos|interview-answers` matches `auth.uid() = (storage.foldername(name))[1]`; listing disabled. |
| 8.3 | **Header pass** | Implement `next.config.mjs` `headers()` (CSP, HSTS, nosniff, referrer, permission `camera=(self),microphone=(self)`). |
| 8.4 | **Upload fuzz** | Add to e2e the same fixtures used in `tests/storage/` but now driving `POST ...` endpoints (invalid MIME + traversal + encrypted PDF). |
| 8.5 | **IDOR sweep** | For each resource list endpoint, add negative test confirming other-user 403 on read + patch. |
| 8.6 | **Signed URL rotation test** | Seed profile → mint URL → wait (or stub) for 61s/301s → signed fetch 403 → page re-mint recovers. |
| 8.7 | **Rate-limit audit** | Automated load of 11 requests to each LLM-gated endpoint → 11th 429 + `Retry-After` present. |

### Acceptance

- Single checkbox: `docs/architecture/07_SECURITY.md:1` Review Checklist (bottom) fully ticks on review of this PR.

---

## Phase 9 — Testing Consolidation

Consolidates `docs/implementation/05_TESTING.md:1` under actual CI settings.

### Tasks

- Promote `MockProvider` as the default in `.env.test` (no live).
- Wire coverage gate (≥85% for `lib/*`) to block PR.
- Add `axe` critical run to CI job `accessibility` (fails on `critical`).
- Add weekly `test:live` cron (runs on `main` when `GEMINI_API_KEY` present) for fabrication spot-check — flake tolerance 2, backlog created on consistent fail.

---

## Phase 10 — Production Cut

### Infrastructure

```
GitHub → Vercel  (Build: Next.js, no Python)
Supabase         (Postgres + Storage region = Vercel primary region)
No custom CDN    (signed URLs via Supabase)
```

### Tasks

| # | Task | Detail |
|---|---|---|
| 10.1 | Populate **production env** in Vercel (secret): `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix), `NEXT_PUBLIC_*` public pair. |
| 10.2 | Push migrations in order `001…010` against prod Supabase (via `supabase db push` or SQL runner). Verify `supabase status --linked`. |
| 10.3 | Create production buckets + limits + RLS. |
| 10.4 | Final `npm run build` on prod preview, Lighthouse run (Perf ≥ 90, A11y ≥ 95 on `/` and `/p/[slug]` without signed video, X-Frame denial on other routes). |
| 10.5 | Smoke script (see `/scripts/smoke.sh` planned): signup → upload → match → publish → GET `/p/[slug]` anon 200 + telemetry shows 1 view in `/analytics` within 10s. |
| 10.6 | Run RLS/rate/header audits one final time before `main→prod`. |
| 10.7 | Configure `vercel --prod` alias + custom domain `app.careerflow.ai` if already purchased; otherwise `careerflow-ai.vercel.app` is production domain. |

### Rollback

Vercel instant rollback + Supabase point-in-time restore (pre-configured backup window). Storage objects not rollback-able but are append-only — losing a bucket object requires user re-upload; inform users via `status` event.

---

## Known Decisions and Open Questions

This section is the **single tracker** for Phase 0 assumptions and deferred items. Every future PR that resolves an open question must mark it closed here and amend the relevant spec/decision doc.

### Decisions (Frozen — change requires ADR)

| ID | Decision | Doc |
|---|---|---|
| D-001 | One Next.js + TypeScript + Tailwind + Supabase + Vercel single-stack | `ADR-001` |
| D-002 | Shared Career Profile — one user, one profile, one resume system | `ADR-002` |
| D-003 | AI Service Layer isolates provider (Gemini default) | `ADR-003` |
| D-004 | Minimal public recruiter page (centered hero + single resume card) | `ADR-004` |
| D-005 | MediaRecorder is the MVP video capture (no Mux/Cloudflare yet) | `docs/architecture/05_STORAGE_AND_VIDEO.md:1` |
| D-006 | No Python service in MVP — single Next.js runtime | `ADR-001` |

### Assumptions (Validated during implementation, revisit if wrong)

| ID | Assumption | Success metric | Risk if wrong |
|---|---|---|---|
| A-001 | Gemini provider is sufficient across 9 AI surfaces without latency/quality cliff | p95 latency <10s and hallucination rate on corpus <1% | Swap provider per `04_AI_ARCHITECTURE.md`§4.3 — cost ~1 PR per interface |
| A-002 | Text-based PDF extraction via LLM covers ≥95% of resumes; scanned-image PDFs are rare | Manual audit of 50 uploads ≥90% fill rate without OCR | Add client-side or Tesseract OCR step to `ResumeParser` pipeline |
| A-003 | User bucket quota 500 MB (soft) is adequate for MVP without quota complaints | No >50 tickets/month | Bump bucket FileSizeLimit + add usage bar in Settings |
| A-004 | RLS-only auth (no middleware RBAC) sufficient — one role per user | No `other_user_id` bypass reproduced in e2e | Add DB-side view filtered + service-role path |
| A-005 | 1-hour dedup window for IP hash reduces analytics noise enough | Unique-view drift <5% under synthetic load test | Tune dedup window to 15 min + visitor cookie (deferred feature) |

### Open Questions (Need owner / design / product answer before dependent code)

| ID | Question | Blocks | Owner | Due by phase |
|---|---|---|---|---|
| O-001 | My Applications table — no Stitch mock. Is the proposed table view (mirroring Dashboard recent apps) the correct information density? Needs design sign-off. | `phase 7.6` table polish | Designer + Product | Before Phase 7 PR |
| O-002 | Interview Progress chart (trend over time) — no Stitch mock. Is `recharts` vs. custom sparkline the visualization choice? | Interview Progress polish | Designer | Before Phase 5 polish |
| O-003 | Resume AI re-render: should MVP produce a pixel-perfect updated PDF or a text Reserve card is enough? Affects whether `puppeteer` is added to 6a. | `6a.5` PDF re-render | Product | Before Phase 6a PR |
| O-004 | Interview answer — do answers need browser-side silence detection / trimming to cut dead tape? Deferred to reduce scope. | Phase 5 perf tuning | AI Eng | Phase 5b review |
| O-005 | Browser *TLD* list update for referrer bucketing (Linkedin vs mobile DeepLink) — who maintains? | Analytics bucket accuracy | Infra | Phase 4 accept |
| O-006 | Confirm short-lived signed URL TTLs: resume 60s (review), video 300s (review) balances stream failover vs. link reuse — legal? | Storage prod | Security | Before 10.3 |
| O-007 | Python sidecar threshold: at what STT/processing latency do we justify introducing it vs. keeping Gemini only? | `ADR-001` deferment | Arch | Phase 9 review |
| O-008 | Real-user language: "Overall Readiness A-" — is this currently in mock but not yet backed by a computed metric; how to compute (profile completion plus recent interview/result) until Phase 6? | Dashboard readiness | Product | Before Phase 1b seed |

All open questions are surfaced again in `ARCHITECTURE.md` → "Roadmap & Open Questions" for leadership review.

---

## How to use this file

When implementing:

1. Pick a phase (e.g. "Phase 3a").
2. For each task row, point the PR description to the task ID.
3. Mark tasks as done when the Acceptance gate ticks green via the automated test command referenced.
4. On phase completion, open a docs-only PR updating `docs/implementation/06_DEPLOYMENT.md` → marking that phase complete and linking the code PR hash.

