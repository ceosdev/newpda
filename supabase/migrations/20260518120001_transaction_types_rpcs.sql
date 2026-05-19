-- Admin-only CRUD RPCs for transaction types (Spec 005).
--
-- create_transaction_type — admin: insert, returns the new row
-- update_transaction_type — admin: full-replace of the three fields, returns the row
-- delete_transaction_type — admin: hard delete
--
-- update_transaction_type has no defaulted arguments by design: it is a
-- full-replace, so every call must be explicit. A defaulted arg could silently
-- wipe data on omission (omitting is_active would reactivate the type; omitting
-- the amount would null it). create may default — there it means the initial
-- value, not a partial update.

create or replace function public.create_transaction_type(
  p_description text,
  p_suggested_amount_cents integer default null,
  p_is_active boolean default true
)
returns public.transaction_types
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_description text := btrim(p_description);
  v_returning public.transaction_types;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem gerenciar tipos de lançamento' using errcode = '42501';
  end if;

  if v_description is null or char_length(v_description) = 0 then
    raise exception 'descrição é obrigatória' using errcode = '22023';
  end if;

  if char_length(v_description) > 80 then
    raise exception 'descrição deve ter no máximo 80 caracteres' using errcode = '22023';
  end if;

  if p_suggested_amount_cents is not null and p_suggested_amount_cents < 0 then
    raise exception 'valor sugerido não pode ser negativo' using errcode = '22023';
  end if;

  insert into public.transaction_types (description, suggested_amount_cents, is_active)
  values (v_description, p_suggested_amount_cents, coalesce(p_is_active, true))
  returning * into v_returning;

  return v_returning;
end;
$$;

revoke execute on function public.create_transaction_type(text, integer, boolean) from public, anon;
grant execute on function public.create_transaction_type(text, integer, boolean) to authenticated;


create or replace function public.update_transaction_type(
  p_id uuid,
  p_description text,
  p_suggested_amount_cents integer,
  p_is_active boolean
)
returns public.transaction_types
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_description text := btrim(p_description);
  v_returning public.transaction_types;
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem gerenciar tipos de lançamento' using errcode = '42501';
  end if;

  if v_description is null or char_length(v_description) = 0 then
    raise exception 'descrição é obrigatória' using errcode = '22023';
  end if;

  if char_length(v_description) > 80 then
    raise exception 'descrição deve ter no máximo 80 caracteres' using errcode = '22023';
  end if;

  if p_suggested_amount_cents is not null and p_suggested_amount_cents < 0 then
    raise exception 'valor sugerido não pode ser negativo' using errcode = '22023';
  end if;

  if p_is_active is null then
    raise exception 'status ativo é obrigatório' using errcode = '22023';
  end if;

  update public.transaction_types
  set description = v_description,
      suggested_amount_cents = p_suggested_amount_cents,
      is_active = p_is_active,
      updated_at = now()
  where id = p_id
  returning * into v_returning;

  if not found then
    raise exception 'tipo de lançamento não encontrado' using errcode = 'P0002';
  end if;

  return v_returning;
end;
$$;

revoke execute on function public.update_transaction_type(uuid, text, integer, boolean) from public, anon;
grant execute on function public.update_transaction_type(uuid, text, integer, boolean) to authenticated;


create or replace function public.delete_transaction_type(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'apenas administradores podem gerenciar tipos de lançamento' using errcode = '42501';
  end if;

  delete from public.transaction_types where id = p_id;

  if not found then
    raise exception 'tipo de lançamento não encontrado' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.delete_transaction_type(uuid) from public, anon;
grant execute on function public.delete_transaction_type(uuid) to authenticated;
