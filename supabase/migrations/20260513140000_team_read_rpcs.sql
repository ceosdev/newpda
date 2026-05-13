-- Read-only RPCs that back the /team screen. They expose a curated subset of
-- profiles + players to any approved caller (player OR spectator) — without
-- relaxing the existing RLS policies, which would otherwise leak admin-only
-- columns (denied_reason, approved_by, etc.).
--
-- list_players_public — lightweight list view; one row per non-archived player
-- get_player_detail   — full personal data for a single approved player

create or replace function public.list_players_public()
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  is_admin boolean,
  nickname text,
  preferred_position text,
  player_status public.player_status
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
  if v_status is distinct from 'approved'::public.profile_status then
    raise exception 'apenas membros aprovados podem ver o time' using errcode = '42501';
  end if;

  return query
    select
      p.id,
      p.display_name,
      p.avatar_url,
      p.is_admin,
      pl.nickname,
      pl.preferred_position,
      pl.player_status
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


create or replace function public.get_player_detail(p_target uuid)
returns table (
  profile_id uuid,
  display_name text,
  email text,
  avatar_url text,
  phone text,
  birth_date date,
  is_admin boolean,
  nickname text,
  preferred_position text,
  player_status public.player_status,
  joined_at timestamptz,
  member_since timestamptz
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
  if v_status is distinct from 'approved'::public.profile_status then
    raise exception 'apenas membros aprovados podem ver detalhes' using errcode = '42501';
  end if;

  return query
    select
      p.id,
      p.display_name,
      p.email,
      p.avatar_url,
      p.phone,
      p.birth_date,
      p.is_admin,
      pl.nickname,
      pl.preferred_position,
      pl.player_status,
      pl.joined_at,
      p.approved_at
    from public.profiles p
    join public.players pl
      on pl.profile_id = p.id
      and pl.archived_at is null
    where p.id = p_target
      and p.status = 'approved'
      and p.role = 'player';
end;
$$;

revoke execute on function public.get_player_detail(uuid) from public, anon;
grant execute on function public.get_player_detail(uuid) to authenticated;
