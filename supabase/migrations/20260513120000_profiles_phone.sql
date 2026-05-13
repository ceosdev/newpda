-- Add an optional phone column to profiles so any approved user (player
-- or spectator) can register a contact number. Nullable, no format check —
-- users may store anything they recognize (raw digits, formatted, etc.).
-- The status_invariants constraint stays untouched because it does not
-- mention phone.

alter table public.profiles
  add column phone text;

-- Replace update_my_profile so it can also write the new column.
-- The new signature (text, text, text) differs from the previous one
-- (text, text), so the old function is dropped explicitly first.
drop function if exists public.update_my_profile(text, text);

create or replace function public.update_my_profile(
  p_display_name text,
  p_avatar_url text default null,
  p_phone text default null
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

  -- Trim whitespace; treat empty strings as NULL so the column does not
  -- accidentally end up with '' meaning "no phone".
  v_phone := nullif(trim(coalesce(p_phone, '')), '');

  update public.profiles
  set
    display_name = trim(p_display_name),
    avatar_url = p_avatar_url,
    phone = v_phone,
    onboarded_at = coalesce(onboarded_at, now())
  where id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'profile não encontrado' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke execute on function public.update_my_profile(text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text) to authenticated;
