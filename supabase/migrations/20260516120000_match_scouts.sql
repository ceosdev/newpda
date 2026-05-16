-- Match scouts: per-player numbers from a pelada day (Spec 004).
--
-- Goals, yellow/blue/red cards, wins and draws — one row per player who was
-- actually present (checked in). The composite FK to match_check_ins makes
-- "a scout only exists for a present player" a database invariant: removing a
-- check-in (or deleting the match) cascades and drops the scout row.
--
-- Editable by design: the launch RPC upserts, so the latest value always wins.
-- "Points" is derived (wins * 3 + draws) and never stored.
--
-- All writes go through an admin-only security-definer RPC (next migration);
-- only select is open to approved profiles.

create table public.match_scouts (
  match_id uuid not null,
  player_id uuid not null,
  goals integer not null default 0,
  yellow_cards integer not null default 0,
  blue_cards integer not null default 0,
  red_cards integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles (id) on delete restrict,
  primary key (match_id, player_id),
  constraint match_scouts_check_in_fk
    foreign key (match_id, player_id)
    references public.match_check_ins (match_id, player_id)
    on delete cascade,
  constraint match_scouts_non_negative check (
    goals >= 0
    and yellow_cards >= 0
    and blue_cards >= 0
    and red_cards >= 0
    and wins >= 0
    and draws >= 0
  )
);

comment on table public.match_scouts is
  'Scouts de um jogador numa pelada (gols, cartões, vitórias, empates). FK composta para match_check_ins — só quem esteve presente tem scout; remover a presença apaga o scout. Pontos (wins*3+draws) é derivado, não armazenado.';

create index match_scouts_player_idx
  on public.match_scouts (player_id);

alter table public.match_scouts enable row level security;
alter table public.match_scouts force row level security;

-- Read: any approved profile (player or spectator). Writes have no policy —
-- they go exclusively through the security-definer RPC.
create policy match_scouts_select_approved
  on public.match_scouts
  for select
  to authenticated
  using (app.is_approved());
