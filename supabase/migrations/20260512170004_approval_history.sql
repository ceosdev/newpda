-- Append-only audit log for identity/role decisions.
-- Written exclusively by admin RPCs; never updated or deleted.
create table public.approval_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action public.approval_action not null,
  from_status public.profile_status,
  to_status public.profile_status,
  from_role public.profile_role,
  to_role public.profile_role,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.approval_history is
  'Append-only audit trail for identity/role/admin decisions. Written by RPCs only.';

create index approval_history_profile_id_idx on public.approval_history (profile_id);
create index approval_history_created_at_idx on public.approval_history (created_at desc);

alter table public.approval_history enable row level security;
alter table public.approval_history force row level security;
