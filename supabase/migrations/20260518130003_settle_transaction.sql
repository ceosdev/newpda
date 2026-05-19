-- Quick-settle RPC for the finance screen (Spec 006 adjustment).
--
-- "Baixar" um lançamento: marca como pago integralmente sem abrir o formulário
-- de edição — paid_amount_cents = amount_cents, paid_on = data de hoje. Admin
-- only. Recusa um lançamento que já está pago.

create or replace function public.settle_transaction(p_id uuid)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.transaction_status;
  v_returning public.transactions;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem dar baixa em lançamentos' using errcode = '42501';
  end if;

  select status into v_status from public.transactions where id = p_id for update;
  if not found then
    raise exception 'lançamento não encontrado' using errcode = 'P0002';
  end if;
  if v_status = 'paid' then
    raise exception 'este lançamento já está pago' using errcode = '22023';
  end if;

  update public.transactions set
    paid_amount_cents = amount_cents,
    paid_on = current_date,
    updated_at = now()
  where id = p_id
  returning * into v_returning;

  return v_returning;
end;
$$;

revoke execute on function public.settle_transaction(uuid) from public, anon;
grant execute on function public.settle_transaction(uuid) to authenticated;
