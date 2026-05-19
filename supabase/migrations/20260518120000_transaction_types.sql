-- Transaction types: reusable labels for the finance module (Spec 005).
--
-- A transaction type is a configuration row — "Mensalidade", "Pagamento do
-- campo", "Pagamento do juiz" — carrying a description, an active flag and an
-- optional suggested amount stored in cents. The future finance module's
-- "generate monthly fees" feature will start from one of these.
--
-- Admin-only for both read and write: RLS allows select only to admins; all
-- writes go through the security-definer RPCs in the next migration, so there
-- are no insert/update/delete policies.

create table public.transaction_types (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  suggested_amount_cents integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_types_description_length
    check (char_length(description) between 1 and 80),
  constraint transaction_types_suggested_amount_non_negative
    check (suggested_amount_cents is null or suggested_amount_cents >= 0)
);

comment on table public.transaction_types is
  'Tipos de lançamento do módulo financeiro (descrição, status ativo, valor sugerido em centavos). Configuração admin-only — leitura e escrita restritas a admin. suggested_amount_cents NULL = sem valor sugerido; 0 é um valor válido.';

-- Description is unique ignoring case and surrounding whitespace, across both
-- active and inactive types.
create unique index transaction_types_description_unique_idx
  on public.transaction_types (lower(btrim(description)));

alter table public.transaction_types enable row level security;
alter table public.transaction_types force row level security;

-- Read: admin only. Writes have no policy — they go exclusively through the
-- security-definer RPCs.
create policy transaction_types_select_admin
  on public.transaction_types
  for select
  to authenticated
  using (app.is_admin());
