drop function if exists public.update_export_shipment_details(uuid, jsonb);

grant update (shipment_details, updated_at) on public.export_contracts to anon, authenticated;

drop policy if exists export_contracts_demo_shipment_update on public.export_contracts;
create policy export_contracts_demo_shipment_update
on public.export_contracts
for update
to anon
using (
  is_demo = true
  and organization_id = '11111111-1111-4111-8111-111111111111'::uuid
  and archived_at is null
)
with check (
  is_demo = true
  and organization_id = '11111111-1111-4111-8111-111111111111'::uuid
  and archived_at is null
);
