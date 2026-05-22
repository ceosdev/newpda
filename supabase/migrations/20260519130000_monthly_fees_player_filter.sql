-- Adjust the eligible-player filter for monthly-fee generation (Spec 007).
--
-- Two changes vs 20260519120000:
--  1. Drop the `is_monthly` filter — the `players` table only ever holds
--     role = 'player' profiles (spectators have no players row), so every
--     player is a fee payer. `is_monthly` is unrelated to this generation.
--  2. Exclude goalkeepers (`preferred_position = 'goalkeeper'`). Players with
--     no position set are still included (`is distinct from`).
--
-- Both functions are redefined in full (create or replace).

create or replace function public.preview_monthly_fees(p_month integer)
returns table (
  target_year integer,
  type_ok boolean,
  suggested_amount_cents integer,
  eligible_player_count integer,
  already_generated_count integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_target_year integer;
  v_type_id uuid;
  v_amount integer;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem gerar mensalidades' using errcode = '42501';
  end if;

  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'mês inválido' using errcode = '22023';
  end if;

  v_target_year := case
    when extract(month from current_date)::int = 12 and p_month = 1
      then extract(year from current_date)::int + 1
    else extract(year from current_date)::int
  end;

  select tt.id, tt.suggested_amount_cents
    into v_type_id, v_amount
  from public.transaction_types tt
  where lower(btrim(tt.description)) = 'mensalidade'
    and tt.is_active = true
  limit 1;

  return query
  select
    v_target_year,
    v_type_id is not null,
    v_amount,
    (
      select count(*)::int
      from public.players pl
      where pl.player_status in ('active', 'injured')
        and pl.archived_at is null
        and pl.preferred_position is distinct from 'goalkeeper'
    ),
    (
      select count(*)::int
      from public.transactions t
      where v_type_id is not null
        and t.transaction_type_id = v_type_id
        and extract(month from t.occurred_on)::int = p_month
        and extract(year from t.occurred_on)::int = v_target_year
    );
end;
$$;

revoke execute on function public.preview_monthly_fees(integer) from public, anon;
grant execute on function public.preview_monthly_fees(integer) to authenticated;


create or replace function public.generate_monthly_fees(p_month integer)
returns table (
  generated integer,
  skipped integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_year integer;
  v_occurred_on date;
  v_type_id uuid;
  v_amount integer;
  v_eligible integer;
  v_generated integer;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem gerar mensalidades' using errcode = '42501';
  end if;

  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'mês inválido' using errcode = '22023';
  end if;

  v_target_year := case
    when extract(month from current_date)::int = 12 and p_month = 1
      then extract(year from current_date)::int + 1
    else extract(year from current_date)::int
  end;
  v_occurred_on := make_date(v_target_year, p_month, 1);

  select tt.id, tt.suggested_amount_cents
    into v_type_id, v_amount
  from public.transaction_types tt
  where lower(btrim(tt.description)) = 'mensalidade'
    and tt.is_active = true
  limit 1;

  if v_type_id is null then
    raise exception 'Não será possível gerar as mensalidades por não existir um tipo de lançamento ativo chamado ''Mensalidade''.'
      using errcode = '22023';
  end if;

  if v_amount is null or v_amount <= 0 then
    raise exception 'O tipo de lançamento ''Mensalidade'' não possui valor sugerido configurado. Configure um valor antes de gerar as mensalidades.'
      using errcode = '22023';
  end if;

  select count(*)::int into v_eligible
  from public.players pl
  where pl.player_status in ('active', 'injured')
    and pl.archived_at is null
    and pl.preferred_position is distinct from 'goalkeeper';

  if v_eligible = 0 then
    raise exception 'Não há jogadores ativos para gerar mensalidades.'
      using errcode = '22023';
  end if;

  -- One open income transaction per eligible player (active/injured, not a
  -- goalkeeper), skipping anyone who already has a "Mensalidade" for this
  -- month/year (no duplicates per player).
  with eligible as (
    select pl.id as player_id
    from public.players pl
    where pl.player_status in ('active', 'injured')
      and pl.archived_at is null
      and pl.preferred_position is distinct from 'goalkeeper'
  ),
  fresh as (
    select e.player_id
    from eligible e
    where not exists (
      select 1
      from public.transactions t
      where t.transaction_type_id = v_type_id
        and t.player_id = e.player_id
        and extract(month from t.occurred_on)::int = p_month
        and extract(year from t.occurred_on)::int = v_target_year
    )
  ),
  inserted as (
    insert into public.transactions (
      occurred_on, transaction_type_id, player_id, operation, amount_cents, created_by
    )
    select v_occurred_on, v_type_id, f.player_id, 'income', v_amount, auth.uid()
    from fresh f
    returning 1
  )
  select count(*)::int into v_generated from inserted;

  return query select v_generated, v_eligible - v_generated;
end;
$$;

revoke execute on function public.generate_monthly_fees(integer) from public, anon;
grant execute on function public.generate_monthly_fees(integer) to authenticated;
