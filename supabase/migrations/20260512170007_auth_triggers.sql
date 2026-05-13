-- Auth bridge: keeps public.profiles in sync with auth.users.
-- handle_new_user fires on signup (email/password OR OAuth) and creates a pending profile.
-- handle_user_email_updated mirrors email changes back into the profile snapshot.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  -- Pull display name from OAuth provider metadata when available;
  -- fall back to the local-part of the email so the admin always has something to read.
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, display_name, status, is_admin)
  values (new.id, new.email, v_display_name, 'pending', false)
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create or replace trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_updated();
