# DESIGN SYSTEM — CareerFlow AI

> Audit of all `dising stitch/` Stitch assets + `careerflow_ai/DESIGN.md`. This file is the implementation reference for `tailwind.config.mjs`, `components/ui/*`, and per-page styling. It intentionally re-states (not invents) the established tokens, so implementation PRs have a single authority to quote as `DESIGN_SYSTEM.md:line`.

---

## 1. Brand & Personality

Official phrasing from `careerflow_ai/DESIGN.md:1`:

- **The Intelligent Partner** — authoritative yet accessible. Not an "AI glow" aesthetic; authority via precision, whitespace, tonal trust.
- Aesthetic roots: **Minimalism + Modern Corporate**.
- Emotional move: **anxiety → controlled progress ("flow")**.

No extra brand element (logo animated mark, mascot) is part of the Stitch — the wordmark `CareerFlow AI` is the identifier (verbatim case).

---

## 2. Tokens — The Single Source (`careerflow_ai/DESIGN.md`)

### 2.1 Color (`tailwind.config colors` names keep the Stitch verbatim set)

#### Material-like neutrals (M3-style)

```
surface                   #f8f9ff   (alias of background)
surface-dim               #cbdbf5
surface-bright            #f8f9ff
surface-container-lowest  #ffffff   (cards — primary)
surface-container-low     #eff4ff   (hover / subtle widget)
surface-container         #e5eeff   (inputs bg, chip)
surface-container-high    #dce9ff
surface-container-highest #d3e4fe
on-surface                #0b1c30   (dark navy — text)
on-surface-variant         #45464d   (muted text)
inverse-surface           #213145
inverse-on-surface        #eaf1ff
outline                   #76777d
outline-variant            #c6c6cd   (borders)
surface-tint              #565e74
background                #f8f9ff
on-background             #0b1c30
surface-variant           #d3e4fe
secondary-fixed           #e1e0ff
secondary-fixed-dim       #c0c1ff
on-secondary-fixed        #07006c
on-secondary-fixed-variant#2f2ebe
tertiary-fixed            #e0e3e5
tertiary-fixed-dim        #c4c7c9
on-tertiary-fixed         #191c1e
on-tertiary-fixed-variant #444749
primary                   #000000   (black DARK — buttons; in some tokens indigo overrides per component — see semantics)
on-primary                #ffffff
primary-container         #131b2e   (dark button)
on-primary-container      #7c839b
inverse-primary           #bec6e0
primary-fixed             #dae2fd
primary-fixed-dim         #bec6e0
on-primary-fixed          #131b2e
on-primary-fixed-variant  #3f465c
```

#### Semantic accents (used sparingly by spec)

```
secondary                 #4648d4   Indigo — AI/resume/match accent, AI insight badge
on-secondary              #ffffff
secondary-container       #6063ee   Lighter indigo — active nav / chip bg
on-secondary-container    #fffbff
tertiary                  #000000 / tertiary-container #191c1e (reserved, rarely used selectionally)
error                     #ba1a1a
on-error                  #ffffff
error-container           #ffdad6
on-error-container        #93000a
```

M3 tokens above map directly onto every `code.html`'s `bg-surface` etc.

#### Product-level palette restatement (DESIGN.md "Colors" narrative)

The narrative layers the M3 tokens into design intention:

- **Slate/Snow canvas:** `background/#F8FAFC` style base → white cards layered over it (the real code uses `#f8f9ff` as `surface`)
- **Deep Navy authority** `#0F172A` (approximates `primary-container` above) for main editorial.
- **AI Indigo** `#6366F1` — statistically equivalent to `secondary #4648d4`; reserve strictly for AI suggestions, auto-generated content, insights. Verified usage across every Stitch variant of match/script/interview analytics.

**Rule:** Do not invent additional AI glow colours; use `secondary` / `secondary-container` / `secondary-fixed` exclusively for AI semantics.

### 2.2 Typography (Inter exclusively)

| Stitch token | Tailwind → fontSize[0] | lineHeight | fontWeight | letterSpacing | Use |
|---|---|---|---|---|---|
| `display` | 48px | 1.1 | 700 | -0.02em | Landing hero, public centered name (recruiter) |
| `headline-lg` | 32px | 1.2 | 600 | -0.01em | Page headers (Career Profile, AI Match Results) |
| `headline-lg-mobile` | 24px | 1.2 | 600 | — | Mobile fallback for headline-lg |
| `headline-md` | 24px | 1.3 | 600 | — | Section heads (Dashboard module heading, Experience role) |
| `headline-sm` | 20px | 1.4 | 600 | — | Card titles, stepper labels |
| `body-lg` | 18px | 1.6 | 400 | — | Intro paragraphs (Landing body, Profile About) |
| `body-md` | 16px | 1.6 | 400 | — | Standard body (bullets, hints) |
| `body-sm` | 14px | 1.5 | 400 | — | Chips, badges, notes |
| `label-md` | 14px | 1 | 500 | — | Card labels, sidebar items, form labels |
| `label-sm` | 12px | 1 | 600 | 0.05em + `uppercase` often applied | Metadata tags, timeline labels, kicker badges |

- Source `Inter` via Google Fonts link already in every `code.html` (`family=Inter:wght@400;500;600;700;900`). Tight letter-spacing (`-0.02em`) on display/headline is intentional — do not loosen.
- Material Symbols: `Material Symbols Outlined` (`FILL 0…1, wght 400, GRAD 0, opsz 24`) — use `text-[20px]` etc. to size explicitly where screens size per icon; `fill` variant toggled on active nav (`style font-variation-settings: 'FILL' 1`).

### 2.3 Shape

Declared in `DESIGN.md:rounded`:

```
sm      0.25rem  (4px)
DEFAULT 0.5rem   (8px)   — cards, inputs (so called "standard cards")
md      0.75rem  (12px)
lg      1rem     (16px)  — large modules, grouped buttons
xl      1.5rem   (24px)  — outer bento shells (occasional)
full    9999px   — pills / avatars
```

Shape narrative (DESIGN.md "Shapes"):

- Standard Cards/Inputs → `0.5rem` (so `rounded-lg` when Tailwind's `lg:0.5rem` — be careful Tailwind's `lg` maps to `0.5rem` here, not `0.75rem`).
- Buttons/Large Modules → `1rem`.
- Pill chips — always `full`.

### 2.4 Spacing & Layout

Declared in `DESIGN.md:spacing`:

```
base  4px
xs    8px
sm    16px
md    24px   — large component gap
lg    40px   — section vertical spacing (airyness)
xl    64px
container-max 1280px  — max-w-container-max
gutter         24px   — page-side padding (lg), else 16px on mobile
```

Grid:

- Desktop `≥1200` → 12-col, 24gutters, 40 margins (`max-w-container-max mx-auto px-gutter`)
- Tablet `768–1199` → 8-col (`md:grid-cols-12` not explicitly 8 in code — implemented as responsive grid that pairs to those counts via breakpoint collapse)
- Mobile `<767` → 4-col, 16gutters, 16margins

Verified: every mock uses `max-w-[1280px] mx-auto px-gutter` as its canvas container + `grid-cols-1 lg:grid-cols-12 gap-md|gap-gutter` bento layouts.

### 2.5 Elevation

Tonal layers (DESIGN.md "Elevation & Depth"), mapped to the `background`/`surface` swatches:

| Level | Color reference | Use |
|---|---|---|
| 0 Background | `slate-50 ≈ #F8FAFC` (~maps `surface`/`background` `#f8f9ff`) | Page canvas |
| 1 Cards/Surface | `#FFFFFF` (`surface-container-lowest`) | Primary content modules |
| 2 Active/Floating | `0px 4px 20px rgba(15,23,42,0.05)` (`level2` box shadow) | Dropdowns, modals, active hover |
| Structural border | `1px solid #E2E8F0` (`slate-200` ≈ `outline-variant/#c6c6cd` at low opacity) | Structural definition without dark borders |

Implementation details observed in mocks:

- Cards default: `bg-surface-container-lowest border border-outline-variant` (no shadow by default).
- Cards hover (dashboard/match/detail): `hover:shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition-all duration-200`.
- `boxShadow.level2` token in `tailwind.config` is the level2 hover.
- Group `group-hover:` patterns (icon dot bg swapping to `primary`/`secondary`) are used across dashboard to indicate clickability.
- `glass-panel` / `glass-card` via `backdrop-blur + rgba(255,255,255,0.7|0.95)` is used for hero overlays (landing) and intermediate cards (Interview Setup) — keep compositor-friendly `backdrop-filter` use limited to hero layers.

### 2.6 Z-Index (observed convention)

- Sidebar fixed `z-40`, TopNav `z-50`, modal/Drawer `z-60+` (implicitly via Sheet), video recorder controls floating `z-20` above gradient layers.
- Public recruiter top bar → `z-50` shadowed.

---

## 3. Components (Shared Primitive Audit)

Build to be **derived** from shadcn/ui + the class patterns observed (no rewrite per page as ad-hoc div). The table below is the contract: use shared component `X` wherever that UI is needed.

| Component | Prescribed import (planned) | Stitch construction pattern | Props / states |
|---|---|---|---|
| **SideNavBar** | `components/nav/SideNavBar.tsx` | `hidden lg:flex flex-col h-screen fixed left-0 top-0 … w-64 z-40 … bg-surface-container-lowest` + active row (`bg-secondary-container text-on-secondary-container font-bold rounded-lg scale-95`) + hover (`hover:bg-surface-container-high`) + bottom CTA `New Application` (`bg-primary text-on-primary`) | Props `active: NavKey` + `user:{name,avatar?}` |
| **TopNavBar** | `components/nav/TopNavBar.tsx` | `fixed top-0 w-full z-50 flex justify-between items-center px-gutter h-16 bg-surface border-b border-outline-variant` | Wordmark left, bell+avatar right |
| **RecruiterNav** | `components/nav/RecruiterNav.tsx` | Same h-16 bar but right side **Save Profile** (`bg-secondary-container …`) + **Share** (`border border-outline-variant`) only | No dashboard nav within |
| **Button** | `components/ui/button.tsx` | Primary `bg-primary text-on-primary`; Secondary/AI `bg-secondary text-on-secondary` (+ soft white inner glow overlay `.ai-glow/.ai-glow-btn`); Ghost `border border-outline-variant hover:bg-surface-container` | `size: default|sm|lg`; `variant: primary|secondary|ghost` |
| **Card** | `components/ui/card.tsx` | Base: `bg-surface-container-lowest rounded-xl border border-outline-variant` (fallback: `shadow-sm hover:shadow-[…]` → add as class) — no shadow by default per DESIGN.md | Optional `hoverable` |
| **Badge / Chips** | `components/ui/badge.tsx` | Pill `px-2|3 py-1 rounded-full border/rounded-lg text-label-sm` — families: `surface-container text-on-surface variant` vs `surface-bright` soft; indigo-50 for AI; `error-container` red for missing skills | `variant` enum |
| **Inputs** | shadcn `Input`, `Textarea` | `rounded-lg bg-slate-50/Surface text-body-md border-outline-variant` → focus `focus:border-secondary focus:ring-1 focus:ring-secondary` | z + RHF binding |
| **Stepper** | `components/ui/stepper.tsx` | Row `flex items-center gap-2` circles `w-8 h-8 rounded-full` (`bg-secondary text-white shadow-level2` active vs `bg-surface-container-highest text-on-surface-variant border`) + connectors `border-t-2 border-outline-variant -mt-6` | Video Resume 3-step code extracted separately per workflow page's header (no shared widget component needed) |
| **Progress bars** | (`components/video-resume/MatchScoreRing.tsx` + `components/interview/ProgressBar.tsx`) | Score ring: SVG ring `r 45`, `stroke-dasharray 282.7` (see 5.2); bar: `h-2 bg-surface-container rounded-full > div bg-secondary` (ratio variable) | |
| **Video hero** | `components/public-profile/HeroVideo.tsx` | Dark `aspect-video bg-inverse-surface … overflow-hidden`, cover + `bg-gradient-to-t from-primary/80 to-transparent`, centered play button `w-24 h-24 bg-secondary rounded-full shadow-xl` + label | Prop `signedUrl`, `onPlay` |
| **Resume card content** | `components/public-profile/ResumeCard.tsx` | Single `p-8 md:p-12 gap-12` within white card `rounded-xl border border-outline-variant shadow-sm` — contains `Professional Experience` … `Skills & Tools` stacked | Props: `experiences`, `education`, `skills` |
| **AI Insight badge** | styled `<span>` inline | `bg-indigo-50 text-secondary rounded-[4px] text-label-sm font-label-sm px-2 py-1 border border-secondary/20` + `auto_awesome` icon at 14px | Used across match, script, interview live, results recommendation |
| **Dialog/Sheet** | shadcn `Dialog`, `Sheet` | Exit confirmation (interview live), permission helper (recorder), mobile drawer | Single import style across pages |
| **Loading states** | shadcn `Skeleton` + per-page loader | No new spinner system; bento skeleton: `Skeleton` rows grid + short spinners for AI pending (inline `AnimiateSpin` when needed) | Triad required per page |
| **Error / Empty** | `components/shared/ErrorAlert.tsx`, `EmptyState.tsx` | Empty: illustration + `Create…` CTA; Error: red chip + `Retry`; both `font-body-md text-on-surface-variant` + `primary` CTA | Consistent across modules |

**Import rule:** if a component matches an existing row, reuse it — **do not** invent a second `VideoCard` when `HeroVideo` + `Card` cover the use case. Lint rule to watch: second-generation page PRs that copy-paste `bg-surface-container-lowest rounded-xl p-md …` inline instead of importing `Card` will be rejected as drift.

### 3.1 Color Semantics Observed Across Mocks

- `secondary` / `secondary-container` are **always** AI/action (Match, script Generate, Interview start) — never chip-outline only.
- `primary-container`/`on-primary-container` are **contact/preview** actions (Contact Alex, View Resume on public); `primary` is core dashboard CTA button.
- Green/red/yellow **status dots** (strong/partial/missing, ternary) appear in skill breakdown and interview `Needs Work` contexts — keep small `w-2 h-2 rounded-full` pattern.
- Material Symbols active icon `fill=1` toggled when `active` (dashboard cog / side nav): `style font-variation-settings: 'FILL' 1`.
- Dark panels (Quick Actions `#primary` card, recorder `neutral-900`, overall-score cards) use white/white/10% via `bg-white/10`, `text-on-primary`, `inverse-surface` etc. — no leaking dark contrast issues.

---

## 4. Page-Level Patterns (Stitch Composition Notes)

### 4.1 Verified Canvas Max-Widths

- Marketing Landing title ~ hero 716px min-height concept: centered CTA + image bento + floating badge (`glass-panel` + `ai-glow`).
- Dashboard + Career Profile: `max-w-[1280px] mx-auto p-md lg:p-lg lg:pt-xl` → **Bento** first-class: columns (12col → `md:col-span-8|4` mixes) with **gap-sm/lg:gap-md**. (Stitch dashboard uses `lg:gap-md` right).
- Video Recorder / Interview Live: `max-w-[1600px]` on the most immersive page, not 1280.

### 4.2 Mobile Collapse

- 1024 threshold (`lg:hidden` vs `hidden lg:flex` is the dark horse of every mock's sidebar decision). The rule: **desktop sidebar `w-64` collapses at `lg`**, Video Recorder uses a **collapsed rail `w-20`** icon-only alternative at `md:flex` (icon at `w-12 h-12`).
- Bottom nav family (`video_resume_match_job`, `interview_coach_setup`, `interview_coach_results`) structure: `fixed bottom-0 h-16 border-t bg-surface` with 4 items centered; on Live recorder the bottom centre floating pill (`bg-error` Stop) is the alternative (a single action island, not a full nav bar).

### 4.3 Typography Usage Samples

- Landing `text-display` combined with inline `<span class="text-secondary">Career Advantage</span>` trick is per-spec for emphasized word.
- Landing reassurance line `Intelligent Career Partner` as pill (`bg-surface-container-high px-3 py-1 rounded-full w-fit` + indigo dot `w-2 h-2 bg-secondary rounded-full` + label-sm).
- Landing proof line `Joined by 10,000+ professionals` using `-space-x-2` avatar triplets + body-sm.

---

## 5. Data Visualizations (Score Indicators — critical across modules)

### 5.1 Circular Score Ring (Video Match / Analytics KPIs)

Construct in `components/video-resume/MatchScoreRing.tsx`:

```html
<div class="relative w-40 h-40 flex items-center justify-center my-md">
  <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" fill="transparent" stroke="#e2e8f0" stroke-width="8"></circle>
    <circle cx="50" cy="50" r="45" fill="transparent"
      stroke="#4648d4" stroke-dasharray="282.7"
      stroke-dashoffset="${282.7 * (1 - score/100)}" stroke-width="8"></circle>
  </svg>
  <div class="absolute flex flex-col items-center">
    <span class="text-display font-display text-primary">82<span class="text-headline-md">%</span></span>
  </div>
</div>
```

MATH: circumference `2πr = 2*π*45 = 282.743…` round to `282.7` as used in code. Label "Overall Match" below: `text-label-md text-on-surface-variant uppercase tracking-wider`. Caption under ring includes gap inference note (seen in both match + analytics mocks). This is the correct implementation reference — do not use a library `Pie` for the hero score ring (the SVG dash path renders faster and matches mocks pixel-perfectly).

### 5.2 Performance Bars (Interview Results / Distribution)

`w-full h-2 bg-surface-container rounded-full overflow-hidden > div h-full rounded-full` width set via `style width: XX%`. Color: `bg-secondary` when bar represents strong (≥70) vs `bg-tertiary` when weak (<70) — matches `interview_coach_results` construction. Label row uses `flex justify-between font-label-md`.

### 5.3 Progress Stepper (Video Resume 3-step)

`flex items-center mb-xl max-w-3xl mx-auto` of active `bg-secondary` circle + connectors `border-t-2 border-outline-variant -mt-6` + inactive `bg-surface-container-highest border border-outline-variant`. On recorder variant, connector shows checkmark on `1 Setup` custom dot (icon inside). This is a local header, not a global component — but composition must match the verified stepper clip.

---

## 6. Responsive Behaviors

| Breakpoint | Grid | Sidebar | Page example | Verified |
|---|---|---|---|---|
| ≥1200 | 12 col | Fixed `w-64` (`user_dashboard`, `career_profile`, `video_resume_match_job` setup version) | Dashboard bento (8/4 + 3/3/3/3) | yes |
| 768–1199 | 8 col | Fixed `w-64` or collapsed `w-64` (matches tablet `md:`) | Match Results (lg:grid-cols-12 collapses to stack) | yes |
| <767 | 4 col | Hidden → TopNav (`h-16`); bottom nav appears for focused workflows; for Home/Dash collapses to hamburger → Sheet | Landing stacks, Career Profile stacks, Interview Setup stacks | yes |
| Recorder-specific | `md` rail `w-20`, not collapsed to drawer | `hidden md:flex` vertical icons at `w-12 h-12` | Video Recorder minimal shell | inspected `video_resume_recorder` left `w-20` rail |

Spacing shift between breakpoints uses Tailwind `md:` / `lg:` — do not add arbitrary breakpoints beyond Tailwind defaults + `container-max/gutter`.

---

## 7. Observed but Resolved Divergences Across Stitch Variants

During audit, 4 public-page HTML files varied (`public_profile` vs `public_recruiter_profile` vs `simplified_*` two). Rather than picking inconsistently, the canonical decision (`docs/decisions/ADR-004-MINIMAL-PUBLIC-PROFILE.md:1`) selects **simplified_resume_public_profile** as the spec. Implementations of `/p/[slug]` must resist importing richer bento patterns from the rejected variants — which would reintroduce performance/privacy debt.

Sidebar header also drifted across mocks: `Active Career Profile` as text-only (`video_resume_match_job`) vs avatar+name+label (`career_profile`/`interview_setup`/`user_dashboard`). Canonical is **avatar thumbnail (40×40) + name `label-md semibold` + label-sm `Active Career Profile`** per the audit in `docs/product/04_INFORMATION_ARCHITECTURE.md:1`. Unified component fixes the drift.

---

## 8. Implementation Checklist for Tailwind + shadcn

- [ ] `tailwind.config.mjs` `colors` object includes the full `surface…primary…secondary…error…surface-variant` map verbatim from `design/stitch/careerflow_ai/DESIGN.md` (keeps `bg-surface` etc. reusable across every mock).
- [ ] `tailwind.config.mjs` `borderRadius` (`DEFAULT:0.25rem lg:0.5rem xl:0.75rem full:9999px`) + `spacing` (`base 4px … container-max 1280px … gutter 24px`) + `fontFamily` all `Inter` + mapping.
- [ ] `plugins: [require('@tailwindcss/forms'), require('tailwindcss-animate')]`.
- [ ] `shadcn.json` baseColor `slate` (closest to `surface` neutrals) + `cssVariables:false` (use Tailwind tokens, not CSS variable fallback) unless `next-themes` considered.
- [ ] Imported primitives: `button, card, badge, input, textarea, label, dialog, sheet, skeleton, separator, tabs`.
- [ ] No custom colour *name* invented: `custom-indigo` etc. is rejected — reuse `secondary` token.
- [ ] No added `box-shadow` constants beyond `level2` — keep `shadow-sm` + hover `shadow-[0_4px_20px_rgba(15,23,42,0.05)]` as observed.
- [ ] Global font import: `next/font/google` `Inter` (or Google Fonts `link`) with `display=swap`.
- [ ] Material Symbols `link` (`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap`) included via `app/layout.tsx` once.
- [ ] Root `<body class="bg-background text-on-background font-body-md antialiased">` — no bare `bg-white`.

---

## 9. Known Unknowns (Before-Polish Open Questions for Design)

- `Resume AI` has zero Stitch. The component contracts above (Card, Buttons, badge) are sufficient to lay it out in a **two-pane editor** pattern, but sign-off is required on Type of diff highlight colors (`bg-secondary-container` vs neutral). Recorded as `O-003` in `docs/implementation/06_DEPLOYMENT.md:1`.
- `My Applications` table has no dedicated mock — proposal is an extended Dashboard table with filters; captures as `O-001`.
- `Interview Progress` history chart has no mock — `recharts` proposed; track `O-002`.

