-- Demo-only: the app uses a local demo login, not Supabase Auth.
-- Keep every anon write restricted to synthetic rows in the seeded demo organization.

alter view public.demo_dashboard_summary_v set (security_invoker = true);

alter table public.suppliers enable row level security;
alter table public.purchase_records enable row level security;
alter table public.purchase_additional_costs enable row level security;
alter table public.purchase_payments enable row level security;

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn.signature);
  end loop;
end $$;

grant select, insert, update, delete on public.suppliers to anon;

grant select, insert, update, delete on public.purchase_records to anon;
grant select, insert, update, delete on public.purchase_additional_costs to anon;
grant select, insert, update, delete on public.purchase_payments to anon;
grant execute on function public.recalculate_purchase_record(uuid) to anon;

drop policy if exists suppliers_demo_anon_all on public.suppliers;
drop policy if exists suppliers_demo_anon_select on public.suppliers;
drop policy if exists suppliers_demo_anon_insert on public.suppliers;
drop policy if exists suppliers_demo_anon_update on public.suppliers;
drop policy if exists suppliers_demo_anon_delete on public.suppliers;

create policy suppliers_demo_anon_select
on public.suppliers for select to anon
using (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy suppliers_demo_anon_insert
on public.suppliers for insert to anon
with check (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy suppliers_demo_anon_update
on public.suppliers for update to anon
using (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid)
with check (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy suppliers_demo_anon_delete
on public.suppliers for delete to anon
using (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

drop policy if exists purchase_records_demo_anon_all on public.purchase_records;
drop policy if exists purchase_records_demo_anon_select on public.purchase_records;
drop policy if exists purchase_records_demo_anon_insert on public.purchase_records;
drop policy if exists purchase_records_demo_anon_update on public.purchase_records;
drop policy if exists purchase_records_demo_anon_delete on public.purchase_records;

create policy purchase_records_demo_anon_select
on public.purchase_records for select to anon
using (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy purchase_records_demo_anon_insert
on public.purchase_records for insert to anon
with check (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy purchase_records_demo_anon_update
on public.purchase_records for update to anon
using (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid)
with check (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy purchase_records_demo_anon_delete
on public.purchase_records for delete to anon
using (is_demo = true and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

drop policy if exists purchase_costs_demo_anon_all on public.purchase_additional_costs;
drop policy if exists purchase_costs_demo_anon_select on public.purchase_additional_costs;
drop policy if exists purchase_costs_demo_anon_insert on public.purchase_additional_costs;
drop policy if exists purchase_costs_demo_anon_update on public.purchase_additional_costs;
drop policy if exists purchase_costs_demo_anon_delete on public.purchase_additional_costs;

create policy purchase_costs_demo_anon_select
on public.purchase_additional_costs for select to anon
using (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
));

create policy purchase_costs_demo_anon_insert
on public.purchase_additional_costs for insert to anon
with check (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
));

create policy purchase_costs_demo_anon_update
on public.purchase_additional_costs for update to anon
using (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
))
with check (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
));

create policy purchase_costs_demo_anon_delete
on public.purchase_additional_costs for delete to anon
using (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
));

drop policy if exists purchase_payments_demo_anon_all on public.purchase_payments;
drop policy if exists purchase_payments_demo_anon_select on public.purchase_payments;
drop policy if exists purchase_payments_demo_anon_insert on public.purchase_payments;
drop policy if exists purchase_payments_demo_anon_update on public.purchase_payments;
drop policy if exists purchase_payments_demo_anon_delete on public.purchase_payments;

create policy purchase_payments_demo_anon_select
on public.purchase_payments for select to anon
using (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
));

create policy purchase_payments_demo_anon_insert
on public.purchase_payments for insert to anon
with check (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
));

create policy purchase_payments_demo_anon_update
on public.purchase_payments for update to anon
using (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
))
with check (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
));

create policy purchase_payments_demo_anon_delete
on public.purchase_payments for delete to anon
using (exists (
  select 1 from public.purchase_records pr
  where pr.id = purchase_record_id
    and pr.is_demo = true
    and pr.organization_id = '11111111-1111-4111-8111-111111111111'::uuid
));

drop policy if exists demo_document_objects_select_anon on storage.objects;
create policy demo_document_objects_select_anon
on storage.objects
for select
to anon
using (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and name like '11111111-1111-4111-8111-111111111111/%'
);

drop policy if exists demo_document_objects_insert_anon on storage.objects;
create policy demo_document_objects_insert_anon
on storage.objects
for insert
to anon
with check (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and name like '11111111-1111-4111-8111-111111111111/%'
);
