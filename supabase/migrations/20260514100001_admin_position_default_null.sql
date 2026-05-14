-- Allow the position arg to default null so supabase-js generates an optional
-- TS type (consistent with update_my_player), enabling the admin UI to clear
-- the preferred position by sending undefined.

create or replace function public.admin_update_player_position(
  p_target_profile uuid,
  p_position text default null
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
