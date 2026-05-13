-- Domain entity. Exists only when the corresponding profile is approved with role = 'player'.
-- Created/unarchived/archived exclusively via security-definer RPCs.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete restrict,
  nickname text,
  shirt_number smallint
    check (shirt_number is null or (shirt_number >= 1 and shirt_number <= 99)),
  preferred_position text
    check (
      preferred_position is null
      or preferred_position in ('goalkeeper', 'defender', 'midfielder', 'forward')
    ),
  is_monthly boolean not null default false,
  player_status public.player_status not null default 'active',
  player_status_note text,
  player_status_changed_at timestamptz,
  joined_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.players is
  'Domain entity for players. Nickname/shirt uniqueness applies only to non-archived rows.';

-- Uniqueness scoped to active (non-archived) rows.
create unique index players_nickname_active_idx
  on public.players (lower(nickname))
  where archived_at is null and nickname is not null;

create unique index players_shirt_number_active_idx
  on public.players (shirt_number)
  where archived_at is null and shirt_number is not null;

create index players_status_idx on public.players (player_status) where archived_at is null;
create index players_archived_idx on public.players (archived_at) where archived_at is not null;

create trigger players_set_updated_at
  before update on public.players
  for each row execute function extensions.moddatetime (updated_at);

alter table public.players enable row level security;
alter table public.players force row level security;
