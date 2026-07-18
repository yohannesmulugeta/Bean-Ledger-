alter table public.export_contracts
  add column if not exists shipment_details jsonb not null default '{}'::jsonb;

alter table public.export_contracts
  drop constraint if exists export_contracts_shipment_details_object;

alter table public.export_contracts
  add constraint export_contracts_shipment_details_object
  check (jsonb_typeof(shipment_details) = 'object');

create or replace function public.update_export_shipment_details(
  p_export_contract_id uuid,
  p_shipment_details jsonb
)
returns public.export_contracts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old public.export_contracts;
  v_contract public.export_contracts;
begin
  if p_shipment_details is null or jsonb_typeof(p_shipment_details) <> 'object' then
    raise exception 'Shipment details must be a JSON object';
  end if;

  select * into v_old
  from public.export_contracts
  where id = p_export_contract_id
  for update;

  if not found then raise exception 'Export contract not found'; end if;
  if v_old.archived_at is not null then raise exception 'Cannot update archived export contract'; end if;

  if auth.uid() is null then
    if not (v_old.is_demo and v_old.organization_id = '11111111-1111-4111-8111-111111111111'::uuid) then
      raise exception 'Not authorized';
    end if;
  elsif not public.is_member(v_old.organization_id) then
    raise exception 'Not authorized';
  end if;

  update public.export_contracts
  set shipment_details = p_shipment_details,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_export_contract_id
  returning * into v_contract;

  insert into public.audit_logs (
    organization_id, profile_id, is_demo, action_type, entity_table,
    entity_id, record_description, reason, changes
  ) values (
    v_contract.organization_id, auth.uid(), v_contract.is_demo, 'Edited',
    'export_contracts', v_contract.id, v_contract.contract_no,
    'Shipment documents updated',
    jsonb_build_object('old', v_old.shipment_details, 'new', v_contract.shipment_details)
  );

  return v_contract;
end;
$$;

revoke all on function public.update_export_shipment_details(uuid, jsonb) from public;
grant execute on function public.update_export_shipment_details(uuid, jsonb) to anon, authenticated;
