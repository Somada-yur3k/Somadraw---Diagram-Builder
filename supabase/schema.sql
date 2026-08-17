-- Somadraw "User Workspace" schema.
-- Run this once in the Supabase SQL Editor for your project.
-- Source of truth committed to the repo; not applied automatically.

create table diagrams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default 'Untitled diagram',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diagrams_user_id_updated_at_idx on diagrams (user_id, updated_at desc);

alter table diagrams enable row level security;

create policy "select own diagrams" on diagrams for select using (auth.uid() = user_id);
create policy "insert own diagrams" on diagrams for insert with check (auth.uid() = user_id);
create policy "update own diagrams" on diagrams for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own diagrams" on diagrams for delete using (auth.uid() = user_id);

create function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger diagrams_set_updated_at before update on diagrams
  for each row execute function set_updated_at();

-- Feedback submitted from the Developer settings page - any signed-in user
-- can send one, but only the owner (checked by email, not a role/table,
-- since this app has exactly one owner) can read them back, via the
-- Monitor Users panel. Keep this email in sync with OWNER_EMAIL in
-- src/lib/ownerEmail.js - there's no single source of truth shared between
-- SQL and the app.
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text not null,
  type text not null default 'suggestion' check (type in ('suggestion', 'bug')),
  message text not null,
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on feedback (created_at desc);
-- Backs the rate-limit trigger's own lookup below (by user_id, most recent
-- first) - without this it's a sequential scan that grows with the table.
create index feedback_user_id_created_at_idx on feedback (user_id, created_at desc);

alter table feedback enable row level security;

create policy "insert own feedback" on feedback for insert with check (auth.uid() = user_id);
create policy "owner can view all feedback" on feedback for select
  using (auth.jwt() ->> 'email' = 'eurikasomada@gmail.com');
-- Also lets a regular (non-owner) submitter see their own past rows - the
-- feedback form uses this to find their last submission time and show/
-- enforce the 1-per-hour cooldown client-side. Postgres OR's every
-- permissive SELECT policy together, so this is additive with the owner
-- policy above, not a replacement. This is also what lets the rate-limit
-- trigger's own lookup below see the inserting user's prior rows without
-- needing security definer - the row it looks for is always that same
-- user's own, which this policy already grants them.
create policy "select own feedback" on feedback for select using (auth.uid() = user_id);
-- Lets MonitorPage's Feedback list actually delete an entry (e.g. once
-- acted on, or spam) - no policy existed for delete at all before this, so
-- it silently denied everyone, owner included.
create policy "owner can delete feedback" on feedback for delete
  using (auth.jwt() ->> 'email' = 'eurikasomada@gmail.com');

-- Rate limit: at most one feedback submission per user per hour, enforced
-- server-side (not just in the UI) so it can't be bypassed by calling
-- Supabase directly. Raises a distinct SQLSTATE (RL001, not one of
-- Postgres's reserved codes) rather than relying on exception text, so the
-- client can match on error.code instead of parsing a message string.
create function feedback_rate_limit() returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from feedback
    where user_id = new.user_id
      and created_at > now() - interval '1 hour'
  ) then
    raise exception 'You can only send feedback once per hour.' using errcode = 'RL001';
  end if;
  return new;
end;
$$;

create trigger feedback_rate_limit_trigger before insert on feedback
  for each row execute function feedback_rate_limit();

-- Diagram sharing (schema only - not wired into the app yet). A diagram's
-- own owner-only access is untouched; sharing is additive. share_role is
-- only the DEFAULT role a brand-new joiner gets - changing it later never
-- retroactively changes anyone already in diagram_collaborators.
alter table diagrams
  add column share_enabled boolean not null default false,
  add column share_role text not null default 'viewer' check (share_role in ('viewer', 'editor'));

-- One row per (diagram, person) who has joined via a share link. user_email
-- is captured at join time (same trust model this schema already uses for
-- auth.jwt()->>'email' elsewhere) purely so the owner's future Share panel
-- can list collaborators by email - there's no other user registry
-- available client-side (auth.users isn't queryable via RLS).
create table diagram_collaborators (
  id uuid primary key default gen_random_uuid(),
  diagram_id uuid not null references diagrams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  role text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  unique (diagram_id, user_id)
);

-- The unique constraint above already indexes (diagram_id, user_id) - this
-- covers "all collaborators on diagram X" lookups (a left prefix of that
-- constraint) but not "all diagrams user Y collaborates on", hence the
-- separate index below for that direction.
create index diagram_collaborators_user_id_idx on diagram_collaborators (user_id);

alter table diagram_collaborators enable row level security;

-- diagrams' and diagram_collaborators' own RLS policies each need to check
-- the OTHER table (does this user own the diagram / is this user a
-- collaborator) - a plain `exists (select ... from the-other-table)` inline
-- in each policy causes exactly that: diagrams' policy selects from
-- diagram_collaborators, which is itself subject to RLS, whose own policy
-- selects from diagrams, which is subject to RLS again, forever (Postgres
-- error 42P17, "infinite recursion detected in policy"). These two
-- functions break the cycle: security definer makes their OWN internal
-- queries bypass RLS entirely, so calling one from a policy can't recurse
-- back into that same policy.
create function is_diagram_owner(target_diagram_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from diagrams d where d.id = target_diagram_id and d.user_id = auth.uid()
  );
$$;

create function diagram_collaborator_role(target_diagram_id uuid) returns text
language sql security definer stable
set search_path = public
as $$
  select role from diagram_collaborators c
  where c.diagram_id = target_diagram_id and c.user_id = auth.uid();
$$;

-- No insert policy here on purpose - the only way a row is created is
-- through join_shared_diagram() below (security definer, so it bypasses
-- these policies for its own internal insert). A client can't insert a
-- collaborator row directly, which rules out self-granting 'editor' access
-- or adding a row under someone else's user_id.
create policy "owner can view diagram collaborators" on diagram_collaborators
  for select using (is_diagram_owner(diagram_id));
create policy "collaborator can view own membership" on diagram_collaborators
  for select using (auth.uid() = user_id);
create policy "owner can update collaborator roles" on diagram_collaborators
  for update using (is_diagram_owner(diagram_id)) with check (is_diagram_owner(diagram_id));
create policy "owner can remove collaborators" on diagram_collaborators
  for delete using (is_diagram_owner(diagram_id));
create policy "collaborator can leave a diagram" on diagram_collaborators
  for delete using (auth.uid() = user_id);

-- Safe to add now even though nothing calls it yet: scoped by actual
-- diagram_collaborators membership (not a blanket "share_enabled" flag), so
-- unlike a naive "select where share_enabled" policy, this can never be
-- used to enumerate/browse every publicly-shared diagram in the system -
-- it only ever returns rows for diagrams this specific user already
-- legitimately joined via join_shared_diagram() below.
create policy "select shared diagrams" on diagrams
  for select using (diagram_collaborator_role(id) is not null);

-- Lets an editor-role collaborator save canvas edits the same way the owner
-- already does (autosave's full-document overwrite). This alone can't stop
-- an editor from also renaming the diagram or flipping share_enabled/
-- share_role/user_id via a direct API call (RLS only sees "is this user
-- allowed to touch this row," not "which columns did they change") - see
-- the trigger below for that.
create policy "update as editor collaborator" on diagrams
  for update using (diagram_collaborator_role(id) = 'editor')
  with check (diagram_collaborator_role(id) = 'editor');

-- Column-level backstop for the policy above: without this, a malicious
-- editor-collaborator could call the Supabase API directly (bypassing the
-- app's own UI, which never sends these fields) and rename the diagram,
-- flip its sharing settings, or overwrite user_id to steal ownership.
-- Never fires during normal app usage (the app's own update call only ever
-- sends {data: payload}), so it's a server-side safety net, not a UX path -
-- same "distinct SQLSTATE, not message text" convention as RL001 above.
create function enforce_diagram_update_scope() returns trigger
language plpgsql
as $$
begin
  if auth.uid() <> old.user_id then
    if new.name is distinct from old.name
      or new.user_id is distinct from old.user_id
      or new.share_enabled is distinct from old.share_enabled
      or new.share_role is distinct from old.share_role
    then
      raise exception 'Collaborators can only edit diagram content.' using errcode = 'SC001';
    end if;
  end if;
  return new;
end;
$$;

create trigger diagrams_enforce_update_scope before update on diagrams
  for each row execute function enforce_diagram_update_scope();

-- The entire "join via link" mechanism. security definer so it can read a
-- diagram and insert a collaborator row without needing a broad "anyone can
-- select any share_enabled diagram" RLS policy on diagrams - which would
-- otherwise let a signed-in stranger enumerate/read every publicly-shared
-- diagram in the whole system via a direct API call, not just ones they
-- were actually sent a link to. This function only ever operates on the one
-- diagram_id the caller already provides (i.e. already has the link to) -
-- nothing here exposes a way to discover diagram ids you don't already
-- know. auth.uid()/auth.jwt() still correctly resolve to the calling
-- user's own identity inside a security definer function (they read
-- request-scoped settings, not table grants), so this can't be tricked
-- into joining on someone else's behalf.
--
-- Returns zero rows if the diagram doesn't exist, sharing is off and the
-- caller was never a collaborator, or (implicitly) the caller isn't signed
-- in - the app treats an empty result the same as "not found" today.
create function join_shared_diagram(p_diagram_id uuid)
returns table (id uuid, name text, data jsonb, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target diagrams%rowtype;
  existing_role text;
begin
  select * into target from diagrams d where d.id = p_diagram_id;
  if not found then
    return;
  end if;

  if auth.uid() = target.user_id then
    return query select target.id, target.name, target.data, 'owner'::text;
    return;
  end if;

  -- Already joined - return their current role (which may have been
  -- promoted/demoted by the owner since they last visited), not the
  -- diagram's present-day default for brand-new joiners.
  select c.role into existing_role
    from diagram_collaborators c
    where c.diagram_id = p_diagram_id and c.user_id = auth.uid();

  if existing_role is not null then
    return query select target.id, target.name, target.data, existing_role;
    return;
  end if;

  if not target.share_enabled then
    return;
  end if;

  insert into diagram_collaborators (diagram_id, user_id, user_email, role)
  values (p_diagram_id, auth.uid(), auth.jwt() ->> 'email', target.share_role);

  return query select target.id, target.name, target.data, target.share_role;
end;
$$;

grant execute on function join_shared_diagram(uuid) to authenticated;

-- Realtime Authorization for a future per-diagram broadcast/presence
-- channel (topic 'diagram:<diagramId>') - inert until the app actually
-- opens a channel with that name pattern, safe to add now. Deliberately
-- NOT applied to the existing 'online-users' channel (src/lib/usePresence.js)
-- - that one stays public by design (see its own comment); this one will
-- carry real diagram content (shape moves/deletes), so an unauthorized
-- listener injecting fake edits is a real integrity risk, not just a
-- presence-list leak. Marking that future channel `private: true`
-- client-side is what makes these policies apply to it - it does not
-- require disabling "Allow public access" in the Realtime project
-- settings (that's project-wide and would break the existing public
-- channel).
create policy "diagram participants can receive realtime" on realtime.messages
  for select to authenticated
  using (
    exists (
      select 1 from diagrams d
      where 'diagram:' || d.id::text = (select realtime.topic())
        and (d.user_id = auth.uid() or diagram_collaborator_role(d.id) is not null)
    )
  );

create policy "diagram participants can send presence" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and exists (
      select 1 from diagrams d
      where 'diagram:' || d.id::text = (select realtime.topic())
        and (d.user_id = auth.uid() or diagram_collaborator_role(d.id) is not null)
    )
  );

-- Any participant (owner, editor, or viewer) may send a broadcast message -
-- this channel carries both content-sync ("state") and live-cursor
-- ("cursor") broadcasts, and a viewer's cursor needs to reach collaborators
-- the same as anyone else's. RLS can't cheaply distinguish those two event
-- names from each other, but it doesn't need to: a viewer's client never
-- attempts to send a "state" broadcast in the first place (the app's own
-- readOnly gate prevents that), and even a modified client couldn't persist
-- anything this way - the diagrams table's own RLS still requires editor
-- role for any real, durable write. This only controls a live, ephemeral
-- view, not the record of truth.
create policy "diagram participants can send broadcast" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1 from diagrams d
      where 'diagram:' || d.id::text = (select realtime.topic())
        and (d.user_id = auth.uid() or diagram_collaborator_role(d.id) is not null)
    )
  );

-- Favoriting/starring a diagram - purely a personal, per-user preference
-- (not shared diagram state), so this is its own table rather than a column
-- on diagrams: a collaborator starring a diagram they don't own must never
-- make it show as starred for the owner or any other collaborator. No `id`
-- column needed (unlike diagram_collaborators) since nothing else ever
-- references a single star row - the (diagram_id, user_id) pair is already
-- its own natural, sufficient primary key.
create table diagram_stars (
  diagram_id uuid not null references diagrams(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (diagram_id, user_id)
);

-- Covers "all of this user's stars" lookups (what the sidebar actually
-- queries) - the primary key above already indexes (diagram_id, user_id),
-- a left prefix on diagram_id, not user_id, so that alone wouldn't serve
-- this direction.
create index diagram_stars_user_id_idx on diagram_stars (user_id);

alter table diagram_stars enable row level security;

-- No diagram-ownership/collaborator check on insert - starring an id the
-- caller doesn't otherwise have access to is inert clutter for them, not a
-- security concern (a star row carries no diagram content, and diagrams'
-- own RLS - completely independent of this table - still governs whether
-- they can ever actually read that diagram).
create policy "select own stars" on diagram_stars for select using (auth.uid() = user_id);
create policy "star a diagram" on diagram_stars for insert with check (auth.uid() = user_id);
create policy "unstar a diagram" on diagram_stars for delete using (auth.uid() = user_id);

-- Backs MonitorUsersView's "All Users" section - the full registered-user
-- roster (not just who's online right now, which useOnlineUsers/presence
-- already covers). auth.users lives in the `auth` schema, which isn't
-- exposed through PostgREST and has no policies of its own reachable from
-- the client, so there's normally no way to query it at all from the
-- browser - security definer is what lets this one function reach in and
-- read it anyway, same mechanism join_shared_diagram already relies on
-- above. The email check inside (rather than a `grant execute` restricted
-- to some role) is what actually keeps this owner-only, since `authenticated`
-- covers every signed-in user - matches "owner can view all feedback"
-- above, hardcoding the same address for the same reason (see that policy's
-- own comment on why: keep this in sync with OWNER_EMAIL in
-- src/lib/ownerEmail.js by hand, there's no shared source of truth between
-- SQL and the app).
create function admin_list_users()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.jwt() ->> 'email' <> 'eurikasomada@gmail.com' then
    raise exception 'Not authorized' using errcode = 'AU001';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at
    from auth.users u
    order by u.created_at desc;
end;
$$;

grant execute on function admin_list_users() to authenticated;

-- Optional star rating (1-5) alongside a feedback message - nullable since
-- older rows (submitted before this existed) have none, and a submitter can
-- still send feedback without picking one (e.g. a bug report doesn't
-- naturally map to a satisfaction score the way a suggestion might). No RLS
-- change needed - it's just another column on a row the existing
-- insert/select/delete policies already govern.
alter table feedback add column rating smallint check (rating is null or rating between 1 and 5);

-- Backs the Monitor page's "Security" section - the two violations this
-- app already detects (feedback_rate_limit()'s RL001, admin_list_users()'s
-- AU001 below) used to just raise an exception and leave nothing behind;
-- both now log a row here first. No insert policy on purpose - same "only
-- a security definer function can write" shape as diagram_collaborators
-- above, so a client can never insert a fake event directly, only these
-- two functions can, and only when their own violation condition is
-- actually true.
create table security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('rate_limit_hit', 'unauthorized_admin_call')),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  detail text,
  created_at timestamptz not null default now()
);

create index security_events_created_at_idx on security_events (created_at desc);

alter table security_events enable row level security;

create policy "owner can view security events" on security_events for select
  using (auth.jwt() ->> 'email' = 'eurikasomada@gmail.com');

-- Redefined (was a plain SECURITY INVOKER function) to log a
-- rate_limit_hit row before raising. Its own pre-existing check never
-- needed elevated privilege - a user's own RLS-granted visibility into
-- their own feedback rows already covered it - only the *new* insert into
-- security_events does, since regular users have no policy letting them
-- write there.
create or replace function feedback_rate_limit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from feedback
    where user_id = new.user_id
      and created_at > now() - interval '1 hour'
  ) then
    insert into security_events (event_type, user_id, email, detail)
    values ('rate_limit_hit', new.user_id, new.email, 'Feedback rate limit (1/hour) exceeded');
    raise exception 'You can only send feedback once per hour.' using errcode = 'RL001';
  end if;
  return new;
end;
$$;

-- Redefined to log an unauthorized_admin_call row before raising -
-- already security definer, no privilege change, just new logic.
create or replace function admin_list_users()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.jwt() ->> 'email' <> 'eurikasomada@gmail.com' then
    insert into security_events (event_type, user_id, email, detail)
    values ('unauthorized_admin_call', auth.uid(), auth.jwt() ->> 'email', 'Called admin_list_users()');
    raise exception 'Not authorized' using errcode = 'AU001';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at
    from auth.users u
    order by u.created_at desc;
end;
$$;

-- Backs the Monitor Dashboard's "Diagrams created" stat tile and "Diagram
-- created" activity feed rows - same shape as admin_list_users() above
-- (security definer, re-checks OWNER_EMAIL server-side, logs an
-- unauthorized_admin_call on abuse), needed because "select own diagrams"
-- RLS on diagrams (top of this file) would otherwise only ever show the
-- owner's own diagrams here too, same as a regular user.
create function admin_list_diagrams()
returns table (id uuid, name text, user_email text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.jwt() ->> 'email' <> 'eurikasomada@gmail.com' then
    insert into security_events (event_type, user_id, email, detail)
    values ('unauthorized_admin_call', auth.uid(), auth.jwt() ->> 'email', 'Called admin_list_diagrams()');
    raise exception 'Not authorized' using errcode = 'AU001';
  end if;
  return query
    select d.id, d.name, u.email::text, d.created_at
    from diagrams d
    join auth.users u on u.id = d.user_id
    order by d.created_at desc;
end;
$$;

grant execute on function admin_list_diagrams() to authenticated;

-- Admin-authored announcements shown on the public /updates page and the
-- workspace's own "what's new" banner - replaces the old hardcoded UPDATES
-- array in src/lib/updates.js now that the owner can post/remove these
-- from the Monitor Dashboard directly, instead of needing a code change +
-- deploy for every new entry.
create table announcements (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new', 'improved', 'fix')),
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index announcements_created_at_idx on announcements (created_at desc);

alter table announcements enable row level security;

-- Readable by anyone, signed in or not - same as the rest of the public
-- site (docs/help/updates pages don't require a session either).
create policy "anyone can view announcements" on announcements for select using (true);
-- Only the owner can post or remove one - same email check as "owner can
-- delete feedback" above (this app has exactly one owner, not a role/table).
create policy "owner can insert announcements" on announcements for insert
  with check (auth.jwt() ->> 'email' = 'eurikasomada@gmail.com');
create policy "owner can delete announcements" on announcements for delete
  using (auth.jwt() ->> 'email' = 'eurikasomada@gmail.com');

-- Seeds the table with the real entries that used to live in the hardcoded
-- UPDATES array, so /updates doesn't start out empty the first time this
-- migration runs. Safe to skip/delete individual rows afterward - this is
-- a one-time seed, not something the app re-runs.
insert into announcements (type, title, description, created_at) values
  ('new', 'System Architecture & Network diagrams', 'Added two new diagram types: System Architecture, for mapping app/cloud infrastructure, and Network, for wiring, routers, and connectivity - each with its own shape library.', '2026-08-17T00:00:00Z'),
  ('fix', 'ERD table fixes', 'Fixed ERD table layout issues and reduced excess whitespace when exporting diagrams.', '2026-08-12T00:00:00Z'),
  ('improved', 'Arrow & label styling', 'Refined arrow and label colors, and added width/height controls for shapes.', '2026-08-11T00:00:00Z'),
  ('new', 'Multi-row arrow support', 'Arrows can now connect to a specific row within a multi-row shape.', '2026-08-03T00:00:00Z'),
  ('new', 'ERD diagrams & monitoring dashboard', 'Added ERD diagram support, plus an improved security and monitoring dashboard.', '2026-08-02T00:00:00Z'),
  ('new', 'Rotate & align tools', 'Added shape rotation and alignment tools to the editor.', '2026-07-31T00:00:00Z'),
  ('new', 'UML diagrams & starred diagrams', 'Added UML diagram support, the ability to star diagrams, and dashed border styling.', '2026-07-30T00:00:00Z'),
  ('fix', 'PDF & PNG export fixes', 'Fixed issues with PDF and PNG export in the editor.', '2026-07-29T00:00:00Z'),
  ('new', 'Real-time collaboration', 'Diagrams now sync live between everyone editing them together.', '2026-07-28T00:00:00Z'),
  ('new', 'Use Case diagrams & feedback', 'Added Use Case diagram support and an in-app feedback form.', '2026-07-26T00:00:00Z');

-- Lets a signed-in user delete their own account - the self-service
-- counterpart to ManageAccountTab's "Delete Account" button, which used to
-- just explain this wasn't possible yet. security definer runs this as
-- the function's own owner (same mechanism admin_list_users()/
-- admin_list_diagrams() above already use to reach auth.users - a table
-- regular signed-in roles have no direct grants on), so a plain client
-- call can do this without this client-side app ever needing to hold the
-- service-role key that would otherwise require. Scoped to auth.uid()
-- only, never a passed-in id, so there's no way to point this at anyone
-- else's account. Deleting straight from auth.users (not just this app's
-- own tables) cascades through every "on delete cascade" FK already on
-- diagrams/feedback/diagram_collaborators/diagram_stars above, and
-- through Supabase's own session/refresh-token tables too - not just a
-- login removed, everything that belonged to this account goes with it.
create function delete_own_account() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_own_account() to authenticated;

-- Resolves Supabase's Security Advisor warnings:
--   - "Function Search Path Mutable" on set_updated_at()/
--     enforce_diagram_update_scope() - neither pinned search_path before,
--     so both are redefined here with the same `set search_path = public`
--     every other function in this file already uses (stops a malicious
--     search_path swap from resolving an unqualified reference to
--     something other than the intended one).
--   - "Public Can Execute SECURITY DEFINER Function" on every security
--     definer function below - Postgres grants EXECUTE to the PUBLIC
--     pseudo-role by default on every new function, and anon inherits
--     from PUBLIC, so each of these was directly callable by a fully
--     unauthenticated caller even though every one already re-checks
--     auth.uid()/auth.jwt() (or is scoped to auth.uid()) internally.
--     Revoking PUBLIC and granting only to `authenticated` closes that off
--     at the permission layer too, instead of relying solely on each
--     function's own internal check.
create or replace function set_updated_at() returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function enforce_diagram_update_scope() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() <> old.user_id then
    if new.name is distinct from old.name
      or new.user_id is distinct from old.user_id
      or new.share_enabled is distinct from old.share_enabled
      or new.share_role is distinct from old.share_role
    then
      raise exception 'Collaborators can only edit diagram content.' using errcode = 'SC001';
    end if;
  end if;
  return new;
end;
$$;

-- is_diagram_owner()/diagram_collaborator_role() are called from inside
-- RLS policy expressions on diagrams/diagram_collaborators/
-- realtime.messages, evaluated as the querying role - authenticated still
-- needs its own explicit EXECUTE grant for those policies to keep
-- resolving, unlike the functions below which authenticated only ever
-- calls directly (and which already have their own explicit grant from
-- when each was created above).
revoke execute on function is_diagram_owner(uuid) from public;
grant execute on function is_diagram_owner(uuid) to authenticated;

revoke execute on function diagram_collaborator_role(uuid) from public;
grant execute on function diagram_collaborator_role(uuid) to authenticated;

revoke execute on function join_shared_diagram(uuid) from public;
revoke execute on function admin_list_users() from public;
revoke execute on function admin_list_diagrams() from public;
revoke execute on function delete_own_account() from public;

-- Trigger-only, never called directly - Postgres fires a trigger
-- regardless of the triggering role's own EXECUTE grants on the trigger
-- function, so nothing needs re-granting here after this revoke.
revoke execute on function feedback_rate_limit() from public;
