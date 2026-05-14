-- Per-user theme preference persisted alongside the profile.
-- Default is 'dark' (the brand identity). The column is NOT NULL so the front
-- never has to guard against a missing value.
-- A dedicated security-definer RPC isolates the write path from
-- update_my_profile, which means changing the theme doesn't have to round-trip
-- display_name / phone / birth_date.

create type public.theme_preference as enum ('light', 'dark');

alter table public.profiles
  add column theme_preference public.theme_preference not null default 'dark';

create or replace function public.update_my_theme_preference(
  p_value public.theme_preference
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

  if p_value is null then
    raise exception 'theme_preference é obrigatório' using errcode = '22023';
  end if;

  update public.profiles
  set theme_preference = p_value
  where id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'profile não encontrado' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke execute on function public.update_my_theme_preference(public.theme_preference)
  from public, anon;
grant execute on function public.update_my_theme_preference(public.theme_preference)
  to authenticated;
