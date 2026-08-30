# Module 03 — Public Profile Analytics

> Private analytics for the owner of a published recruiter profile. This page is **never** visible to the recruiter. It answers: "Who is viewing my profile? Which link is working? Should I adjust my resume?"

Ships as **Phase 4** (immediately after Video Resume) — intentionally separated so the public profile can publish first, and analytics can be driven without expanding the recruiter attack surface.

---

## 1. Purpose & Scope

Instrumentation reports that help the candidate understand reach and conversion without leaking PII of visitors:

- How many (and how uniquely) the public profile has been viewed
- Whether viewers watched the video and/or opened the resume
- Where they came from (referrer family, channel) and on what device/region

**Non-goals (MVP):** IP-level identification, heatmaps, session recordings, Open Graph scraping, recruiter contact resolution.

---

## 2. Data Model (conceptual; full DDL in `docs/architecture/02_DATABASE_SCHEMA.md:1`)

### `public_profile_views`

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID PK | |
| `public_profile_id` | FK `public_profiles.id` | scoped |
| `viewed_at` | timestamptz | default `now()` |
| `ip_hash` | text nullable | `sha256(ip + dailySalt + profileId)` — dedup only, not reversible |
| `user_agent` | text nullable | parsed to device bucket |
| `referer` | text nullable | sanitized, capped 512 |
| `country_code` | char(2) nullable | GeoIP from edge header, not precise location |
| `cta` | enum(`view`\|`play`\|`download`\|`resume_view`) | optional interaction type; MVP uses `view` |

**Indices:** `(public_profile_id, viewed_at)`, partial on `(ip_hash)` for dedup window query.

**Retention:** raw views retained 365 days; aggregates computed daily to `public_profile_view_daily` materialized rows (optional, query can aggregate lazily in MVP).

---

## 3. Collection Flow

### Client beacon

File: `app/p/[slug]/components/ViewBeacon.tsx` (client island)

```ts
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/public/${slug}/view`, {
    method: 'POST',
    signal: controller.signal,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referer: document.referrer || null }),
    // credentials: 'omit' — don't couple to auth
  }).catch(() => {}); // fire-and-forget; swallow network errors
  return () => controller.abort();
}, [slug]);
```

**Edge / API handler** `POST /api/public/:slug/view` (`docs/architecture/03_API_ARCHITECTURE.md:1`):

```
1. Resolve public_profile by slug where isPublished = true → 404 if missing
2. Rate limit: 10 requests / hour / IP (edge KV or memory; key is ip_hash)
3. Parse headers: x-forwarded-for → ip_hash, user-agent → device bucket, referer header → referer family
4. Optional geo: CF-IPCountry / x-vercel-ip-country → country_code
5. INSERT INTO public_profile_views (public_profile_id, ip_hash, user_agent, referer, country_code, cta='view')
6. Return { ok: true } with no sensitive payload (never echoes ip_hash)
```

**CTA refinements (P1):** separate events for `play` / `resume_view` / `download` by wiring `onClick` handlers on the public page to POST the same endpoint with `cta` override. MVP may remain `view`-only.

### Service-role insert

Because the request is unauthenticated, the handler must use the **service_role** key but **only to insert** into `public_profile_views`; no read-back of `public_profiles` private columns is allowed (see `docs/architecture/07_SECURITY.md:1`).

---

## 4. Analytics Views (Owner-Only)

### Route & auth

- `GET /analytics` — aggregate across all published profiles for the user
- `GET /analytics?profileId=<uuid>` — single profile drill-down (link deep-links from Publish page)
- Both behind auth + RLS check: `public_profile.user_id = auth.uid()` — never disclose another user's stats

### UI composition (uses dashboard shell + card system)

Header: `Analytics — Views of your public profiles` + date-range picker (7/30/90 days; default 30).

Row 1 — KPI cards (4 across):

| Card | Value displayed | Query |
|---|---|---|
| Total Views | `count(*)` in range | `select count(*) where public_profile_id in (user profiles) and viewed_at >= :from` |
| Unique Viewers | approx distinct `ip_hash` (or exact count if row count small) | `count(distinct ip_hash)` deduped |
| Play → View rate (P1) | `cta='play' / view` | conditional count |
| Resume ↔ View rate (P1) | `cta='resume_view' / view` | conditional count |

Row 2 — Time series

- Area/line chart `Views per day` (recharts or lightweight canvas). Bars align to the bento card inset with `hover:shadow-[0_4px_20px_rgba(15,23,42,0.05)]`.

Row 3 — Breakdowns (two cards):

- **By Source** (referrer family): `Direct / LinkedIn / Indeed / Google / Other` — family mapped from `referer` domain heuristics
- **By Device** (Desktop / Mobile / Tablet) — parsed from `user_agent`
- **By Country** (Top 5 countries) — from `country_code`, flag icon optional

Table — Recent views (paginated, last 50, newest first): `When | Source | Device | Country` — no IP shown.

### Query patterns

```sql
-- Daily series (30 days)
select date_trunc('day', viewed_at) as day, count(*) 
from public_profile_views 
where public_profile_id = :pid and viewed_at >= now() - interval '30 days'
group by day order by day;

-- By source family (server-side function maps referer → family)
select referrer_family(referer) as source, count(*) 
from public_profile_views where public_profile_id = :pid group by 1;
```

If row counts remain < 10k/profile/month, lazy aggregation without a materialized view is acceptable. Document the query budget in `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:1`.

---

## 5. Privacy & Compliance

- **No PII at rest:** `ip_hash` is a one-way hash with a rotating daily salt (`saltDate + profileId`), truncated/peppered so it cannot be reversed to an IP without both the salt and brute force (document rotation in `docs/architecture/07_SECURITY.md:1`).
- **No cookie:** view is beaconed without setting a tracking cookie.
- **No third-party script:** no GA/PP — entirely first-party beacon.
- **Deletion:** Deleting the owning user cascades and removes `public_profile_views` (FK `on delete cascade`). GDPR erasure request drops all views for that user's profiles.
- **Recruiter anonymity:** analytics never surfaces IP, precise city, or browsing history — only coarse aggregates.

---

## 6. Security Requirements

- Handler is public but rate-limited per IP (10/h) to prevent view-spamming that inflates KPIs; overflow hits by spamming IP are down-weighted in UI ("Some data may reflect automated traffic").
- No read of `public_profiles` private columns via the anon path; the insert uses the resolved `public_profile_id` only.
- Owner read path uses RLS (`user_id = auth.uid()`). Cross-user analytics reads must return 403, not filtered results.

---

## 7. Acceptance Criteria (Phase 4)

- [ ] Visiting `GET /p/[slug]` inserts one `public_profile_views` row per hour per IP (dedup window verified via repeated curls).
- [ ] `GET /analytics` behind auth renders KPI cards matching inserted rows; shows 0-state illustation when no views.
- [ ] `GET /analytics?profileId=` shows daily series (7/30), device bar, and referrer table.
- [ ] Recruiter viewing `GET /p/[slug]` never sees analytics markup or API URL leakage.
- [ ] Viewing another user's analytics id returns 403 (RLS).
- [ ] Beacon is fire-and-forget: public page still renders if analytics handler is down.
- [ ] Light load (1k views) analytics query latency < 500 ms at p95.

---

## 8. Open Questions

- Should "unique viewers" count use wallet fingerprinting beyond `ip_hash` for NAT environments? Deferred: revisit if inflated unique counts observed.

