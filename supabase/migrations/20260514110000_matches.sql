-- Matches (peladas): core entity, RLS, and read policy.
-- All writes go through admin-only security-definer RPCs in the next migration;
-- there are no direct insert/update/delete policies for matches.

create type public.match_status as enum ('open', 'closed');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_date date not null,
  match_time time not null,
  status public.match_status not null default 'open',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.matches is
  'Peladas. match_date and match_time are naive (no TZ) — UI renders them raw.';

create index matches_order_idx
  on public.matches (match_date desc, match_time desc, id desc);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function extensions.moddatetime (updated_at);

alter table public.matches enable row level security;
alter table public.matches force row level security;

-- Read: any approved profile (player or spectator) can list matches.
create policy matches_select_approved
  on public.matches
  for select
  to authenticated
  using (app.is_approved());
