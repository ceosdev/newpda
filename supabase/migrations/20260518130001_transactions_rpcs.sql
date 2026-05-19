-- RPCs for the finance screen (Spec 006).
--
-- create_transaction / update_transaction / delete_transaction — admin writes
-- list_transactions    — approved: paginated, filtered, joined list
-- list_player_options  — approved: roster players for the form picker
--
-- update_transaction has no defaulted args (full-replace, every call explicit)
-- and refuses to touch a transaction that is already 'paid' — by design a paid
-- transaction is immutable; to fix it the admin deletes and launches anew.

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

  insert into public.transactions (
    occurred_on, transaction_type_id, player_id, operation,
    amount_cents, paid_amount_cents, paid_on, notes, created_by
  )
  values (
    p_occurred_on, p_transaction_type_id, p_player_id, p_operation,
    p_amount_cents, p_paid_amount_cents, p_paid_on, p_notes, auth.uid()
  )
  returning * into v_returning;

  return v_returning;
end;
$$;

revoke execute on function public.create_transaction(date, uuid, public.transaction_operation, integer, uuid, integer, date, text) from public, anon;
grant execute on function public.create_transaction(date, uuid, public.transaction_operation, integer, uuid, integer, date, text) to authenticated;


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
  v_status public.transaction_status;
  v_returning public.transactions;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem editar lançamentos' using errcode = '42501';
  end if;

  select status into v_status from public.transactions where id = p_id for update;
  if not found then
    raise exception 'lançamento não encontrado' using errcode = 'P0002';
  end if;
  if v_status = 'paid' then
    raise exception 'lançamentos pagos não podem ser editados; exclua e lance um novo' using errcode = '22023';
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

  return v_returning;
end;
$$;

revoke execute on function public.update_transaction(uuid, date, uuid, public.transaction_operation, integer, uuid, integer, date, text) from public, anon;
grant execute on function public.update_transaction(uuid, date, uuid, public.transaction_operation, integer, uuid, integer, date, text) to authenticated;


create or replace function public.delete_transaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem excluir lançamentos' using errcode = '42501';
  end if;

  delete from public.transactions where id = p_id;

  if not found then
    raise exception 'lançamento não encontrado' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.delete_transaction(uuid) from public, anon;
grant execute on function public.delete_transaction(uuid) to authenticated;


-- Paginated, filtered list. Joined with the type (description), the player
-- (nickname/name, when set) and the creator profile (name). Ordered newest
-- first; a page shorter than p_limit means there are no more rows.
create or replace function public.list_transactions(
  p_limit integer,
  p_offset integer,
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
    where (p_operation is null or t.operation = p_operation)
      and (p_status is null or t.status = p_status)
    order by t.occurred_on desc, t.created_at desc, t.id desc
    limit p_limit offset p_offset;
end;
$$;

revoke execute on function public.list_transactions(integer, integer, public.transaction_operation, public.transaction_status) from public, anon;
grant execute on function public.list_transactions(integer, integer, public.transaction_operation, public.transaction_status) to authenticated;


-- Roster players for the transaction form picker: active + injured (DM) only.
create or replace function public.list_player_options()
returns table (
  id uuid,
  nickname text,
  display_name text,
  player_status public.player_status
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not app.is_approved() then
    raise exception 'apenas membros aprovados podem ver os jogadores' using errcode = '42501';
  end if;

  return query
    select pl.id, pl.nickname, pp.display_name, pl.player_status
    from public.players pl
    join public.profiles pp on pp.id = pl.profile_id
    where pl.player_status in ('active', 'injured')
      and pl.archived_at is null
    order by coalesce(lower(pl.nickname), lower(pp.display_name));
end;
$$;

revoke execute on function public.list_player_options() from public, anon;
grant execute on function public.list_player_options() to authenticated;
