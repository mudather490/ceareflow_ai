# GEMINI — AI Coding Agent Rules (Permanent)

> Canonical operating rules for **every** coding agent and human contributor working on **CareerFlow AI**. This file survives provider changes (Gemini, OpenCode, Claude, …) — do not delete it even when the project uses OpenCode as the CLI. Every session that writes or reviews code, prose, or migrations in this repository **MUST** read this file before acting.

---

## 1. This Is ONE Integrated SaaS Application

Do not treat Video Resume, Interview Coach, and Resume AI as microservices, mono-repo silos, or separate Next.js apps. All three read from and write to the **same** `career_profiles` + `resume_versions` + `jobs` + `users` roots.

**Source:** `docs/product/01_PRODUCT_OVERVIEW.md:1`, `docs/decisions/ADR-002-SHARED-CAREER-PROFILE.md:1`, `ARCHITECTURE.md:1`.

## 2. Never Create Separate Applications for Modules

No `apps/video-resume/`, no `apps/interview/`, no per-module `server/` dir, no second `create-next-app`. The only app is at `app/` (App Router). If a future AST suggests a sidecar of Python/vector-retrieval, that work must spawn an `ADR` and preserve the AI service-layer contract (`docs/architecture/04_AI_ARCHITECTURE.md:1`).

## 3. Reuse the Shared Career Profile

Before adding a new field, grep for the existing table or `CareerProfileService`. To avoid bloating `career_profiles`, use `jsonb extensions` for transient experimental fields only after review. Do not add `video_career_profiles`, `interview_career_profiles`, etc.

## 4. Reuse the Shared Authentication

`auth.users` + `users` is the ONLY auth. There is no `interview_users` or `video_auth` layer. Every auth-gated route (`/dashboard, /career-profile, /video-resume/*, /interview/*, /resume-ai/*, /analytics*`) uses the **same** `middleware.ts` + `createServerClient` session.

## 5. Reuse the Shared Resume System

No agent may create parallel `video_resumes` or `interview_resumes` tables. Resume history is `resumes` → immutable `resume_versions`. The `GET /api/profile/resume-versions` picker is shared across Video Step 1, Interview Setup, and Resume AI. Dedup on `description_hash` lives in `JobService` — not reimplemented inline.

## 6. Reuse Existing Components Before Creating New Ones

`DESIGN_SYSTEM.md:1` + `components/ui/*` + nav/shell primitives form the design system. Before fabricating a new `Card`, search `components/ui/card.tsx` and `DESIGN_SYSTEM.md:§3`. Page routes that copy-paste `bg-surface-container-lowest … border border-outline-variant` inline instead of importing `Card` will be rejected as drift.

## 7. Do Not Duplicate Database Entities

Any proposal introducing a table whose name ends in `*_users, *_profiles, *_resumes, *_jobs` must be rejected unless the existing owning table is extended in place and an ADR supersedes the decision. CI includes `grep -R 'create table.*_users|.*_profiles|.*_resumes' supabase/migrations` as a failing check (`docs/implementation/05_TESTING.md:1`).

## 8. Do Not Expose AI API Keys to the Browser

`GEMINI_API_KEY` **is not** `NEXT_PUBLIC_` — assert in `lib/env.ts` build step. Route handlers call `getAIProvider().<svc>.generate(...)` on the server; React components never import `lib/ai/providers/*`. A handler that constructs `new GoogleGenerativeAI(process.env.GEMINI_API_KEY)` inline instead of via `getAIProvider` is to be rejected — it must go through `lib/ai/services/*`.

## 9. Keep AI Providers Behind the AI Service Layer

All 9 AI behaviors are typed interfaces in `lib/ai/services/*` and implemented in `lib/ai/providers/{gemini,mock}.ts`. Adding a tenth behavior means adding a tenth interface — not scattering new prompts across handlers. Swapping to `openai` means adding `openai.ts` + branching `lib/ai/provider.ts:getAIProvider` — no handler edits necessary.

See `docs/decisions/ADR-003-AI-SERVICE-LAYER.md:1`. Failure to adhere is the single easiest path to provider-lock, so lint guards forbid `import '@google/generative-ai'` inside `app/api/` — enforce via `eslint no-restricted-imports` in `docs/implementation/01_PROJECT_FOUNDATION.md:1`.

## 10. Do Not Modify Completed Modules Unnecessarily

A Phase 3c-gated module (Video Resume) is locked unless a documented blocker (a11y issue, security fix, product-requested change with ADR) cites specific obsolete behavior. Avoid "cleanup" PRs that rename tracked fields or reformat stored prompt templates — they create noisy diffs without value.

## 11. Before Modifying Shared Code, Inspect Its Dependencies

Shared nodes (`CareerProfileService`, `JobService`, `StorageService`, `AnalyticsService`, `lib/validation/*`, `lib/supabase/*`, `components/nav/*`) have fan-out to every module. Before editing shared code, the agent **MUST** run: `grep -R 'import.*<service>' app components lib` and `read` the dependent `page.tsx` files listed there. Skipping this check often regresses another module silently — it is a blocking step in any shared-file review.

## 12. Before Implementing a Feature, Read the Relevant Documentation

Every feature column below must be read before landing the feature:

| Feature | Read |
|---|---|
| Auth / Profile | `docs/product/01_PRODUCT_OVERVIEW.md`, `02_USER_FLOWS.md` Flow 0/1, `features.md` F-00.* |
| Video Resume | `docs/modules/01_VIDEO_RESUME.md`, `02_PUBLIC_PROFILE.md`, `05_STORAGE_AND_VIDEO.md` |
| Interview | `docs/modules/04_INTERVIEW_COACH.md`, `04_AI_ARCHITECTURE.md` Interview* services |
| Resume AI | `docs/modules/05_RESUME_AI.md`, `04_AI_ARCHITECTURE.md` analyzer section |
| Database | `docs/architecture/02_DATABASE_SCHEMA.md` (migration order + RLS), `07_SECURITY.md` |
| Deployment | `docs/implementation/06_DEPLOYMENT.md` Open Questions for cross-cut concerns |

Reporting "I've already read this" but skipping `Read` tool cost should never override a 2-second file inspection. Evidence-before-synthesis is the rule.

## 13. Before Implementing a Module, Inspect the Existing Codebase

`Read` every file listed in that module's `docs/implementation/0X*.md` Task table before scaffolding new files. If the target page was already stubbed in Phase 1 by `app/(dashboard)/layout.tsx` scaffolding, extending the stub is mandatory — do not create a shadow directory.

## 14. Follow the Established Design System

Tokens (`surface`, `secondary=#4648d4`, `outline-variant`, typography sizes, `rounded` values, shadows) map 1:1 from `careerflow_ai/DESIGN.md` and `DESIGN_SYSTEM.md:1`. Picking `#ffffff`-as-canvas while ignoring `surface-container-lowest` for cards, or inventing `custom-indigo`, is a regression and will be rejected as drift. All colour names **must** be verbatim `DESIGN.md` names so Stitch class lists remain valid.

## 15. Do Not Invent Product Requirements

The authoritative product scope is `docs/product/03_FEATURES.md:1` (status signals P0/P1/P2 + acceptance criteria). A feature not listed there without a filed decision doc + design artifact is *not* a blocker. If an agent proposes an unauthoritized requirement (e.g. recruiter chatbot on `/p/[slug]`, team accounts, Python microservice in MVP), the review must point them to `PRODUCT_SPEC.md:1 §5 Non-Goals` and `ADR-004`.

## 16. Do Not Invent User Data

Any fixture, seed, or e2e harness must use **Alex Mercer** (canonical mock name) or other explicitly named synthetic identities, not randomly hallucinated names with conflicting facets (duplicate emails, contradictory profile text). The test corpus for non-fabrication is the 12 defined synthetic resumes; inventing a 13th outside the `tests/ai/` harness is not permitted as a passing corpus.

## 17. AI Must Not Fabricate Resume Facts

Every service that emits a candidate claim (`ScriptGenerator`, `ResumeJobMatcher` talking-points, `ResumeAnalyzer` suggestion text, `InterviewQuestionGenerator` follow-ups) must include the `nonFabrication` preamble and go through `lib/ai/safety/nonFabrication.ts`. Missing evidence → `[NEEDS_USER: …]` placeholder (rendered as yellow dashed prompt card), not a hallucinated `+30%` metric. This is CID-P0 — a PR that removes the preamble without a superseding ADR fails review.

See `docs/architecture/04_AI_ARCHITECTURE.md:1`§5 and `docs/architecture/07_SECURITY.md:1`§7.

## 18. Database Changes Must Use Migrations

No app code may `supabase.from('x').insert(...)` to create a new column's implied schema without a matching `supabase/migrations/<next>.sql` file. All migrations live under `supabase/migrations/` in the documented sequence (`02_DATABASE_SCHEMA.md:1 §12`). Every new table has an `enable row level security` line and an Owner policy; an anonymous servicing exception (like the view beacon) requires an ADR footnote. `CREATE TABLE ... WITHOUT enable row level security` is enforced as a lint failure.

Cascades: all user-owned rows have `on delete cascade` from `users` — deletion cascades to private profile views, Storage keys, and interview bytes.

## 19. Security Must Be Considered for Every Feature

Each feature PR's description **must** tick `docs/architecture/07_SECURITY.md:1` Review Checklist or explicitly state why an item is `N/A` with a justification that the reviewer can verify. Until then the PR is not mergeable. Items include: `userId` from auth not body, RLS covered or documented anon exception, signed-URL TTLs, file validation (MIME+magic+size), prompt injection wrapping, public-vs-private whitelisting per added field, `axe` critical zero.

## 20. Test Existing Functionality After Major Changes

Shared edits (modules § 2–5) and security-hardening phases (7–8) must re-run: `npm run build` + `npm test` (85% gate `lib/*`) + `npm run lint`, and the following e2e happy paths if their modules shipped:

- Video Resume: `e2e/videoResume.spec.ts` (3a+3b+3c chain)
- Public boundary: `e2e/public.spec.ts` (beacon dedup + signed URL expiry)
- Interview: `e2e/interview.spec.ts` (abandon→resume, typed fallback)

See `docs/implementation/05_TESTING.md:1`. Passing requires zero regressions from before the edit.

## 21. Do Not Rewrite Working Code Without a Documented Reason

Cleanup PRs that rename `column`/`prop` names, rename tokens, or refactor shard boundaries without an open question or bug-link produce noisy history. If a rename is required (e.g. `career_profiles.summary` → `about`), it must cite a filed ADR or product-request ticket.

## 22. Keep Modules Isolated at the Business-Logic Level While Sharing Infrastructure

Each module's business logic lives under `lib/services/{videoService,interviewService,resumeAIService}.ts` and its component subtree `components/{video-resume,interview,resume-ai}/*`. Direct cross-imports like `import { videoServiceInternals } from '@/lib/services/videoService'` inside `interview/*` are forbidden — go through the shared layer (`JobService`, `CareerProfileService`, `StorageService`, `AnalyticsService`). Modules must **not** import one another's internals.

## 23. Update Documentation When Architecture Changes

If any of the following change, amend the owning doc in the same PR (no trail-docs-later exception):

| Change | Docs to amend |
|---|---|
| New `lib/ai/services/*` interface | `docs/architecture/04_AI_ARCHITECTURE.md` + `docs/decisions/ADR-003` if contract altered |
| New `supabase/migrations/*` | `docs/architecture/02_DATABASE_SCHEMA.md` migration list + RLS/audit |
| New `lib/storage/*` caps or bucket | `docs/architecture/05_STORAGE_AND_VIDEO.md` + `api` rate table |
| New route `/api/*` or page | `docs/architecture/03_API_ARCHITECTURE.md` catalogue + `04_INFORMATION_ARCHITECTURE.md` sitemap |
| Any private → public field addition | `docs/architecture/07_SECURITY.md:1`§4 boundary + `docs/modules/02_PUBLIC_PROFILE.md:1` |
| Re-stacking or library swap | `docs/decisions/ADR-001` with supersession |

## 24. Keep Modules Testable in Isolation (Phased Shipping)

Each phase's gate in `docs/implementation/06_DEPLOYMENT.md:1` is shippable behind a feature flag (`VIDEO_RESUME_MATCH_MOCK`, `VIDEO_RESUME`, `INTERVIEW`, `RESUME_AI`). Don't bundle the entire SaaS into one PR that can only build when all three modules are production-ready.

## 25. Enforce the Ia Docs Structure

Project documentation lives **only** in `docs/` (`docs/product/`, `docs/modules/`, `docs/architecture/`, `docs/implementation/`, `docs/decisions/`) plus the four root briefs (`ARCHITECTURE.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `GEMINI.md`). No documentation directory may be renamed, moved into `design/stitch/`, or replaced with ad-hoc markdown — the `dising stitch/` folder is immutable design assets, not prose. Any new decision doc must be an `ADR-xxx-*.md` file; any new product doc must be placed and numbered per `docs/product/`.

---

## How to use

At session start:

```
Read GEMINI.md (this file).
Read docs/product/01_PRODUCT_OVERVIEW.md.
Read the module doc you own and docs/decisions for its ADRs.
Run Read tool evidence checks before synthesizing advice or writing code.
```

Failure mode: an agent that *asserts* a design decision without `Read` event evidence will have its patch rejected.
