# Implementation — 05 Testing

> What "tested" means before merging into the main branch or cutting a Vercel preview of any phase. No phase is considered complete without passing its listed tests.

---

## 1. Test Philosophy

- **Shifts-left:** `zod` validation, AI output schema conformance, and RLS owner-checks are unit-tested with real schema objects and mock provider — not with live API calls.
- **Offline CI:** default `npm test` does not require `GEMINI_API_KEY` or Supabase reachable; `MockProvider` satisfies every AI path. Optional `npm run test:live` (offline-safe) is gated behind `GEMINI_API_KEY` and skipped in CI if absent.
- **Triad:** every page is verified in loading → empty → error → happy states (see `DESIGN_SYSTEM.md:1`). Missing any state is a failing review.
- **Security-in-CI:** IDOR + RLS probes, magic-byte validation, and rate-limit probes are part of CI, not manual pentest.

---

## 2. Test Matrix by Phase

| Layer | Tools | What it covers | Runs where |
|---|---|---|---|
| **Unit: validation** | jest / vitest + `zod` | Every `lib/validation/*.ts` schema rejects invalid + accepts boundary valid | CI |
| **Unit: AI output schema** | vitest + MockProvider fixtures | 50+ generated outputs parse against each `zod` output schema (prompt is not sent — mocked data fixture covers shape) | CI |
| **Unit: storage helpers** | vitest | `lib/storage/*.ts` rejects malformed inputs, builds correct storage paths, preserves mime logic | CI |
| **Unit: rate limiter** | vitest (in-memory store) | `lib/rateLimit.ts` increments correctly, 11th denied | CI |
| **Non-fabrication suite** | vitest + MockProvider corpus | Resumes+profiles intentionally missing metrics never yield a fabricated number | CI |
| **Component snapshot / visual** | Playwright component + `axe-core` | RLS guard components render correct empty/error shells | CI |
| **E2E (playwright)** | Playwright | Auth gating, match flow, public page boundary, signed URL expiry repro via local supabase mock | Preview/CI |
| **Manual QA (live)** | human + optional `.env` live provider | Verifies `+X%` non-fabrication under live Gemini answers, visual regression vs Stitch at 1440/1024/375 | Pre-release |

---

## 3. Suites in Detail

### 3.1 Validation suite

Location `tests/validation/` — one file per `lib/validation/*.ts`.

Sample: `validation.jobs.test.ts`

```ts
import { jobSchema } from '@/lib/validation/jobs';
test('rejects JD under 50 chars', () => {
  expect(() => jobSchema.parse({ title:'PM', company:'Acme', description:'Too short' })).toThrow();
});
test('dedup hash collision is same lower/title+company+JD', () => { /* hash function test */ });
```

Expected coverage per schema: happy + boundary + one injection payload attempt (`<script>alert(1)` in title must be accepted as text but escaped on render — not rejected here).

### 3.2 AI output schema suite

Location `tests/ai/`.

For each provider path `tests/ai/fixtures/<serviceName>.json` (50 entries), run:

```ts
import { scriptOutputSchema } from '@/lib/validation/aiOutputs';
for (const fixture of fixtures['scriptGenerator']) {
  expect(() => scriptOutputSchema.parse(fixture)).not.toThrow();
}
```

Include MockProvider live invocation (mock generates from template, not calling network): `new MockProvider().scriptGenerator.generate(args)` → parse.

### 3.3 Non-fabrication corpus

Location `tests/ai/nonFabrication.test.ts`.

Corpus: 12 synthetic resumes + 12 aligned profiles deliberately lacking one metric/skill each (e.g. no Python).

Check: for script generated from each entry, the output must **not** contain any of `['python','sklearn','+','%']` (case-insensitive for technology; `%` and `+NN%` metrics forbidden when not in `allowedFacts`). Conversely, when corpus entry DOES contain Python, output may mention it.

Test is mocked (doesn't call live Gemini) — but a manual `test:live` spot-check replicates one entry via real provider and a human confirms in report.

### 3.4 Storage & upload suite

`tests/storage/` — verifies helper rejects:

- non-PDF file with `.pdf` name but non-pdf mime/type
- `video/webm` blob over 100 MB flagged (`413`)
- filename with traversal `../../secret.pdf` is ignored (new UUID used, never `file.name`)

### 3.5 RLS / IDOR probes (integration)

Location `tests/api/idore2e.test.ts` (Playwright or jest with Supabase local).

Steps:

```ts
// helper: two signed-in users (Alice, Bob) via test harness
const aliceMatch = await createMatchAs(alice, { title:'ML Eng', ... });
const res = await fetch(`/api/video-resume/match/${aliceMatch.id}`, { headers: bearer(bob) });
expect(res.status).toBe(403); // not 200 and not 404 leakage
```

Same for `analytics`, `resume_analyses`, `interviews` read-by-other-user.

### 3.6 End-to-end (Playwright)

Location `e2e/`.

| Spec | Covers |
|---|---|
| `e2e/auth.spec.ts` | Unauth redirect, signup validation, Google click wiring, session persistence |
| `e2e/videoResume.spec.ts` | Full flow `upload→match→results→script→video fallback→publish→public` (video capture stubbed via mock blob) |
| `e2e/public.spec.ts` | Public page renders only public fields; `view` beacon fired, dedup check (double POST count stays 1), signed URL expiry repro (mint then expire window) |
| `e2e/interview.spec.ts` | Setup → live (two questions stubbed) → results bento; abandon+resume; typed fallback |
| `e2e/resumeAi.spec.ts` | Analyze → editor diffs → accept → apply → new version appears |
| `e2e/accessibility.spec.ts` | `axe` scan on landing, dashboard, career-profile, public page — no serious violations |

All E2E run against a locally seeded Supabase instance or the preview env with a **test tenant** and clean-before-each-disposable-user, never against prod.

### 3.7 Visual / a11y

- **Visual regression** vs Stitch screenshots: run `playwright screenshot` of pages at 1440 (desktop), 1024 (collapsed), 375 (mobile). A `threshold 3%` diff checked between reference (Stitch asset-derived HTML fixture) and rendered Next.js route.
- **axe** runs on every e2e spec via `@axe-core/playwright` — `violation.critical === 0`.

### 3.8 Load / smoke (pre-release, not CI default)

- Analytics aggregate: seed 500 views/viewOneProfile, then `GET /analytics?profileId=` asserted < 500 ms p95 (10 parallel).
- Video match latency: 10 sequential match calls p95 < 8s on mock path (<2s expected) and documented on live path (<10s with network).

---

## 4. Coverage Gates

| Metric | Gate |
|---|---|
| Line coverage for `lib/validation` + `lib/services` + `lib/ai` | ≥ 85% (measured via `vitest --coverage`) |
| RLS probe specs | must exist for every table that holds `user_id` |
| Non-fabrication corpus | 12 cases mandatory; CI fails if suite file deleted |
| e2e critical path | must cover the 4 happy paths: videoResume, public boundary, interview, resumeAi |

Coverage on `app/*` page components is NOT gated — Playwright provides heuristic coverage there.

---

## 5. Failure Handling

- Failed `vitest` blocks PR.
- `axe` `critical` violation blocks PR.
- Server `GEMINI_API_KEY` absence does **not** block PR — it disables `test:live` but leaves `test` green because `MockProvider` covers every AI route.
- Flaky e2e (network) retried 2 times by Playwright; 3 consecutive failures requires human investigação before override.

