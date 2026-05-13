-- Admin-only mutations. Every function checks app.is_admin() at the top and
-- writes to approval_history for audit. Direct table writes are blocked by RLS.

------------------------------------------------------------------------
-- approve_user: pending/denied → approved with a role
------------------------------------------------------------------------
create or replace function public.approve_user(
  p_target uuid,
  p_role public.profile_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.profiles;
  v_returning public.profiles;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem aprovar usuários' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_target for update;
  if not found then
    raise exception 'profile não encontrado' using errcode = 'P0002';
  end if;

  update public.profiles
  set
    status = 'approved',
    role = p_role,
    approved_at = now(),
    approved_by = v_actor,
    denied_reason = null
  where id = p_target
  returning * into v_returning;

  if p_role = 'player' then
    insert into public.players (profile_id, joined_at)
    values (p_target, now())
    on conflict (profile_id) do update
      set archived_at = null, updated_at = now();
  elsif p_role = 'spectator' then
    update public.players
    set archived_at = now()
    where profile_id = p_target and archived_at is null;
  end if;

  insert into public.approval_history
    (profile_id, actor_id, action, from_status, to_status, from_role, to_role)
  values
    (p_target, v_actor, 'approved', v_target.status, 'approved', v_target.role, p_role);

  return v_returning;
end;
$$;

revoke execute on function public.approve_user(uuid, public.profile_role) from public, anon;
grant execute on function public.approve_user(uuid, public.profile_role) to authenticated;


------------------------------------------------------------------------
-- deny_user: any → denied (with reason)
------------------------------------------------------------------------
create or replace function public.deny_user(
  p_target uuid,
  p_reason text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.profiles;
  v_returning public.profiles;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem negar usuários' using errcode = '42501';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'motivo da negação é obrigatório' using errcode = '22023';
  end if;

  select * into v_target from public.profiles where id = p_target for update;
  if not found then
    raise exception 'profile não encontrado' using errcode = 'P0002';
  end if;

  if v_target.is_admin then
    raise exception 'não é possível negar um administrador; revogue o privilégio admin primeiro'
      using errcode = '42501';
  end if;

  update public.profiles
  set
    status = 'denied',
    role = null,
    approved_at = null,
    approved_by = null,
    denied_reason = trim(p_reason)
  where id = p_target
  returning * into v_returning;

  update public.players
  set archived_at = now()
  where profile_id = p_target and archived_at is null;

  insert into public.approval_history
    (profile_id, actor_id, action, from_status, to_status, from_role, to_role, reason)
  values
    (p_target, v_actor, 'denied', v_target.status, 'denied', v_target.role, null, trim(p_reason));

  return v_returning;
end;
$$;

revoke execute on function public.deny_user(uuid, text) from public, anon;
grant execute on function public.deny_user(uuid, text) to authenticated;


------------------------------------------------------------------------
-- revoke_approval: approved/denied → pending
------------------------------------------------------------------------
create or replace function public.revoke_approval(p_target uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.profiles;
  v_returning public.profiles;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem revogar aprovação' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_target for update;
  if not found then
    raise exception 'profile não encontrado' using errcode = 'P0002';
  end if;

  update public.profiles
  set
    status = 'pending',
    role = null,
    approved_at = null,
    approved_by = null,
    denied_reason = null
  where id = p_target
  returning * into v_returning;

  update public.players
  set archived_at = now()
  where profile_id = p_target and archived_at is null;

  insert into public.approval_history
    (profile_id, actor_id, action, from_status, to_status, from_role, to_role)
  values
    (p_target, v_actor, 'revoked', v_target.status, 'pending', v_target.role, null);

  return v_returning;
end;
$$;

revoke execute on function public.revoke_approval(uuid) from public, anon;
grant execute on function public.revoke_approval(uuid) to authenticated;


------------------------------------------------------------------------
-- change_user_role: approved player ↔ approved spectator
------------------------------------------------------------------------
create or replace function public.change_user_role(
  p_target uuid,
  p_new_role public.profile_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.profiles;
  v_returning public.profiles;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem alterar role' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_target for update;
  if not found then
    raise exception 'profile não encontrado' using errcode = 'P0002';
  end if;

  if v_target.status <> 'approved' then
    raise exception 'só é possível alterar role de usuários aprovados' using errcode = '22023';
  end if;

  if v_target.role is not distinct from p_new_role then
    return v_target;
  end if;

  update public.profiles
  set role = p_new_role
  where id = p_target
  returning * into v_returning;

  if p_new_role = 'player' then
    insert into public.players (profile_id, joined_at)
    values (p_target, now())
    on conflict (profile_id) do update
      set archived_at = null, updated_at = now();
  else
    update public.players
    set archived_at = now()
    where profile_id = p_target and archived_at is null;
  end if;

  insert into public.approval_history
    (profile_id, actor_id, action, from_status, to_status, from_role, to_role)
  values
    (p_target, v_actor, 'role_changed', v_target.status, v_target.status, v_target.role, p_new_role);

  return v_returning;
end;
$$;

revoke execute on function public.change_user_role(uuid, public.profile_role) from public, anon;
grant execute on function public.change_user_role(uuid, public.profile_role) to authenticated;


------------------------------------------------------------------------
-- set_admin_flag: grant/revoke admin capability (with last-admin safeguard)
------------------------------------------------------------------------
create or replace function public.set_admin_flag(
  p_target uuid,
  p_value boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.profiles;
  v_admin_count integer;
  v_returning public.profiles;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem alterar o privilégio admin' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_target for update;
  if not found then
    raise exception 'profile não encontrado' using errcode = 'P0002';
  end if;

  if v_target.is_admin = p_value then
    return v_target;
  end if;

  if p_value = false then
    select count(*) into v_admin_count from public.profiles where is_admin = true;
    if v_admin_count <= 1 then
      raise exception 'não é possível revogar o último administrador do sistema'
        using errcode = '42501';
    end if;
  end if;

  update public.profiles
  set is_admin = p_value
  where id = p_target
  returning * into v_returning;

  insert into public.approval_history
    (profile_id, actor_id, action, from_status, to_status)
  values
    (
      p_target,
      v_actor,
      case when p_value then 'admin_granted'::public.approval_action
           else 'admin_revoked'::public.approval_action end,
      v_target.status,
      v_target.status
    );

  return v_returning;
end;
$$;

revoke execute on function public.set_admin_flag(uuid, boolean) from public, anon;
grant execute on function public.set_admin_flag(uuid, boolean) to authenticated;


------------------------------------------------------------------------
-- update_player_status: active / inactive / injured (admin only by design)
------------------------------------------------------------------------
create or replace function public.update_player_status(
  p_target_player uuid,
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

  select * into v_player from public.players where id = p_target_player for update;
  if not found then
    raise exception 'player não encontrado' using errcode = 'P0002';
  end if;

  v_clean_note := nullif(trim(coalesce(p_note, '')), '');

  update public.players
  set
    player_status = p_status,
    player_status_note = v_clean_note,
    player_status_changed_at = now()
  where id = p_target_player
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

revoke execute on function public.update_player_status(uuid, public.player_status, text) from public, anon;
grant execute on function public.update_player_status(uuid, public.player_status, text) to authenticated;


------------------------------------------------------------------------
-- set_player_monthly
------------------------------------------------------------------------
create or replace function public.set_player_monthly(
  p_target_player uuid,
  p_value boolean
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
    raise exception 'apenas administradores podem alterar mensalismo' using errcode = '42501';
  end if;

  update public.players
  set is_monthly = p_value
  where id = p_target_player
  returning * into v_returning;

  if not found then
    raise exception 'player não encontrado' using errcode = 'P0002';
  end if;

  return v_returning;
end;
$$;

revoke execute on function public.set_player_monthly(uuid, boolean) from public, anon;
grant execute on function public.set_player_monthly(uuid, boolean) to authenticated;
