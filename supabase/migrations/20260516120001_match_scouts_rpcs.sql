-- RPCs that back the scout-launching feature (Spec 004).
--
-- record_match_scouts  — admin: bulk upsert of per-player scouts
-- list_match_scouts    — approved: present players with their scouts (0 default)

-- Bulk upsert. Entries whose player has no check-in for the match are silently
-- skipped (the composite FK would otherwise abort the whole batch). NULL/absent
-- counters in the payload are coerced to 0. The upsert lets the latest launch
-- overwrite a previous one. Returns the number of rows affected.
create or replace function public.record_match_scouts(
  p_match_id uuid,
  p_entries jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_affected integer;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem lançar scouts' using errcode = '42501';
  end if;

  if not exists (select 1 from public.matches where id = p_match_id) then
    raise exception 'pelada não encontrada' using errcode = 'P0002';
  end if;

  if p_entries is null or jsonb_array_length(p_entries) = 0 then
    return 0;
  end if;

  with parsed as (
    select
      (e->>'player_id')::uuid as player_id,
      coalesce((e->>'goals')::integer, 0) as goals,
      coalesce((e->>'yellow_cards')::integer, 0) as yellow_cards,
      coalesce((e->>'blue_cards')::integer, 0) as blue_cards,
      coalesce((e->>'red_cards')::integer, 0) as red_cards,
      coalesce((e->>'wins')::integer, 0) as wins,
      coalesce((e->>'draws')::integer, 0) as draws
    from jsonb_array_elements(p_entries) as e
  ),
  eligible as (
    select pr.*
    from parsed pr
    join public.match_check_ins ci
      on ci.match_id = p_match_id
      and ci.player_id = pr.player_id
  ),
  upserted as (
    insert into public.match_scouts (
      match_id, player_id, goals, yellow_cards, blue_cards,
      red_cards, wins, draws, updated_at, updated_by
    )
    select
      p_match_id, el.player_id, el.goals, el.yellow_cards, el.blue_cards,
      el.red_cards, el.wins, el.draws, now(), v_actor
    from eligible el
    on conflict (match_id, player_id) do update set
      goals = excluded.goals,
      yellow_cards = excluded.yellow_cards,
      blue_cards = excluded.blue_cards,
      red_cards = excluded.red_cards,
      wins = excluded.wins,
      draws = excluded.draws,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
    returning 1
  )
  select count(*)::integer into v_affected from upserted;

  return v_affected;
end;
$$;

revoke execute on function public.record_match_scouts(uuid, jsonb) from public, anon;
grant execute on function public.record_match_scouts(uuid, jsonb) to authenticated;


-- Present players with their scouts. LEFT JOIN so a checked-in player without a
-- scout row yet comes back with zeros — this is what lets the launch modal
-- recover previously launched values. Readable by any approved profile; backs
-- both the launch modal and the detail-screen scouts section.
create or replace function public.list_match_scouts(p_match_id uuid)
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
  draws integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not app.is_approved() then
    raise exception 'apenas membros aprovados podem ver os scouts' using errcode = '42501';
  end if;

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
      coalesce(s.draws, 0)
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
