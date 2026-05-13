-- Make update_my_player parameters optional (default null) so callers can
-- omit any subset of fields without having to pass explicit nulls — and so
-- the supabase-js generated types stop demanding non-null strings for what
-- are actually nullable columns.
--
-- Same body as before, only the signature changes; the new signature
-- (text, smallint, text) is identical at runtime to the previous one — only
-- the default values are added — so existing call sites keep working.

drop function if exists public.update_my_player(text, smallint, text);

create or replace function public.update_my_player(
  p_nickname text default null,
  p_shirt_number smallint default null,
  p_preferred_position text default null
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
