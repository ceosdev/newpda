-- Admin-only mutations for matches. All four functions check app.is_admin() at
-- the top and operate on profile_id-less inputs (matches.id is the primary key
-- handle here, since profiles aren't involved in scheduling logic).

create or replace function public.create_match(
  p_match_date date,
  p_match_time time
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_returning public.matches;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem criar peladas' using errcode = '42501';
  end if;

  if p_match_date is null then
    raise exception 'data da pelada é obrigatória' using errcode = '22023';
  end if;

  if p_match_time is null then
    raise exception 'hora da pelada é obrigatória' using errcode = '22023';
  end if;

  insert into public.matches (match_date, match_time, status, created_by)
  values (p_match_date, p_match_time, 'open', v_actor)
  returning * into v_returning;

  return v_returning;
end;
$$;

revoke execute on function public.create_match(date, time) from public, anon;
grant execute on function public.create_match(date, time) to authenticated;


create or replace function public.update_match_schedule(
  p_match_id uuid,
  p_match_date date,
  p_match_time time
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_returning public.matches;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem editar peladas' using errcode = '42501';
  end if;

  if p_match_date is null or p_match_time is null then
    raise exception 'data e hora são obrigatórias' using errcode = '22023';
  end if;

  update public.matches
  set match_date = p_match_date,
      match_time = p_match_time
  where id = p_match_id
  returning * into v_returning;

  if not found then
    raise exception 'pelada não encontrada' using errcode = 'P0002';
  end if;

  return v_returning;
end;
$$;

revoke execute on function public.update_match_schedule(uuid, date, time) from public, anon;
grant execute on function public.update_match_schedule(uuid, date, time) to authenticated;


create or replace function public.close_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.match_status;
  v_returning public.matches;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem fechar peladas' using errcode = '42501';
  end if;

  select status into v_current from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'pelada não encontrada' using errcode = 'P0002';
  end if;

  if v_current = 'closed' then
    raise exception 'pelada já está fechada' using errcode = '22023';
  end if;

  update public.matches
  set status = 'closed'
  where id = p_match_id
  returning * into v_returning;

  return v_returning;
end;
$$;

revoke execute on function public.close_match(uuid) from public, anon;
grant execute on function public.close_match(uuid) to authenticated;


create or replace function public.delete_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem excluir peladas' using errcode = '42501';
  end if;

  delete from public.matches where id = p_match_id;

  if not found then
    raise exception 'pelada não encontrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.delete_match(uuid) from public, anon;
grant execute on function public.delete_match(uuid) to authenticated;
