-- Attendance domain: per-player response (going / maybe / declined) to a match.
-- Writes go through set_my_attendance (next migration); only select is open to
-- approved profiles. No update/insert/delete policy is created.

create type public.attendance_response as enum ('going', 'maybe', 'declined');

create table public.match_attendances (
  match_id uuid not null references public.matches (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  response public.attendance_response not null,
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, profile_id)
);

comment on table public.match_attendances is
  'Resposta de presença de um jogador para uma pelada. responded_at é fixado na primeira inserção (não muda em trocas de resposta), para ordenar a aba "mais antigos primeiro".';

create index match_attendances_match_response_idx
  on public.match_attendances (match_id, response, responded_at);

create index match_attendances_profile_idx
  on public.match_attendances (profile_id);

create trigger match_attendances_set_updated_at
  before update on public.match_attendances
  for each row execute function extensions.moddatetime (updated_at);

alter table public.match_attendances enable row level security;
alter table public.match_attendances force row level security;

create policy match_attendances_select_approved
  on public.match_attendances
  for select
  to authenticated
  using (app.is_approved());
