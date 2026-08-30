# Module 02 — Public Recruiter Profile

> The recruiter-facing page at `GET /p/[slug]`. This is the ONLY module where the viewer is unauthenticated, uses an isolated shell (no dashboard sidebar), and is intentionally minimal.

**Chosen reference:** `simplified_resume_public_profile_careerflow_ai` and `simplified_public_profile_careerflow_ai` (minimal). Other inspected variants are listed as **rejected** below.

---

## 1. Product Principle

> The public profile should be **minimal, professional, fast, recruiter-focused.** It is not a dashboard.

A recruiter has ~30 seconds. Their next action after scanning is one of:

- Play the introduction video
- View / Download the resume
- Click LinkedIn / contact
- Copy the link to share with hiring team

If the recruiter must hunt for the video, scroll past analytics, or parse a skill matrix dashboard, the design has failed. (`ADR-004-MINIMAL-PUBLIC-PROFILE.md:1`)

---

## 2. Canonical Structure (The implementation target)

Rendered server-side (ISR-capable) at `/p/[slug]` without auth, inside the **Recruiter Shell** (not the dashboard shell):

```
<nav:  h-16  CareerFlow AI (left)   [Save Profile] [Share] (right)   border-b bg-surface
<main class="max-w-4xl mx-auto px-sm md:px-gutter">

  <header: centered, mt-8>
    <h1: display> Alex Mercer
    <p: headline-sm secondary> Senior Product Designer
    <div row gap-4 wrapping>   (buttons, centered)
      [Play Introduction Video]   bg-primary-container text-on-primary-container (primary)
      [Download Resume]           border outline-variant
      [LinkedIn Profile]          border outline-variant (optional; only if profile link supplied)
    </div>
  </header>

  <card: aspect-video hero>   (rounded-xl, border, shadow-sm, overflow-hidden)
    [background cover + gradient overlay]
    [centered: w-24 h-24 bg-secondary play_arrow button + "Play Introduction Video" label]
    [or <video controls> after click — inline playback, not modal]
  </card>

  <card: white resume container p-8 md:p-12>   (bg-surface-container-lowest border-outline-variant rounded-xl shadow-sm)
    <section: Professional Experience>
      (role + company | date pill; bullets; ~2 entries)
    <section: Education>
      (degree + institution | date pill)
    <section: Skills & Tools>
      (chips: surface-container + surface-bright secondary list, rounded-lg, border-outline-variant/30)

</main>
```

Key measurements from the chosen variant:

- Page `max-w-4xl` centered, **not** `max-w-[1280px]` + left gutter used in dashboard; no sidebar.
- Resume card is a **single** container with internal `gap-12` between sections, not multiple bento blocks — reduces scroll fragmentation.
- Chips: two visual groups (core skills `surface-container text-on-surface`, tools `surface-bright text-on-surface-variant`) but both `rounded-lg` `border border-outline-variant/30` — keep this distinction.
- Video hero foreground: stacked column `play button + label`, centered — larger affordance than a dark thumbnail with small play chevron.

---

## 3. Rejected Variants (Document for governance)

These inspected mocks are **NOT** implementation targets. They are kept as anti-patterns to avoid drift:

### Rejected A — `public_profile_careerflow_ai` ("Full Bento")

- Grid `md:grid-cols-12` with **left 8col** (Video + AI Highlights + Experience) and **right 4col** sidebar (Core Competencies chips + Tools grid + Featured Projects bento + Portfolio button).
- Issues: two-column recruiter layout hides resume content below the fold behind ancillary projects/tools; extra chrome ("Why I'm a Strong Match" AI insight + 2-column highlight cards) leaks private AI match analysis into the public view. Rejected: violates "public profile MUST NOT show AI match dashboard" (Product Vision §3).

### Rejected B — `public_recruiter_profile_careerflow_ai` ("Resume Viewer")

- Similar to A but shifts to `max-w-container-max` with Experience + Education + Skills as a single-column `resume content` inside left col, still with extra nav actions and multi-section layout.
- Issue: While cleaner than A, still carries `View LinkedIn Profile` as a fourth button in header row (excess row), and retains `bg-surface-container-highest` video header bar with `01:45` badge that adds seconds to recruiter comprehension time versus the stacked centered play CTA.

### Weak Keep — `simplified_public_profile_careerflow_ai` (same minimal but truncated)

- Structurally correct (centered header, hero, resume bucket) but the HTML file is a w3c cut: AI Highlight comment + empty Experience comment placeholders; missing footer resume card content. Serves as layout corroboration but the full content version (`simplified_resume_public_profile_careerflow_ai`) is the spec.

**Decision recorded:** `ADR-004` prefers the **Minimal Centered** variant. Future PRs adding AI dashboard elements to `/p/[slug]` will be rejected unless the ADR is superseded.

---

## 4. Public vs Private Data Boundary

| Data | Public (`/p/[slug]`) | Private (owner) | Internal AI-only |
|---|---|---|---|
| Name, title, location, summary | ✓ | ✓ | — |
| Experience / Education / Skills (from `resume_version`) | ✓ | ✓ | — |
| Video (signed stream) | ✓ | ✓ | — |
| Resume PDF (signed URL) | ✓ (View/Download) | ✓ | — |
| Contact email (if opted in) | ✓ (mailto) | ✓ | — |
| LinkedIn / portfolio links | ✓ | ✓ | — |
| `job_title` / `company` / `job_description` | **No** | ✓ (`jobs` page) | Used in match/script generation |
| `job_matches` / score / talking points | **No** | ✓ (match result page) | ✓ |
| `scripts` content | **No** | ✓ (owner editor) | ✓ |
| `public_profile_views` / analytics | **No** | ✓ (`/analytics`) | — |
| `interviews` / feedback | **No** | ✓ | ✓ |

**Implementation guard:** The `GET /api/public/:slug` handler must explicitly **pick** public fields; never `select *` from `public_profiles JOIN jobs`. Add a DB view `public_profile_public_view` that whitelists columns.

---

## 5. Routing & Data Flow

```
User publishes:  PATCH /api/public-profile/:id { isPublished: true }  →  slug immortal

Recruiter visits: GET /p/:slug
  └─ page.tsx (server) → supabase.from('public_profiles').eq('slug', slug).eq('isPublished', true).single()
       ├─ 0 rows → render 404 (generic)
       └─ 1 row  → fetch video signed URL (ttl 300s), resume signed URL (ttl 60s), render sections SSR
                → client island fires POST /api/public/:slug/view (analytics beacon, fire-and-forget)

Recruiter clicks:
  Play → <video src=signedUrl controls autoPlay> inline (no modal)
  View Resume → window.open(signedResumeUrl, '_blank')
  Download CV → anchor download via signed URL with Content-Disposition
  Copy Link → navigator.clipboard.writeText(location.href)
```

**No SSR secrets:** No AI keys, no `job_matches`, no private rows delivered.

### Caching

- `GET /p/[slug]` uses `revalidate = 300` (5 min) + `stale-while-revalidate`; unpublished slugs are not cached.
- Signed URLs are never cached; they are generated per-request server-side.
- Analytics beacon is `cache: 'no-store'`.

---

## 6. Accessibility & Performance Requirements

- LCP < 2.5 s on 4G; video poster image is optional (do not block LCP); `font-display: swap` already in mocks for `Inter`.
- Keyboard: Tab order is Header buttons → Video play → Download/LinkedIn → Resume card; focus ring on all affordances.
- Contrast: validated via tokens (`on-surface` on `background`), secondary indigo passes AA on white.
- Captions: if candidate transcript is available, expose `<track kind="captions">` (future).
- `axe` and Lighthouse (Performance ≥ 90, Accessibility ≥ 95) gate in CI (`docs/implementation/05_TESTING.md:1`).

---

## 7. Security Requirements

See also `docs/architecture/07_SECURITY.md:1`.

- Slug is 8–10 char `nanoid` (alphanumeric case-sensitive), not sequential, not derived from `user_id` or `jobId`.
- RLS: `public_profiles` `SELECT` is split:
  - `FOR public` (anon) allowed ONLY when `isPublished = true`, via a **policy that uses the public anon role** scoped to the whitelisted view — actual rows selectable only through the service-role handler that applies the same condition.
  - Owner uses standard `user_id = auth.uid()` policy.
- Signed URL TTL is intentionally short (resume 60 s, video 300 s) to prevent leaked links from being reusable.
- View beacon: rate-limited (10/h/IP), no PII persisted (see `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:1`).
- No IDOR: `/p/[slug]` takes a `slug` not a `profileId`; guessing another user's slug yields either 404 or that user's public content (which is public by design) — not their private jobs/matches.

---

## 8. Acceptance Criteria (P0)

- [ ] `GET /p/[slug]` with published slug renders only centered header + action row + video hero + single resume card — no AI insights, analytics, or sidebar.
- [ ] Video play is prominent (≥ 96 px play button + label), plays inline with native controls, not a modal that hides resume.
- [ ] Download CV triggers short-lived signed URL attachment; View Resume opens printable PDF.
- [ ] Copy Link copies canonical `/p/{slug}` URL; toast confirms.
- [ ] Invalid or unpublished slug returns indistinguishable generic 404; no timing oracle.
- [ ] Page passes axe + Lighthouse CI thresholds.
- [ ] Private `GET /analytics?profileId=` is **not** reachable from public page markup (no link leakage).

---

## 9. Future Enhancements (P2 — deferred)

- Custom domain (`career.acme.dev`) via reverse proxy + slug alias — requires DNS + verification.
- Password-protected public profile (`isProtected`, `passwordHash`) — not in MVP.
- Branded theming per profile (accent color pick) — needs design addition.
- Recruiter contact capture (form → owner notification) — defer until legal review.

