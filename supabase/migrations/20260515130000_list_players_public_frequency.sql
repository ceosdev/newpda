-- Adds presence frequency to the /team list.
--
-- Frequency = a player's check-ins divided by the total number of matches
-- created (open + closed). The raw counts are returned; the UI renders the
-- percentage and handles the zero-matches case.
--
-- The return shape changes (two new columns), so the function is dropped and
-- recreated — create or replace cannot alter an existing return type.

drop function if exists public.list_players_public();

create function public.list_players_public()
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  is_admin boolean,
  nickname text,
  preferred_position text,
  player_status public.player_status,
  check_in_count integer,
  total_match_count integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_status public.profile_status;
  v_total integer;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select p.status into v_status from public.profiles p where p.id = v_uid;
  if v_status is distinct from 'approved'::public.profile_status then
    raise exception 'apenas membros aprovados podem ver o time' using errcode = '42501';
  end if;

  select count(*)::integer into v_total from public.matches;

  return query
    select
      p.id,
      p.display_name,
      p.avatar_url,
      p.is_admin,
      pl.nickname,
      pl.preferred_position,
      pl.player_status,
      (
        select count(*)::integer
        from public.match_check_ins ci
        where ci.player_id = pl.id
      ),
      v_total
    from public.profiles p
    join public.players pl
      on pl.profile_id = p.id
      and pl.archived_at is null
    where p.status = 'approved'
      and p.role = 'player'
    order by
      p.is_admin desc,
      coalesce(lower(pl.nickname), lower(p.display_name));
end;
$$;

revoke execute on function public.list_players_public() from public, anon;
grant execute on function public.list_players_public() to authenticated;
