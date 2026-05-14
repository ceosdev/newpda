-- Admin-only RPCs to mutate a player's position and player_status by profile_id.
--
-- The existing update_player_status(uuid, ...) takes players.id; the /team UI
-- only carries profile_id, so we wrap both writes here with profile_id signatures
-- and (for position) add the missing admin path entirely — only update_my_player
-- existed for the player themselves.
--
-- Position changes are not logged to approval_history (no matching enum action,
-- and they're routine data edits — mirrors set_player_monthly). Status changes
-- continue to log a 'player_status_changed' row.

create or replace function public.admin_update_player_position(
  p_target_profile uuid,
  p_position text
)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_returning public.players;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem alterar a posição' using errcode = '42501';
  end if;

  if p_position is not null
     and p_position not in ('goalkeeper', 'defender', 'midfielder', 'forward') then
    raise exception 'preferred_position inválido' using errcode = '22023';
  end if;

  update public.players
  set preferred_position = p_position
  where profile_id = p_target_profile
    and archived_at is null
  returning * into v_returning;

  if not found then
    raise exception 'player não encontrado ou arquivado' using errcode = 'P0002';
  end if;

  return v_returning;
end;
$$;

revoke execute on function public.admin_update_player_position(uuid, text) from public, anon;
grant execute on function public.admin_update_player_position(uuid, text) to authenticated;


create or replace function public.admin_update_player_status(
  p_target_profile uuid,
  p_status public.player_status,
  p_note text default null
)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_player public.players;
  v_returning public.players;
  v_clean_note text;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem alterar status do jogador' using errcode = '42501';
  end if;

  select * into v_player
  from public.players
  where profile_id = p_target_profile
    and archived_at is null
  for update;

  if not found then
    raise exception 'player não encontrado ou arquivado' using errcode = 'P0002';
  end if;

  v_clean_note := nullif(trim(coalesce(p_note, '')), '');

  update public.players
  set
    player_status = p_status,
    player_status_note = v_clean_note,
    player_status_changed_at = now()
  where id = v_player.id
  returning * into v_returning;

  insert into public.approval_history
    (profile_id, actor_id, action, reason)
  values
    (
      v_player.profile_id,
      v_actor,
      'player_status_changed',
      p_status::text || coalesce(' — ' || v_clean_note, '')
    );

  return v_returning;
end;
$$;

revoke execute on function public.admin_update_player_status(uuid, public.player_status, text)
  from public, anon;
grant execute on function public.admin_update_player_status(uuid, public.player_status, text)
  to authenticated;
