-- Application identity. 1:1 with auth.users; created by trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  status public.profile_status not null default 'pending',
  role public.profile_role,
  is_admin boolean not null default false,
  onboarded_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  denied_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_status_invariants check (
    case status
      when 'pending' then
        role is null
        and approved_at is null
        and approved_by is null
        and denied_reason is null
      when 'approved' then
        role is not null
        and approved_at is not null
        and denied_reason is null
      when 'denied' then
        approved_at is null
        and approved_by is null
        and denied_reason is not null
    end
  )
);

comment on table public.profiles is
  'Application identity, 1:1 with auth.users. Created by trigger on signup. role + is_admin are orthogonal.';

create index profiles_status_idx on public.profiles (status);
create index profiles_role_idx on public.profiles (role) where role is not null;
create index profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function extensions.moddatetime (updated_at);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
