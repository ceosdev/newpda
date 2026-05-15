-- Match check-ins: which players were actually present at a pelada.
--
-- Distinct from match_attendances (RSVP intent). A check-in is the consummated
-- fact ("esteve lá") and the basis for player frequency. The two are
-- independent — a player may have answered "declined" and still be checked in.
--
-- Historical by design: there is NO cleanup trigger. If a player is later set
-- inactive or archived, their past check-ins remain, otherwise the historical
-- frequency would be corrupted. (Opposite of match_attendances, Spec 002.)
--
-- All writes go through admin-only security-definer RPCs (next migration);
-- only select is open to approved profiles.

create table public.match_check_ins (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid not null references public.profiles (id) on delete restrict,
  primary key (match_id, player_id)
);

comment on table public.match_check_ins is
  'Presença confirmada de um jogador numa pelada (fato consumado, base da frequência). Distinta de match_attendances (resposta/intenção). Sem trigger de limpeza — presença é histórico.';

create index match_check_ins_player_idx
  on public.match_check_ins (player_id);

alter table public.match_check_ins enable row level security;
alter table public.match_check_ins force row level security;

-- Read: any approved profile (player or spectator). Writes have no policy —
-- they go exclusively through the security-definer RPCs.
create policy match_check_ins_select_approved
  on public.match_check_ins
  for select
  to authenticated
  using (app.is_approved());
