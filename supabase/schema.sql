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

alter table feedback enable row level security;

create policy "insert own feedback" on feedback for insert with check (auth.uid() = user_id);
create policy "owner can view all feedback" on feedback for select
  using (auth.jwt() ->> 'email' = 'eurikasomada@gmail.com');
