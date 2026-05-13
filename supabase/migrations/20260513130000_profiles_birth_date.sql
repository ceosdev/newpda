-- Add an optional birth_date column to profiles and extend update_my_profile
-- to accept it. Nullable; UI may leave it blank. No CHECK constraint here —
-- range validation lives in the client and would only get in the way for
-- edge cases (very young / very old members) we have not modelled yet.

alter table public.profiles
  add column birth_date date;

-- Replace update_my_profile so it can also write the new column.
-- The current signature (text, text, text) is dropped and a new one
-- (text, text, text, date) takes its place.
drop function if exists public.update_my_profile(text, text, text);

create or replace function public.update_my_profile(
  p_display_name text,
  p_avatar_url text default null,
  p_phone text default null,
  p_birth_date date default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles;
  v_phone text;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'display_name é obrigatório' using errcode = '22023';
  end if;

  v_phone := nullif(trim(coalesce(p_phone, '')), '');

  update public.profiles
  set
    display_name = trim(p_display_name),
    avatar_url = p_avatar_url,
    phone = v_phone,
    birth_date = p_birth_date,
    onboarded_at = coalesce(onboarded_at, now())
  where id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'profile não encontrado' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke execute on function public.update_my_profile(text, text, text, date) from public, anon;
grant execute on function public.update_my_profile(text, text, text, date) to authenticated;
