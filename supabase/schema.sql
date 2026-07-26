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
