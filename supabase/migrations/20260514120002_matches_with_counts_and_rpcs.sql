-- View + RPCs that back the /matches list, the /matches/:id detail and the
-- attendance write path.
--
-- matches_with_counts: mirrors matches + 3 aggregated counters. Used by the
--   list and the detail header.
-- set_my_attendance:   upsert with strict validation (player + status active or
--                      injured + match open). responded_at is set only on the
--                      first row; trocas de resposta apenas atualizam response
--                      and updated_at.
-- list_match_attendances: returns the joined cards (avatar, nickname, position)
--                         per response, ordered by responded_at asc.

create or replace view public.matches_with_counts as
select
  m.id,
  m.match_date,
  m.match_time,
  m.status,
  m.created_by,
  m.created_at,
  m.updated_at,
  coalesce(c.going_count, 0)::integer    as going_count,
  coalesce(c.maybe_count, 0)::integer    as maybe_count,
  coalesce(c.declined_count, 0)::integer as declined_count
from public.matches m
left join lateral (
  select
    count(*) filter (where response = 'going')    as going_count,
    count(*) filter (where response = 'maybe')    as maybe_count,
    count(*) filter (where response = 'declined') as declined_count
  from public.match_attendances a
  where a.match_id = m.id
) c on true;

grant select on public.matches_with_counts to authenticated;


create or replace function public.set_my_attendance(
  p_match_id uuid,
  p_response public.attendance_response
)
returns public.match_attendances
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_player public.players;
  v_match public.matches;
  v_row public.match_attendances;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.status <> 'approved' or v_profile.role is distinct from 'player' then
    raise exception 'apenas jogadores aprovados podem responder' using errcode = '42501';
  end if;

  select * into v_player
  from public.players
  where profile_id = v_uid and archived_at is null;
  if not found or v_player.player_status not in ('active','injured') then
    raise exception 'apenas jogadores ativos ou no DM podem responder' using errcode = '42501';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'pelada não encontrada' using errcode = 'P0002';
  end if;

  if v_match.status <> 'open' then
    raise exception 'pelada já está fechada' using errcode = '22023';
  end if;

  insert into public.match_attendances (match_id, profile_id, response)
  values (p_match_id, v_uid, p_response)
  on conflict (match_id, profile_id) do update
    set response = excluded.response
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.set_my_attendance(uuid, public.attendance_response)
  from public, anon;
grant execute on function public.set_my_attendance(uuid, public.attendance_response)
  to authenticated;


create or replace function public.list_match_attendances(p_match_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  nickname text,
  preferred_position text,
  response public.attendance_response,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_status public.profile_status;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select p.status into v_status from public.profiles p where p.id = v_uid;
  if v_status is distinct from 'approved' then
    raise exception 'apenas membros aprovados podem ver as respostas' using errcode = '42501';
  end if;

  return query
    select
      a.profile_id,
      p.display_name,
      p.avatar_url,
      pl.nickname,
      pl.preferred_position,
      a.response,
      a.responded_at
    from public.match_attendances a
    join public.profiles p on p.id = a.profile_id
    left join public.players pl
      on pl.profile_id = a.profile_id and pl.archived_at is null
    where a.match_id = p_match_id
    order by a.responded_at asc;
end;
$$;

revoke execute on function public.list_match_attendances(uuid) from public, anon;
grant execute on function public.list_match_attendances(uuid) to authenticated;
