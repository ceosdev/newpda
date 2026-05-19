-- Treat a zero (or absent) paid amount as "no payment" (Spec 006 adjustment).
--
-- Editar um lançamento e zerar o valor pago (deixar R$ 0,00 ou vazio) passa a
-- significar "sem pagamento" — o lançamento volta a 'open'. Tanto create quanto
-- update normalizam: paid 0/null => paid_amount_cents e paid_on viram NULL.
-- Assim a coluna gerada `status` continua correta (null => open) e os checks da
-- tabela (paid > 0 quando não nulo) seguem válidos.

create or replace function public.create_transaction(
  p_occurred_on date,
  p_transaction_type_id uuid,
  p_operation public.transaction_operation,
  p_amount_cents integer,
  p_player_id uuid default null,
  p_paid_amount_cents integer default null,
  p_paid_on date default null,
  p_notes text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid_amount integer;
  v_paid_on date;
  v_returning public.transactions;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem criar lançamentos' using errcode = '42501';
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
  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'observação deve ter no máximo 500 caracteres' using errcode = '22023';
  end if;

  -- Valor pago 0 ou ausente = sem pagamento (lançamento aberto).
  if p_paid_amount_cents is null or p_paid_amount_cents = 0 then
    v_paid_amount := null;
    v_paid_on := null;
  else
    if p_paid_amount_cents < 0 then
      raise exception 'valor pago não pode ser negativo' using errcode = '22023';
    end if;
    if p_paid_amount_cents > p_amount_cents then
      raise exception 'valor pago não pode exceder o valor do lançamento' using errcode = '22023';
    end if;
    if p_paid_on is null then
      raise exception 'informe a data de pagamento' using errcode = '22023';
    end if;
    v_paid_amount := p_paid_amount_cents;
    v_paid_on := p_paid_on;
  end if;

  insert into public.transactions (
    occurred_on, transaction_type_id, player_id, operation,
    amount_cents, paid_amount_cents, paid_on, notes, created_by
  )
  values (
    p_occurred_on, p_transaction_type_id, p_player_id, p_operation,
    p_amount_cents, v_paid_amount, v_paid_on, p_notes, auth.uid()
  )
  returning * into v_returning;

  return v_returning;
end;
$$;


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
  v_paid_amount integer;
  v_paid_on date;
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
  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'observação deve ter no máximo 500 caracteres' using errcode = '22023';
  end if;

  -- Valor pago 0 ou ausente = sem pagamento (lançamento aberto).
  if p_paid_amount_cents is null or p_paid_amount_cents = 0 then
    v_paid_amount := null;
    v_paid_on := null;
  else
    if p_paid_amount_cents < 0 then
      raise exception 'valor pago não pode ser negativo' using errcode = '22023';
    end if;
    if p_paid_amount_cents > p_amount_cents then
      raise exception 'valor pago não pode exceder o valor do lançamento' using errcode = '22023';
    end if;
    if p_paid_on is null then
      raise exception 'informe a data de pagamento' using errcode = '22023';
    end if;
    v_paid_amount := p_paid_amount_cents;
    v_paid_on := p_paid_on;
  end if;

  update public.transactions set
    occurred_on = p_occurred_on,
    transaction_type_id = p_transaction_type_id,
    player_id = p_player_id,
    operation = p_operation,
    amount_cents = p_amount_cents,
    paid_amount_cents = v_paid_amount,
    paid_on = v_paid_on,
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
