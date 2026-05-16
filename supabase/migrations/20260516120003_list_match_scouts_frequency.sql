-- Adds frequency inputs to list_match_scouts (Spec 004 follow-up).
--
-- The scouts section ranks the Performance tab by points and uses the player's
-- overall presence frequency as the tie-breaker. Frequency needs the same two
-- raw counts the /team list already exposes:
--   check_in_count    — the player's total check-ins across every match
--   total_match_count — the total number of matches created
-- The UI renders the percentage and the ordering.
--
-- The return shape changes (two new columns), so the function is dropped and
-- recreated — create or replace cannot alter an existing return type.

drop function if exists public.list_match_scouts(uuid);

create function public.list_match_scouts(p_match_id uuid)
returns table (
  player_id uuid,
  profile_id uuid,
  display_name text,
  avatar_url text,
  nickname text,
  preferred_position text,
  goals integer,
  yellow_cards integer,
  blue_cards integer,
  red_cards integer,
  wins integer,
  draws integer,
  check_in_count integer,
  total_match_count integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_total integer;
begin
  if not app.is_approved() then
    raise exception 'apenas membros aprovados podem ver os scouts' using errcode = '42501';
  end if;

  select count(*)::integer into v_total from public.matches;

  return query
    select
      pl.id,
      p.id,
      p.display_name,
      p.avatar_url,
      pl.nickname,
      pl.preferred_position,
      coalesce(s.goals, 0),
      coalesce(s.yellow_cards, 0),
      coalesce(s.blue_cards, 0),
      coalesce(s.red_cards, 0),
      coalesce(s.wins, 0),
      coalesce(s.draws, 0),
      (
        select count(*)::integer
        from public.match_check_ins ci2
        where ci2.player_id = pl.id
      ),
      v_total
    from public.match_check_ins ci
    join public.players pl on pl.id = ci.player_id
    join public.profiles p on p.id = pl.profile_id
    left join public.match_scouts s
      on s.match_id = ci.match_id
      and s.player_id = ci.player_id
    where ci.match_id = p_match_id
    order by coalesce(lower(pl.nickname), lower(p.display_name));
end;
$$;

revoke execute on function public.list_match_scouts(uuid) from public, anon;
grant execute on function public.list_match_scouts(uuid) to authenticated;
