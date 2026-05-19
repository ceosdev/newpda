-- Financial transactions (lançamentos) — Spec 006.
--
-- One row per movement: a date, a transaction type, an operation (income or
-- expense), an amount, optionally a roster player, and payment control (paid
-- amount + paid date, supporting partial payment). `status` is a stored
-- generated column derived from amount/paid amount — never set by hand.
--
-- Read is open to any approved profile; writes go through admin-only
-- security-definer RPCs (next migration), so there are no write policies.

create type public.transaction_operation as enum ('income', 'expense');
create type public.transaction_status as enum ('open', 'partial', 'paid');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null default current_date,
  transaction_type_id uuid not null references public.transaction_types (id) on delete restrict,
  player_id uuid references public.players (id) on delete restrict,
  operation public.transaction_operation not null,
  amount_cents integer not null,
  paid_amount_cents integer,
  paid_on date,
  notes text,
  status public.transaction_status generated always as (
    case
      when paid_amount_cents is null then 'open'::public.transaction_status
      when paid_amount_cents >= amount_cents then 'paid'::public.transaction_status
      else 'partial'::public.transaction_status
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  constraint transactions_amount_positive check (amount_cents > 0),
  constraint transactions_paid_amount_valid check (
    paid_amount_cents is null
    or (paid_amount_cents > 0 and paid_amount_cents <= amount_cents)
  ),
  constraint transactions_payment_pair check (
    (paid_amount_cents is null) = (paid_on is null)
  ),
  constraint transactions_notes_length check (
    notes is null or char_length(notes) <= 500
  )
);

comment on table public.transactions is
  'Lançamentos financeiros da pelada. status é coluna gerada (open/partial/paid) a partir de amount_cents/paid_amount_cents. Leitura para qualquer aprovado; escrita admin-only via RPC.';

create index transactions_order_idx
  on public.transactions (occurred_on desc, created_at desc, id desc);
create index transactions_type_idx on public.transactions (transaction_type_id);
create index transactions_player_idx on public.transactions (player_id);

alter table public.transactions enable row level security;
alter table public.transactions force row level security;

-- Read: any approved profile (player or spectator). Writes have no policy —
-- they go exclusively through the security-definer RPCs.
create policy transactions_select_approved
  on public.transactions
  for select
  to authenticated
  using (app.is_approved());
