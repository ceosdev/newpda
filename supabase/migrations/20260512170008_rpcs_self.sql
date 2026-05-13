-- Self-service RPCs. Allow the authenticated user to update a whitelisted subset
-- of their own data. Direct UPDATEs on profiles/players are blocked by RLS.

create or replace function public.update_my_profile(
  p_display_name text,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'display_name é obrigatório' using errcode = '22023';
  end if;

  update public.profiles
  set
    display_name = trim(p_display_name),
    avatar_url = p_avatar_url,
    onboarded_at = coalesce(onboarded_at, now())
  where id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'profile não encontrado' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke execute on function public.update_my_profile(text, text) from public, anon;
grant execute on function public.update_my_profile(text, text) to authenticated;


create or replace function public.update_my_player(
  p_nickname text,
  p_shirt_number smallint,
  p_preferred_position text
)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_row public.players;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.status <> 'approved' or v_profile.role is distinct from 'player' then
    raise exception 'apenas jogadores aprovados podem editar seu cadastro' using errcode = '42501';
  end if;

  if p_preferred_position is not null
     and p_preferred_position not in ('goalkeeper', 'defender', 'midfielder', 'forward') then
    raise exception 'preferred_position inválido' using errcode = '22023';
  end if;

  if p_shirt_number is not null and (p_shirt_number < 1 or p_shirt_number > 99) then
    raise exception 'shirt_number deve estar entre 1 e 99' using errcode = '22023';
  end if;

  update public.players
  set
    nickname = nullif(trim(coalesce(p_nickname, '')), ''),
    shirt_number = p_shirt_number,
    preferred_position = p_preferred_position
  where profile_id = v_uid and archived_at is null
  returning * into v_row;

  if not found then
    raise exception 'player não encontrado ou arquivado' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke execute on function public.update_my_player(text, smallint, text) from public, anon;
grant execute on function public.update_my_player(text, smallint, text) to authenticated;
