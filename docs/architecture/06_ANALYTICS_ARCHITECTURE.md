# Analytics Architecture — CareerFlow AI

> Private analytics for public profile owners + product-level usage signals. **Recruiter anonymity and link stability** are the architectural keys — analytics must never leak private job data, must never require a third-party tracker, and the public page must stay fast even when the analytics pipeline is down.

---

## 1. Scope

| Domain | Owner | Data captured | Consumer |
|---|---|---|---|
| **Public Profile Views** | `AnalyticsService` | per-view rows (ip_hash, referer, device, country, cta) | Owner's `GET /analytics*` — see `docs/modules/03_PUBLIC_ANALYTICS.md:1` |
| **Product analytics** (behavioral, future) | small event table or edge log | signup, upload, match, record, publish, interview start/complete | Team (Phase 8; not MVP-critical) |
| **AI cost/latency** | `ai_calls` aggregate (optional) | model, promptHash, latencyMs, tokens | Internal cost panel — Phase 8 |

MVP ships **Public Profile Views** as the only user-visible metric; product event tracking is sketched here but deferred to a later increment so video/intro can ship without that integration.

---

## 2. Public Profile Views Pipeline

### 2.1 Ingest path

```
GET /p/[slug] (client)
   └─ mount ViewBeacon island ──POST /api/public/:slug/view { referer }
                                 │
                                 │  headers → X-Forwarded-For (ipHash), User-Agent, Referer, CF-IPCountry
                                 ▼
                        [Edge/API handler]
                           1. resolve public_profile where slug=:slug and is_published=true
                           2. rateLimit(10/h/IP) — edge KV/memory
                           3. hash ip+dailySalt+profileId → ip_hash
                           4. INSERT public_profile_views(user_id inferred via job chain not stored — only bucketed)
                           5. return { ok:true }  — no PII echoed
                                 │
                                 ▼
                        Postgres table public_profile_views
                        (see docs/architecture/02_DATABASE_SCHEMA.md:1)
```

Implementation note from inspection: the public profile page is **SSR**; the beacon fires client-side as a `fire-and-forget` `fetch(..., { cache:'no-store' })` inside `useEffect`. Its failure must **not** block rendering (the `GET /p/[slug]` response already served).

### 2.2 Deduplication & hashing

```ts
// lib/analytics/hash.ts — server-only
function hashIp(ip: string, profileId: string, day: string): string {
  const salt = process.env.IP_HASH_SALT + day; // daily rotation
  return createHash('sha256').update(`${ip}:${profileId}:${salt}`).digest('hex');
}
```

- `ip` is taken from `x-forwarded-for` leftmost entry or `cf-connecting-ip` / `x-vercel-ip-city` family. No raw IP persisted.
- Salts rotate daily — two views by same IP on different days generate different hashes (intentional: "unique viewers per day" semantics).
- Dedup window: **1 hour** at the handler — if `exists(public_profile_views where ip_hash=:h and viewed_at > now()-interval '1 hour')` skip the `INSERT` and return `ok:true` (view not double-counted in UI KPIs but not leaked to client either).

### 2.3 Referrer & Device bucketing

| Raw input | Stored column | Bucketing function | Display buckets |
|---|---|---|---|
| `referer` header/`body referer` | `referer text` | `referrerFamily(host)` → `direct | linkedin | indeed | google | twitter | other` | row3 in analytics UI |
| `user-agent` | `user_agent text` | parse via `UAParser` server-side → `desktop|mobile|tablet|unknown` | row3 |
| `country_code` header | `country_code char(2)` | passed through from edge `CF-IPCountry`/`Vercel-Ip-Country` | Top-5 countries |
| `cta` (optional body enum) | `cta text` | `view|play|download|resume_view` | CTA conversion cards (P1) |

Stored values are never exposed raw; analytics queries only expose buckets. `user_agent` is stored truncated (first 512 chars) but never returned to client rows verbatim.

### 2.4 Query path (owner-only)

```
GET /analytics?profileId=uuid  (auth)
   ├─ validate profile belongs to user (row check or RLS)
   └─ run aggregate queries (docs/modules/03_PUBLIC_ANALYTICS.md:1 §4)
       SELECT ... FROM public_profile_views WHERE public_profile_id=:pid AND viewed_at>=:from
       group by day / referrerFamily / device / country
```

Performance goal: lazy aggregate under 10k rows is fine on primary Postgres. For ≥50k views/profile, introduce **materialized aggregation table** `public_profile_view_daily`:

```sql
create table public_profile_view_daily (
  public_profile_id uuid references public_profiles(id) on delete cascade,
  day date,
  total_views int,
  unique_hashes int,
  by_device jsonb,
  by_referrer jsonb,
  primary key (public_profile_id, day)
);
```

Refreshed by a daily cron (triggered via Supabase pg_cron or Vercel scheduled function) — optional day-one; document as future hardening.

### 2.5 Archival & retention

Raw `public_profile_views` retained 365 days; analytics aggregates render the range the user selects (default 30 days). Owner-level deletes cascade via FK (`public_profile_id on delete cascade`) — so profile deletion drops its rows, user deletion drops all rows across profiles. No export path yet.

---

## 3. Product Analytics (Deferred sketch)

Future general event store (Phase 8) — does not block MVP but is preemptively modelled:

```sql
create table product_events (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  event text,  -- 'video_match_created','script_generated','video_recorded','interview_completed', ...
  props jsonb,
  occurred_at timestamptz default now()
);
-- index (user_id, occurred_at), index (event, occurred_at)
insert ... from route handlers post-success.
```

Queries: funnel `match → script → video → publish` conversion (owner/team internal).

**Privacy:** stored only for analytics; no 3rd-party SDK required. Delete with user row.

---

## 4. Cost / Latency Observability for AI (Deferred sketch)

If `ai_calls` table is introduced, each AI service invocation would insert:

```sql
create table ai_calls (
  id uuid primary key,
  user_id uuid,
  service text,    -- 'ResumeJobMatcher', 'ScriptGenerator', ...
  model text,
  prompt_hash text,
  latency_ms int,
  tokens_in int nullable,
  tokens_out int nullable,
  ok boolean,
  created_at timestamptz default now()
);
```

Surfaced to internal dashboards, not the public profile. Deferred but architected here so provider swaps preserve the same instrumentation hook.

---

## 5. Performance & Reliability Constraints

- The beacon insert is `fire-and-forget` — no response latency budget for the public page; handler must insert in < 250 ms p95 (single row insert).
- Public profile rendering must **not** wait on the beacon handler — they run in parallel and the page is SSR'd before the beacon fetches.
- Burst spikes (e.g. recruiter shares link on LinkedIn driving 500 views/hour) must be throttled at the edge rate-limiter, not by Postgres (backpressure via KV `INCR`).
- Analytics aggregates batch efficiently: aggregate query for 30 days is one `GROUP BY day` plus one `GROUP BY bucket` — two queries, not thirty.
- No JS bundle weight from analytics libs — ViewBeacon is ≤ 1 kB (a single `fetch` call). No third-party tracker script is ever loaded.

---

## 6. Security & Privacy (reprise from 07 but included here)

- No raw IP or user-agent is ever returned to the **owner** — only buckets.
- No cookie is set by the beacon.
- Analytics `SELECT` rows are protected by `public_profile_id in (select id from public_profiles where user_id = auth.uid())` (RLS).
- `POST /api/public/:slug/view` never reflects the inserted row back — it returns `ok:true` only.
- GDPR erasure of the owning user clears `public_profile_views` via cascade; export is not required for this table.

---

## 7. Acceptance Criteria (Analytics subsystem)

- [ ] Repeated `GET /p/[slug]` by the same IP within 1 hour increments totals by exactly 1 (dedup verified via two consecutive `POST .../view` cURL).
- [ ] `GET /analytics` as logged-in owner shows time-series + buckets; as non-owner of the provided profile id returns 403.
- [ ] Public page source contains no `/analytics` URL or view-table column names.
- [ ] 500 views seeded, `GET /analytics?profileId=` responds < 500 ms p95 in local load test.
- [ ] No raw IP and no full user-agent string is ever echoed in the analytics JSON response.

