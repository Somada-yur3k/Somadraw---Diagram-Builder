# Security

Somadraw is a collaborative diagram editor built on React (Vite) + Supabase
(Postgres, Auth, Realtime), hosted on Vercel. This document is a snapshot of
the app's actual security posture — what's in place, why, and what isn't
done yet — kept in sync with the real implementation rather than written as
generic advice.

## Authentication

- **Google OAuth only** via Supabase Auth — there is no password database to
  leak or brute-force.
- The browser only ever holds the Supabase **anon** key
  (`VITE_SUPABASE_ANON_KEY`). The **service role** key, which bypasses Row-
  Level Security entirely, is never used client-side — see `.env.example`'s
  own warning on this.
- Every write in the app goes through Supabase's normal authenticated
  session; there is no separate custom auth layer to audit.

## Authorization — Row-Level Security

RLS is enabled on every table (`supabase/schema.sql` is the source of truth
— run manually in the Supabase SQL Editor, not applied automatically). No
table is ever readable/writable by default; every access path is an
explicit policy.

| Table | Who can do what |
|---|---|
| `diagrams` | Owner (`auth.uid() = user_id`) has full access. A collaborator with `role = 'editor'` (via `diagram_collaborators`) can update content only — see the column-level backstop below. A `viewer` collaborator can only read. |
| `diagram_collaborators` | Only the diagram owner can view/manage the full list; a collaborator can see and remove their own membership. **No insert policy exists at all** — the only way a row is created is through `join_shared_diagram()`, so a client can never self-grant access or forge another user's membership. |
| `feedback` | Anyone signed in can insert their own; only the owner (checked by email) can read or delete. |
| `diagram_stars` | Strictly per-user — a star is never visible to anyone but the person who set it, including the diagram's own owner. |

**Avoiding circular RLS**: `diagrams`' and `diagram_collaborators`' policies
each need to check the *other* table, which naively causes infinite
recursion (Postgres error 42P17). `is_diagram_owner()` and
`diagram_collaborator_role()` are `security definer` functions that break
the cycle by bypassing RLS for their own internal lookup only.

**Column-level backstop**: an `editor` collaborator's UPDATE policy on
`diagrams` can't distinguish *which* columns changed — RLS only sees "is
this row theirs to touch." `enforce_diagram_update_scope()` is a trigger
that blocks a non-owner from renaming a diagram, changing its sharing
settings, or reassigning `user_id`, even via a direct API call that
bypasses the app's own UI entirely.

**Share links don't leak a directory**: `join_shared_diagram()` is
`security definer` specifically so there's no need for a blanket "anyone
can read any `share_enabled` diagram" policy — which would let a signed-in
stranger enumerate every publicly shared diagram in the system, not just
ones they were actually sent a link to. It only ever operates on the one
`diagram_id` the caller already has.

**Admin surfaces are double-gated**: the Monitor page (`/monitor`, its own
standalone page — see below) checks the signed-in user's email client-side
*and* the `admin_list_users()` RPC re-checks the same thing server-side
(`security definer`, hardcoded to the owner's email), so a stray URL visit
or a direct API call both fail closed independently of each other.

**Realtime**: per-diagram channels (`diagram:<id>`) are gated by Realtime
Authorization policies — only the owner or an actual collaborator can
subscribe or publish. The one exception is the `online-users` presence
channel, which is deliberately left ungated (anyone signed in could
technically subscribe to see who's online) — an accepted tradeoff for a
single-owner tool, since it carries no diagram content, only presence.

## Rate limiting

- **Feedback submissions**: capped at 1/hour, enforced **server-side** via a
  Postgres trigger (`feedback_rate_limit()`) — not just a client-side
  cooldown, so it can't be bypassed by calling Supabase directly.
- **Known gap**: nothing else is rate-limited server-side today — diagram
  saves, sign-ins, and RPC calls (e.g. `admin_list_users`,
  `join_shared_diagram`) have no throttling beyond Supabase's own
  account-wide usage caps. Low risk at current scale; worth revisiting if
  the app gets meaningfully public traffic.

## Dependency security

- `npm audit` is checked periodically, not just at release time.
- **2026-08-02**: fixed a high-severity CSRF bypass (GHSA-qwww-vcr4-c8h2) by
  migrating off the discontinued `react-router-dom` package to `react-router`
  directly (`^8.3.0`) — `react-router-dom` itself never received a patched
  release. The vulnerable code path (RSC/framework mode) isn't reachable in
  this app's plain client-side SPA setup regardless, but the fix was applied
  anyway since a clean, verified migration path existed. Confirmed via a
  full API-surface check against the real published package (not just
  changelogs) before migrating, and `npm audit` now reports 0
  vulnerabilities.

## Infrastructure-level protection

- **Vercel**'s edge network absorbs common volumetric DDoS traffic against
  the frontend automatically — no configuration required.
- **Supabase** runs on AWS, which includes AWS Shield Standard for baseline
  network-layer protection.
- Neither of these protects against **application-layer abuse** of this
  app's own specific endpoints (see the rate-limiting gap above) — that's a
  distinct problem from volumetric DDoS.

## Content safety

No `dangerouslySetInnerHTML` (or equivalent) exists anywhere in the
codebase — all diagram text content (shape labels, ERD columns, etc.) is
rendered through React's default JSX escaping, so there's no obvious way
for stored diagram content to execute as HTML/script.

## Abuse monitoring

- **2026-08-02**: added a `security_events` table (schema.sql) that the two
  existing violation checks now log to instead of failing silently —
  `feedback_rate_limit()` (RL001) and `admin_list_users()` (AU001) each
  insert a row (who, when, what) immediately before raising their
  exception. No insert policy exists on the table itself — only those two
  `security definer` functions can write to it, so a client can never
  forge a fake event.
- Surfaced on the Monitor page (`/monitor`) under its own **Security**
  category — 2 stat tiles (rate-limit hits, unauthorized attempts) plus a
  chronological event list, visually separated from the existing **User
  Activity** category (registered/online users, feedback).
- This only covers violations the app already actively checks for. It is
  **not** a general audit log or intrusion-detection system — see the
  remaining gaps below for what it doesn't cover.

## Known gaps / not yet done

- No general rate limiting beyond the feedback form (see above) — so
  there's nothing yet for the new Security log to catch on diagram saves,
  sign-ins, or other RPC calls.
- No failed-sign-in tracking — would require Supabase Auth Hooks, a
  separate mechanism from the Postgres triggers used above.
- No alerting (email/push) when a new security event is logged — checking
  the Monitor page is still a manual, pull-based action, not push.
- The `online-users` presence channel is intentionally left ungated (see
  Realtime, above) — would need a Realtime Authorization policy if that
  tradeoff ever changes.

## Supabase plan limits (free tier)

Worth knowing what happens at each cap, since the app currently runs on
Supabase's free tier:

| Resource | Free tier cap | What happens at the limit |
|---|---|---|
| Database size | 500 MB | New writes start failing (saves, sign-ups); existing data stays readable. |
| Egress (bandwidth) | 5 GB / billing cycle | Further API requests fail until the cycle resets or the plan is upgraded. Usage-driven, not data-driven — the one most likely to move fastest if real traffic grows. |
| Monthly Active Users | 50,000 | Far beyond this app's realistic near-term scale. |
| File storage | 1 GB | Unused today — diagrams are stored as JSON in the database, not as uploaded files. |

Check current usage anytime in the Supabase dashboard's "Free plan usage"
panel.

## Reporting a concern

This is a single-owner student project (Eurika Adamos, BSIT-MI, National
University Fairview). If you find a security issue, reach out directly
rather than filing a public issue — see the Developer page in the app for
contact details.
