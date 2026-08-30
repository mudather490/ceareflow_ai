# ADR-004 — Minimal Public Recruiter Profile

- **Status:** Accepted
- **Date:** 2026-08-30 (Phase 0)
- **Deciders:** UX Systems Architect + Product Architect (Phase 0 agent)
- **Related:** `docs/modules/02_PUBLIC_PROFILE.md:1`, `docs/product/01_PRODUCT_OVERVIEW.md:1`§3, `docs/architecture/07_SECURITY.md:1`§4
- **Artifacts inspected:** 4 public-page Stitch variants under `dising stitch/`

---

## 1. Context

Product spec §3 **Step 3** defines the public recruiter page as *intentionally minimal*: the recruiter should immediately understand who, what role, watch video, view/download resume, and copy the link — **nothing else**. Four HTML variants shipped in `dising stitch/` range from the extracted minimal (hero + resume card) to a full bento dashboard with AI insights, skill grids, and project portfolios.

Which variant is the implementation reference had to be decided before a developer could lay out `app/p/[slug]/page.tsx`.

## 2. Decision

Implement the **Minimal Centered** variant only:

**Chosen reference:** `dising stitch/simplified_resume_public_profile_careerflow_ai/{code.html,screen.png}` and the layout-equivalent `simplified_public_profile_careerflow_ai/code.html`.

Structure:

```
Top bar: CareerFlow AI + [Save Profile] [Share]
Centered header: display name + headline-sm subtitle + centered action row (Play Video primary, Download Resume, LinkedIn optional)
Video hero: aspect-video, rounded-xl, prominent centered play CTA (w-24/secondary + label "Play Introduction Video")
Single white resume card (p-8/md:p-12): Professional Experience → Education → Skills & Tools sections stacked vertically
max-width 4xl centered (not 12-col bento) — no sidebar
```

## 3. Rationale (Why this variant)

| Criterion | Minimal (chosen) | Full Bento (rejected) | Improvement |
|---|---|---|---|
| Time-to-video | 0 scroll — hero dominates first viewport | Video competes with AI-highlight+skills grid + projects bento; recruiter scrolls past ancillary content | Faster play rate (primary conversion) |
| AI data leakage risk | Zero — no JD, score, match, or script shown | Leaks alignment score / talking-points — violates public/private boundary (`docs/architecture/07_SECURITY.md:1`§4) | Fewer private-data paths to audit |
| Implementation drift risk | Smallest component set; single resume card → a single SSR + signed URL batch | Multiple sidebars (skills/tools/projects) → invites adding new dashboards later without ADR | Cheaper to keep minimal |
| Design-token match | Uses validated tokens (secondary play button, surface chips) verbatim | Uses the same tokens but with denser layout making mobile stacking harder | Less mobile stacking debt |

## 4. Alternatives and Rejected Variants (Recorded)

### Rejected A — `public_profile_careerflow_ai/code.html` ("Rich Bento Profile")

Grid `md:grid-cols-12`: left `md:col-span-8` (video + AI insights + experience timeline) and right `md:col-span-4` (Core Competencies chips + Tools + Featured Projects bento). Contains "Why I'm a Strong Match" — two-column AI insight cards that assume access to `job_matches` and will eventually leak. Also shifts resume away from single-column readability.

**Reject reason:** violates spec §3 "Do NOT put … AI recommendations / large skill matrix / career dashboard on the public page."

### Rejected B — `public_recruiter_profile_careerflow_ai/code.html` ("Full Resume Viewer")

Also single-column resume content but still carries `View LinkedIn Profile` as a 4th header button + extra secondary navchrome + header `01:45` badge micro-clutter.

**Reject reason:** accumulates share-row buttons beyond need; header tile takes premium above-the-fold pixels.

### Corroborating, not chosen — `simplified_public_profile_careerflow_ai/code.html`

Layout-correct (centered header / hero / resume container) but the `code.html` file is truncated (placeholder comment before Experience) — kept as proof the layout idea recurs but implemented via the complete `simplified_resume_*` variant.

## 5. Consequences

- **Positive:** Recruiters hit video + resume fastest; private AI state (score, talking points, scripts, analytics) is physically not rendered — fewer RLS + signed-URL paths to audit.
- **Positive:** Responsive stacking is trivial (centered column); no 12-col / 8+4 split to collapse.
- **Negative:** Candidate testimonials requesting "show my AI match on the public page" will look like missing feature vs. real-duration constraint — answer: link to Owner Analytics private answer (`GET /analytics?profileId=`). If unsatisfied, the escalation path is this ADR.

## 6. Compliance

- No PR in Phases 3–6 may add to `app/p/[slug]/page.tsx` any of: analytics widget, AI match dashboard, job description body, skill matrix beyond single `Skills & Tools` chip cloud, interview information, or a chatbot — unless this ADR is superseded with a new wireframe approved by design + product.
- Any community PR or feature branch that pulls in a richer mock has its merge gated on the *minimal* acceptance checklist in `docs/modules/02_PUBLIC_PROFILE.md:1`§8 (axes + Lighthouse thresholds).
- A future upsell variant (e.g. customizable recruiter themes) needs a new `ADR-004.1` with a design artifact, break-glass procedure, and updated boundary table in `docs/architecture/07_SECURITY.md:1`.

## 7. Amendment Path

To upsell to a richer public page without weakening minimalism:

- Ship an `is_rich_public` flag off by default, behind a non-default route (`/p/[slug]/rich`) with a separate view-allow-list (still no AI match unless explicitly permitted).
- Amendment PR must re-open this ADR as `Superseded by ADR-004B — Rich Public Profile Option`.
