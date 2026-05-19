-- Recreate delete_transaction_type with an in-use guard (Spec 006).
--
-- Now that transactions reference transaction_types (on delete restrict),
-- deleting a type in use would otherwise fail with a raw FK violation. This
-- raises a friendly PT-BR message instead. errcode P0001 is deliberate: it is
-- not mapped by mapSupabaseError, so the message reaches the user verbatim
-- (errcode 23503 would be replaced by a generic text).

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

  if exists (select 1 from public.transactions where transaction_type_id = p_id) then
    raise exception 'Este tipo de lançamento está em uso por lançamentos e não pode ser excluído.'
      using errcode = 'P0001';
  end if;

  delete from public.transaction_types where id = p_id;

  if not found then
    raise exception 'tipo de lançamento não encontrado' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.delete_transaction_type(uuid) from public, anon;
grant execute on function public.delete_transaction_type(uuid) to authenticated;
