-- RPCs that back the presence-launching feature (Spec 003).
--
-- record_match_check_ins        — admin: bulk insert of present players
-- remove_match_check_in         — admin: undo a single check-in
-- list_match_check_in_candidates— admin: players still launchable for a match
-- list_match_check_ins          — approved: players already checked in

-- Bulk insert. Ineligible players (not active/injured, or archived) are
-- silently skipped; ON CONFLICT keeps the call idempotent and safe against
-- concurrent admins. Returns the number of rows actually inserted.
create or replace function public.record_match_check_ins(
  p_match_id uuid,
  p_player_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_inserted integer;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem lançar presença' using errcode = '42501';
  end if;

  if not exists (select 1 from public.matches where id = p_match_id) then
    raise exception 'pelada não encontrada' using errcode = 'P0002';
  end if;

  if p_player_ids is null or array_length(p_player_ids, 1) is null then
    return 0;
  end if;

  with eligible as (
    select pl.id
    from public.players pl
    where pl.id = any (p_player_ids)
      and pl.archived_at is null
      and pl.player_status in ('active', 'injured')
  ),
  inserted as (
    insert into public.match_check_ins (match_id, player_id, checked_in_by)
    select p_match_id, e.id, v_actor
    from eligible e
    on conflict (match_id, player_id) do nothing
    returning 1
  )
  select count(*)::integer into v_inserted from inserted;

  return v_inserted;
end;
$$;

revoke execute on function public.record_match_check_ins(uuid, uuid[]) from public, anon;
grant execute on function public.record_match_check_ins(uuid, uuid[]) to authenticated;


-- Undo a check-in launched by mistake. Idempotent — removing a row that does
-- not exist is not an error.
create or replace function public.remove_match_check_in(
  p_match_id uuid,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem remover presença' using errcode = '42501';
  end if;

  delete from public.match_check_ins
  where match_id = p_match_id
    and player_id = p_player_id;
end;
$$;

revoke execute on function public.remove_match_check_in(uuid, uuid) from public, anon;
grant execute on function public.remove_match_check_in(uuid, uuid) to authenticated;


-- Candidates for the launch modal: active/injured, non-archived players that
-- are NOT yet checked in for the given match. Admin only.
create or replace function public.list_match_check_in_candidates(p_match_id uuid)
returns table (
  player_id uuid,
  profile_id uuid,
  display_name text,
  avatar_url text,
  nickname text,
  preferred_position text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem lançar presença' using errcode = '42501';
  end if;

  return query
    select
      pl.id,
      p.id,
      p.display_name,
      p.avatar_url,
      pl.nickname,
      pl.preferred_position
    from public.players pl
    join public.profiles p on p.id = pl.profile_id
    where pl.archived_at is null
      and pl.player_status in ('active', 'injured')
      and not exists (
        select 1
        from public.match_check_ins ci
        where ci.match_id = p_match_id
          and ci.player_id = pl.id
      )
    order by coalesce(lower(pl.nickname), lower(p.display_name));
end;
$$;

revoke execute on function public.list_match_check_in_candidates(uuid) from public, anon;
grant execute on function public.list_match_check_in_candidates(uuid) to authenticated;


-- Players already checked in for a match. Readable by any approved profile.
create or replace function public.list_match_check_ins(p_match_id uuid)
returns table (
  player_id uuid,
  profile_id uuid,
  display_name text,
  avatar_url text,
  nickname text,
  preferred_position text,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not app.is_approved() then
    raise exception 'apenas membros aprovados podem ver as presenças' using errcode = '42501';
  end if;

  return query
    select
      pl.id,
      p.id,
      p.display_name,
      p.avatar_url,
      pl.nickname,
      pl.preferred_position,
      ci.checked_in_at
    from public.match_check_ins ci
    join public.players pl on pl.id = ci.player_id
    join public.profiles p on p.id = pl.profile_id
    where ci.match_id = p_match_id
    order by coalesce(lower(pl.nickname), lower(p.display_name));
end;
$$;

revoke execute on function public.list_match_check_ins(uuid) from public, anon;
grant execute on function public.list_match_check_ins(uuid) to authenticated;
