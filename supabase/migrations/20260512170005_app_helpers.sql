-- RLS helpers. All security-definer + stable so the planner reuses results inside a query.
-- search_path is locked to '' to force schema-qualified references inside the body.

create or replace function app.current_uid()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid();
$$;

create or replace function app.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function app.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select status = 'approved' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function app.has_role(p_role public.profile_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role = p_role from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke execute on function app.current_uid() from public, anon;
revoke execute on function app.current_profile() from public, anon;
revoke execute on function app.is_admin() from public, anon;
revoke execute on function app.is_approved() from public, anon;
revoke execute on function app.has_role(public.profile_role) from public, anon;

grant execute on function app.current_uid() to authenticated;
grant execute on function app.current_profile() to authenticated;
grant execute on function app.is_admin() to authenticated;
grant execute on function app.is_approved() to authenticated;
grant execute on function app.has_role(public.profile_role) to authenticated;
