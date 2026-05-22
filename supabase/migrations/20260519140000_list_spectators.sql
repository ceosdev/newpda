-- list_spectators — approved members: roster of approved spectator profiles.
--
-- Spectators have no `players` row (only role = 'player' profiles do), so the
-- /team screen needs a separate source for its "Espectadores" tab. Read-only,
-- gated like list_players_public: any approved member may call it.

create or replace function public.list_spectators()
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  is_admin boolean
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
    raise exception 'apenas membros aprovados podem ver os espectadores' using errcode = '42501';
  end if;

  return query
    select p.id, p.display_name, p.avatar_url, p.is_admin
    from public.profiles p
    where p.status = 'approved'
      and p.role = 'spectator'
    order by p.is_admin desc, lower(p.display_name);
end;
$$;

revoke execute on function public.list_spectators() from public, anon;
grant execute on function public.list_spectators() to authenticated;
