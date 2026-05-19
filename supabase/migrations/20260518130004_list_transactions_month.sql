-- Add a month-of-year filter to list_transactions (Spec 006 adjustment).
--
-- p_month (1-12, null = todos) filters by the month of occurred_on, regardless
-- of year. The signature changes, so the function is dropped and recreated.

drop function if exists public.list_transactions(
  integer, integer, public.transaction_operation, public.transaction_status
);

create function public.list_transactions(
  p_limit integer,
  p_offset integer,
  p_month integer default null,
  p_operation public.transaction_operation default null,
  p_status public.transaction_status default null
)
returns table (
  id uuid,
  occurred_on date,
  transaction_type_id uuid,
  type_description text,
  player_id uuid,
  player_nickname text,
  player_display_name text,
  operation public.transaction_operation,
  amount_cents integer,
  paid_amount_cents integer,
  paid_on date,
  status public.transaction_status,
  notes text,
  created_at timestamptz,
  created_by uuid,
  created_by_name text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not app.is_approved() then
    raise exception 'apenas membros aprovados podem ver os lançamentos' using errcode = '42501';
  end if;

  return query
    select
      t.id,
      t.occurred_on,
      t.transaction_type_id,
      tt.description,
      t.player_id,
      pl.nickname,
      pp.display_name,
      t.operation,
      t.amount_cents,
      t.paid_amount_cents,
      t.paid_on,
      t.status,
      t.notes,
      t.created_at,
      t.created_by,
      cp.display_name
    from public.transactions t
    join public.transaction_types tt on tt.id = t.transaction_type_id
    left join public.players pl on pl.id = t.player_id
    left join public.profiles pp on pp.id = pl.profile_id
    join public.profiles cp on cp.id = t.created_by
    where (p_month is null or extract(month from t.occurred_on) = p_month)
      and (p_operation is null or t.operation = p_operation)
      and (p_status is null or t.status = p_status)
    order by t.occurred_on desc, t.created_at desc, t.id desc
    limit p_limit offset p_offset;
end;
$$;

revoke execute on function public.list_transactions(integer, integer, integer, public.transaction_operation, public.transaction_status) from public, anon;
grant execute on function public.list_transactions(integer, integer, integer, public.transaction_operation, public.transaction_status) to authenticated;
