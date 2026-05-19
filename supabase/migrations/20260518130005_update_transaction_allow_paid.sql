-- Allow editing a paid transaction (Spec 006 adjustment).
--
-- The original update_transaction refused to touch a transaction whose status
-- was 'paid'. By user decision a paid transaction can now be edited normally,
-- so this recreates the function without that guard. Same signature.

create or replace function public.update_transaction(
  p_id uuid,
  p_occurred_on date,
  p_transaction_type_id uuid,
  p_operation public.transaction_operation,
  p_amount_cents integer,
  p_player_id uuid,
  p_paid_amount_cents integer,
  p_paid_on date,
  p_notes text
)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_returning public.transactions;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem editar lançamentos' using errcode = '42501';
  end if;

  if p_occurred_on is null then
    raise exception 'data do lançamento é obrigatória' using errcode = '22023';
  end if;
  if p_transaction_type_id is null then
    raise exception 'tipo de lançamento é obrigatório' using errcode = '22023';
  end if;
  if p_operation is null then
    raise exception 'operação é obrigatória' using errcode = '22023';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'valor do lançamento deve ser maior que zero' using errcode = '22023';
  end if;
  if (p_paid_amount_cents is null) <> (p_paid_on is null) then
    raise exception 'valor pago e data de pagamento devem ser preenchidos juntos' using errcode = '22023';
  end if;
  if p_paid_amount_cents is not null
     and (p_paid_amount_cents <= 0 or p_paid_amount_cents > p_amount_cents) then
    raise exception 'valor pago deve ser maior que zero e não pode exceder o valor do lançamento' using errcode = '22023';
  end if;
  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'observação deve ter no máximo 500 caracteres' using errcode = '22023';
  end if;

  update public.transactions set
    occurred_on = p_occurred_on,
    transaction_type_id = p_transaction_type_id,
    player_id = p_player_id,
    operation = p_operation,
    amount_cents = p_amount_cents,
    paid_amount_cents = p_paid_amount_cents,
    paid_on = p_paid_on,
    notes = p_notes,
    updated_at = now()
  where id = p_id
  returning * into v_returning;

  if not found then
    raise exception 'lançamento não encontrado' using errcode = 'P0002';
  end if;

  return v_returning;
end;
$$;
