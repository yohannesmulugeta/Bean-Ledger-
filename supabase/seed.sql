-- Phase 4 DEMO-ONLY seed data.
-- These rows are synthetic and must not be treated as migrated Base44 production records.

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values (
  '22222222-2222-4222-8222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo-admin@kkgt.local',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"],"demo":true}'::jsonb,
  '{"full_name":"Demo Admin","demo":true}'::jsonb
) on conflict (id) do nothing;

insert into public.organizations (id, name, slug, base44_id, is_demo)
values ('11111111-1111-4111-8111-111111111111', 'KKGT Flow Demo Organization', 'kkgt-flow-demo', null, true)
on conflict (id) do update set name = excluded.name, slug = excluded.slug, is_demo = true;

insert into public.profiles (id, email, full_name, role_key, is_active, status, base44_id, is_demo)
values ('22222222-2222-4222-8222-222222222222', 'demo-admin@kkgt.local', 'Demo Admin', 'admin', true, 'active', null, true)
on conflict (id) do update set full_name = excluded.full_name, role_key = 'admin', is_demo = true;

insert into public.roles (id, organization_id, key, label, is_demo)
values
  ('77777777-7777-4777-8777-000000000001', '11111111-1111-4111-8111-111111111111', 'admin', 'Demo Admin', true),
  ('77777777-7777-4777-8777-000000000002', '11111111-1111-4111-8111-111111111111', 'purchaser', 'Demo Purchaser', true)
on conflict (organization_id, key) do update set label = excluded.label, is_demo = true;

insert into public.permissions (key, label, module_key, action_key, is_demo)
values
  ('suppliers.view', 'View demo suppliers', 'suppliers', 'view', true),
  ('suppliers.manage', 'Manage demo suppliers', 'suppliers', 'manage', true),
  ('purchases.view', 'View demo purchases', 'purchases', 'view', true),
  ('purchases.manage', 'Manage demo purchases', 'purchases', 'manage', true)
on conflict (key) do update set label = excluded.label, is_demo = true;

insert into public.organization_memberships (organization_id, profile_id, role_id, status, is_demo)
select '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', r.id, 'active', true
from public.roles r
where r.organization_id = '11111111-1111-4111-8111-111111111111' and r.key = 'admin'
on conflict (organization_id, profile_id) do update set role_id = excluded.role_id, status = 'active', is_demo = true;

insert into public.suppliers (
  id, organization_id, base44_id, is_demo, supplier_name, region, agent, coffee_type,
  opening_stock_kg, phone_number, coffee_origin, station_name, agreement_date, agreement_expiry_date
) values
  ('33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-111111111111', null, true, 'Demo Wollega Cooperative', 'Wollega', 'Demo Agent A', 'Unwashed Lekempti', 1250, '+251900000001', 'Wollega', 'Demo Station West', '2026-01-15', '2026-12-31'),
  ('33333333-3333-4333-8333-000000000002', '11111111-1111-4111-8111-111111111111', null, true, 'Demo Guji Washing Station', 'Guji', 'Demo Agent B', 'Washed Guji', 840, '+251900000002', 'Guji', 'Demo Guji Station', '2026-02-01', '2026-11-30'),
  ('33333333-3333-4333-8333-000000000003', '11111111-1111-4111-8111-111111111111', null, true, 'Demo Sidama Export Farm', 'Sidama', 'Demo Agent C', 'Natural Sidama', 620, '+251900000003', 'Sidama', 'Demo Sidama Station', '2026-03-10', '2027-03-09')
on conflict (id) do update set supplier_name = excluded.supplier_name, is_demo = true;

insert into public.purchase_records (
  id, organization_id, supplier_id, base44_id, is_demo, coffee_code, purchase_date,
  supplier_name, agent, region, coffee_type, net_dispatch_weight_kg, warehouse_received_kg,
  unit_price_etb_per_feresula, commission_percent
) values
  ('44444444-4444-4444-8444-000000000001', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', null, true, 'DEMO/WOL/001/2026', '2026-06-02', 'Demo Wollega Cooperative', 'Demo Agent A', 'Wollega', 'Unwashed Lekempti', 1700, 1666, 5400, 3),
  ('44444444-4444-4444-8444-000000000002', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000002', null, true, 'DEMO/GUJ/002/2026', '2026-06-04', 'Demo Guji Washing Station', 'Demo Agent B', 'Guji', 'Washed Guji', 850, 850, 6200, 2.5),
  ('44444444-4444-4444-8444-000000000003', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000003', null, true, 'DEMO/SID/003/2026', '2026-06-07', 'Demo Sidama Export Farm', 'Demo Agent C', 'Sidama', 'Natural Sidama', 1190, null, 5800, 3.5),
  ('44444444-4444-4444-8444-000000000004', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', null, true, 'DEMO/WOL/004/2026', '2026-06-10', 'Demo Wollega Cooperative', 'Demo Agent A', 'Wollega', 'Unwashed Lekempti', 680, 680, 5500, 3)
on conflict (id) do update set coffee_code = excluded.coffee_code, is_demo = true;

insert into public.purchase_additional_costs (id, purchase_record_id, base44_id, is_demo, name, amount_etb)
values
  ('55555555-5555-4555-8555-000000000001', '44444444-4444-4444-8444-000000000001', null, true, 'Demo transport', 12000),
  ('55555555-5555-4555-8555-000000000002', '44444444-4444-4444-8444-000000000001', null, true, 'Demo loading', 3500),
  ('55555555-5555-4555-8555-000000000003', '44444444-4444-4444-8444-000000000002', null, true, 'Demo handling', 2500),
  ('55555555-5555-4555-8555-000000000004', '44444444-4444-4444-8444-000000000003', null, true, 'Demo transport', 8000)
on conflict (id) do update set amount_etb = excluded.amount_etb, is_demo = true;

insert into public.purchase_payments (id, purchase_record_id, base44_id, is_demo, payment_no, payment_date, amount_etb, bank_name, cpv_reference)
values
  ('66666666-6666-4666-8666-000000000001', '44444444-4444-4444-8444-000000000001', null, true, 1, '2026-06-05', 350000, 'Demo Bank', 'DEMO-CPV-001'),
  ('66666666-6666-4666-8666-000000000002', '44444444-4444-4444-8444-000000000001', null, true, 2, '2026-06-08', 210000, 'Demo Bank', 'DEMO-CPV-002'),
  ('66666666-6666-4666-8666-000000000003', '44444444-4444-4444-8444-000000000002', null, true, 1, '2026-06-06', 325000, 'Demo Bank', 'DEMO-CPV-003'),
  ('66666666-6666-4666-8666-000000000004', '44444444-4444-4444-8444-000000000003', null, true, 1, '2026-06-09', 250000, 'Demo Bank', 'DEMO-CPV-004')
on conflict (id) do update set amount_etb = excluded.amount_etb, is_demo = true;

select public.recalculate_purchase_record('44444444-4444-4444-8444-000000000001');
select public.recalculate_purchase_record('44444444-4444-4444-8444-000000000002');
select public.recalculate_purchase_record('44444444-4444-4444-8444-000000000003');
select public.recalculate_purchase_record('44444444-4444-4444-8444-000000000004');

insert into public.warehouse_receipts (
  id, organization_id, purchase_record_id, supplier_id, base44_id, receipt_number,
  coffee_code, supplier_name, received_date, dispatch_kg, received_kg, shortage_kg,
  warehouse_name, status, notes, is_demo, archived_at
) values
  ('88888888-8888-4888-8888-000000000001', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000001', null, 'DEMO-WH-001', 'DEMO/WOL/001/2026', 'Demo Wollega Cooperative', '2026-06-03', 1700, 1666, 34, 'Demo Warehouse A', 'received', 'Synthetic partial shortage receipt', true, null),
  ('88888888-8888-4888-8888-000000000002', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-000000000002', '33333333-3333-4333-8333-000000000002', null, 'DEMO-WH-002', 'DEMO/GUJ/002/2026', 'Demo Guji Washing Station', '2026-06-05', 850, 850, 0, 'Demo Warehouse A', 'received', 'Synthetic exact receipt', true, null),
  ('88888888-8888-4888-8888-000000000003', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-000000000004', '33333333-3333-4333-8333-000000000001', null, 'DEMO-WH-003', 'DEMO/WOL/004/2026', 'Demo Wollega Cooperative', '2026-06-11', 680, 680, 0, 'Demo Warehouse B', 'received', 'Synthetic second receipt for supplier availability', true, null),
  ('88888888-8888-4888-8888-000000000004', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-000000000003', '33333333-3333-4333-8333-000000000003', null, 'DEMO-WH-ARCHIVED', 'DEMO/SID/003/2026', 'Demo Sidama Export Farm', '2026-06-08', 1190, 1173, 17, 'Demo Warehouse Archive', 'archived', 'Synthetic archived receipt', true, '2026-06-12T08:00:00Z')
on conflict (id) do update set received_kg = excluded.received_kg, shortage_kg = excluded.shortage_kg, is_demo = true, archived_at = excluded.archived_at;

insert into public.stock_movements (
  id, organization_id, supplier_id, purchase_record_id, warehouse_receipt_id,
  source_type, source_id, movement_type, stock_pool, quantity_kg,
  occurred_at, notes, is_demo, archived_at
) values
  ('99999999-9999-4999-8999-000000000001', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000001', '88888888-8888-4888-8888-000000000001', 'warehouse_receipt', '88888888-8888-4888-8888-000000000001', 'warehouse_received', 'supplier_available', 1666, '2026-06-03T08:00:00Z', 'Synthetic partial shortage receipt', true, null),
  ('99999999-9999-4999-8999-000000000002', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000002', '44444444-4444-4444-8444-000000000002', '88888888-8888-4888-8888-000000000002', 'warehouse_receipt', '88888888-8888-4888-8888-000000000002', 'warehouse_received', 'supplier_available', 850, '2026-06-05T08:00:00Z', 'Synthetic exact receipt', true, null),
  ('99999999-9999-4999-8999-000000000003', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000004', '88888888-8888-4888-8888-000000000003', 'warehouse_receipt', '88888888-8888-4888-8888-000000000003', 'warehouse_received', 'supplier_available', 680, '2026-06-11T08:00:00Z', 'Synthetic second receipt for supplier availability', true, null),
  ('99999999-9999-4999-8999-000000000004', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000003', '44444444-4444-4444-8444-000000000003', '88888888-8888-4888-8888-000000000004', 'warehouse_receipt', '88888888-8888-4888-8888-000000000004', 'warehouse_received', 'supplier_available', 1173, '2026-06-08T08:00:00Z', 'Synthetic archived receipt', true, '2026-06-12T08:00:00Z')
on conflict (id) do update set quantity_kg = excluded.quantity_kg, is_demo = true, archived_at = excluded.archived_at;

insert into public.sample_logs (
  id, organization_id, supplier_id, purchase_record_id, warehouse_receipt_id, base44_id,
  sample_type, supplier_name, coffee_type, coffee_code, sample_date, sample_datetime,
  sample_kg, company_recipient, keeper_name, remark, is_demo, archived_at
) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000001', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000001', '88888888-8888-4888-8888-000000000001', null, 'Warehouse', 'Demo Wollega Cooperative', 'Unwashed Lekempti', 'DEMO/WOL/001/2026', '2026-06-04', '2026-06-04T09:00:00Z', 12, 'Demo Lab', 'Demo Keeper', 'Synthetic demo sample deduction', true, null),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000002', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000002', '44444444-4444-4444-8444-000000000002', '88888888-8888-4888-8888-000000000002', null, 'Warehouse', 'Demo Guji Washing Station', 'Washed Guji', 'DEMO/GUJ/002/2026', '2026-06-06', '2026-06-06T09:00:00Z', 5, 'Demo Lab', 'Demo Keeper', 'Synthetic archived sample deduction', true, '2026-06-07T09:00:00Z')
on conflict (id) do update set sample_kg = excluded.sample_kg, is_demo = true, archived_at = excluded.archived_at;

insert into public.processing_logs (
  id, organization_id, supplier_id, purchase_record_id, warehouse_receipt_id, base44_id,
  entry_type, entry_mode, processing_date, supplier_name, coffee_type, coffee_code,
  bags_sent, kg_sent, actual_weighed_kg, batch_variance_kg, batch_no, remark, is_demo, archived_at
) values
  ('cccccccc-cccc-4ccc-8ccc-000000000001', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000001', '88888888-8888-4888-8888-000000000001', null, 'Standard', 'By Bags', '2026-06-06', 'Demo Wollega Cooperative', 'Unwashed Lekempti', 'DEMO/WOL/001/2026', 10, 850, 850, 0, 'DEMO-BATCH-001', 'Synthetic demo processing deduction', true, null),
  ('cccccccc-cccc-4ccc-8ccc-000000000002', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000002', '44444444-4444-4444-8444-000000000002', '88888888-8888-4888-8888-000000000002', null, 'Standard', 'By KG', '2026-06-07', 'Demo Guji Washing Station', 'Washed Guji', 'DEMO/GUJ/002/2026', null, null, 300, null, 'DEMO-BATCH-002', 'Synthetic demo by-KG processing deduction', true, null),
  ('cccccccc-cccc-4ccc-8ccc-000000000003', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000004', '88888888-8888-4888-8888-000000000003', null, 'Standard', 'By KG', '2026-06-12', 'Demo Wollega Cooperative', 'Unwashed Lekempti', 'DEMO/WOL/004/2026', null, null, 100, null, 'DEMO-BATCH-ARCHIVED', 'Synthetic archived processing deduction', true, '2026-06-13T09:00:00Z')
on conflict (id) do update set actual_weighed_kg = excluded.actual_weighed_kg, is_demo = true, archived_at = excluded.archived_at;

insert into public.output_reports (
  id, organization_id, processing_log_id, supplier_id, base44_id, entry_type,
  start_date, end_date, supplier_name, coffee_type, total_kg_processed,
  export_bags, export_kg, reject_bags, reject_kg, waste_kg, reject_pct, waste_pct,
  export_status, registrar_name, remark, is_demo, archived_at
) values
  ('dddddddd-dddd-4ddd-8ddd-000000000001', '11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-000000000001', '33333333-3333-4333-8333-000000000001', null, 'Standard', '2026-06-06', '2026-06-06', 'Demo Wollega Cooperative', 'Unwashed Lekempti', 850, 10, 600, 2, 170, 80, 20, 9.4118, 'Available for Export', 'Demo Registrar', 'Synthetic demo output report', true, null)
on conflict (id) do update set export_kg = excluded.export_kg, reject_kg = excluded.reject_kg, waste_kg = excluded.waste_kg, is_demo = true, archived_at = excluded.archived_at;

insert into public.stock_movements (
  id, organization_id, supplier_id, purchase_record_id, warehouse_receipt_id,
  source_type, source_id, movement_type, stock_pool, quantity_kg,
  occurred_at, notes, is_demo, archived_at
) values
  ('99999999-9999-4999-8999-000000000101', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000001', '88888888-8888-4888-8888-000000000001', 'sample_log', 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'sample_deduction', 'supplier_available', 12, '2026-06-04T09:00:00Z', 'Synthetic demo sample deduction', true, null),
  ('99999999-9999-4999-8999-000000000102', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000002', '44444444-4444-4444-8444-000000000002', '88888888-8888-4888-8888-000000000002', 'sample_log', 'bbbbbbbb-bbbb-4bbb-8bbb-000000000002', 'sample_deduction', 'supplier_available', 5, '2026-06-06T09:00:00Z', 'Synthetic archived sample deduction', true, '2026-06-07T09:00:00Z'),
  ('99999999-9999-4999-8999-000000000201', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000001', '88888888-8888-4888-8888-000000000001', 'processing_log', 'cccccccc-cccc-4ccc-8ccc-000000000001', 'processing_deduction', 'supplier_available', 850, '2026-06-06T08:00:00Z', 'Synthetic demo processing deduction', true, null),
  ('99999999-9999-4999-8999-000000000202', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000002', '44444444-4444-4444-8444-000000000002', '88888888-8888-4888-8888-000000000002', 'processing_log', 'cccccccc-cccc-4ccc-8ccc-000000000002', 'processing_deduction', 'supplier_available', 300, '2026-06-07T08:00:00Z', 'Synthetic demo by-KG processing deduction', true, null),
  ('99999999-9999-4999-8999-000000000203', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000004', '88888888-8888-4888-8888-000000000003', 'processing_log', 'cccccccc-cccc-4ccc-8ccc-000000000003', 'processing_deduction', 'supplier_available', 100, '2026-06-12T08:00:00Z', 'Synthetic archived processing deduction', true, '2026-06-13T09:00:00Z'),
  ('99999999-9999-4999-8999-000000000301', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', null, null, 'output_report', 'dddddddd-dddd-4ddd-8ddd-000000000001', 'output_export', 'export_available', 600, '2026-06-06T18:00:00Z', 'Synthetic demo export output', true, null),
  ('99999999-9999-4999-8999-000000000302', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', null, null, 'output_report', 'dddddddd-dddd-4ddd-8ddd-000000000001', 'output_reject', 'reject_available', 170, '2026-06-06T18:00:00Z', 'Synthetic demo reject output', true, null)
on conflict (id) do update set quantity_kg = excluded.quantity_kg, is_demo = true, archived_at = excluded.archived_at;

insert into public.warehouse_receipt_history (id, warehouse_receipt_id, organization_id, action_type, changes, reason, is_demo, created_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001', '88888888-8888-4888-8888-000000000001', '11111111-1111-4111-8111-111111111111', 'Created', '{"demo":true,"receipt_number":"DEMO-WH-001"}', 'Synthetic demo receipt seed', true, '2026-06-03T08:00:00Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000002', '88888888-8888-4888-8888-000000000002', '11111111-1111-4111-8111-111111111111', 'Created', '{"demo":true,"receipt_number":"DEMO-WH-002"}', 'Synthetic demo receipt seed', true, '2026-06-05T08:00:00Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000003', '88888888-8888-4888-8888-000000000003', '11111111-1111-4111-8111-111111111111', 'Created', '{"demo":true,"receipt_number":"DEMO-WH-003"}', 'Synthetic demo receipt seed', true, '2026-06-11T08:00:00Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000004', '88888888-8888-4888-8888-000000000004', '11111111-1111-4111-8111-111111111111', 'Archived', '{"demo":true,"receipt_number":"DEMO-WH-ARCHIVED"}', 'Synthetic archived demo receipt', true, '2026-06-12T08:00:00Z')
on conflict (id) do update set action_type = excluded.action_type, is_demo = true;

insert into public.export_contracts (
  id, organization_id, output_report_id, supplier_id, base44_id, contract_no, contract_pi_number, certificate_no,
  contract_date, stock_pool, coffee_type, coffee_grade, destination_country, buyer_name, payment_terms,
  expected_payment_date, export_bags, export_kg, export_sample_kg, actual_shipped_kg, pricing_method,
  price_per_lb_usd, total_lb, contract_rate_etb, rate_status, rate_confirmed_date,
  total_export_value_usd, total_export_value_etb, total_materials_etb, total_costs_etb, reject_sales_etb,
  grand_total_revenue_etb, profit_etb, profit_usd, profit_margin_pct, total_received_usd, total_received_etb,
  balance_etb, payment_status, status, remark, is_demo, archived_at
) values
  ('eeeeeeee-eeee-4eee-8eee-000000000001', '11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-000000000001', '33333333-3333-4333-8333-000000000001', null, 'DEMO-EXP-001-2026', 'DEMO-PI-001', 'DEMO-CERT-001', '2026-06-09', 'Fresh', 'Unwashed Lekempti', 'Grade 2', 'Germany', 'Demo Hamburg Buyer', 'Letter of Credit (LC)', '2026-07-10', 6, 360, 0, 360, 'per_lb', 2.85, 793.656, 120, 'Rate Confirmed', '2026-06-09', 2261.92, 271430.35, 15000, 35000, 12000, 283430.35, 248430.35, 2070.25, 87.650, 1000, 120000, 151430.35, 'Partial', 'In Progress', 'Synthetic demo export contract with partial payment', true, null),
  ('eeeeeeee-eeee-4eee-8eee-000000000002', '11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-000000000001', '33333333-3333-4333-8333-000000000001', null, 'DEMO-EXP-ARCHIVED-2026', 'DEMO-PI-ARCH', null, '2026-06-10', 'Fresh', 'Unwashed Lekempti', 'Grade 3', 'Italy', 'Demo Archived Buyer', 'Cash Against Documents (CAD)', null, 1, 60, 0, 60, 'per_lb', 2.50, 132.276, 120, 'Rate Confirmed', '2026-06-10', 330.69, 39682.80, 0, 5000, 0, 39682.80, 34682.80, 289.02, 87.400, 0, 0, 39682.80, 'Unpaid', 'Pending', 'Synthetic archived export contract', true, '2026-06-11T08:00:00Z')
on conflict (id) do update set export_kg = excluded.export_kg, total_export_value_etb = excluded.total_export_value_etb, is_demo = true, archived_at = excluded.archived_at;

insert into public.export_contract_costs (id, organization_id, export_contract_id, name, amount_etb, is_demo)
values
  ('efc00000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-000000000001', 'Demo freight', 20000, true),
  ('efc00000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-000000000002', 'Demo archive handling', 5000, true)
on conflict (id) do update set amount_etb = excluded.amount_etb, is_demo = true;

insert into public.export_contract_materials (id, organization_id, export_contract_id, name, quantity, unit_cost_etb, total_cost_etb, is_demo)
values
  ('efa00000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-000000000001', 'Demo Jute Bags', 6, 2500, 15000, true)
on conflict (id) do update set quantity = excluded.quantity, total_cost_etb = excluded.total_cost_etb, is_demo = true;

insert into public.export_contract_payments (id, organization_id, export_contract_id, payment_date, amount_usd, actual_rate_etb, amount_etb, bank_name, reference_no, note, is_demo)
values
  ('efb00000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-000000000001', '2026-06-20', 1000, 120, 120000, 'Demo Bank', 'DEMO-SWIFT-001', 'Synthetic partial export payment', true)
on conflict (id) do update set amount_etb = excluded.amount_etb, is_demo = true;

insert into public.buyer_inspections (
  id, organization_id, export_contract_id, base44_id, inspection_date, buyer_name, coffee_type,
  kg_to_inspect, sample_kg_taken, result, kg_approved, linked_contract_no,
  rejection_reason, kg_rejected, action_taken, notes, is_demo, archived_at
) values
  ('f1111111-1111-4111-8111-000000000001', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-000000000001', null, '2026-06-08', 'Demo Hamburg Buyer', 'Unwashed Lekempti', 240, 4, 'Passed', 236, 'DEMO-EXP-001-2026', null, null, null, 'Synthetic passed buyer inspection', true, null)
on conflict (id) do update set sample_kg_taken = excluded.sample_kg_taken, is_demo = true, archived_at = excluded.archived_at;

insert into public.stock_movements (
  id, organization_id, supplier_id, source_type, source_id, movement_type, stock_pool, coffee_type,
  quantity_kg, occurred_at, notes, is_demo, archived_at
) values
  ('99999999-9999-4999-8999-000000000401', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', 'export_contract', 'eeeeeeee-eeee-4eee-8eee-000000000001', 'export_contract_deduction', 'export_available', 'Unwashed Lekempti', 360, '2026-06-09T08:00:00Z', 'Synthetic export contract stock deduction', true, null),
  ('99999999-9999-4999-8999-000000000402', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', 'export_contract', 'eeeeeeee-eeee-4eee-8eee-000000000002', 'export_contract_deduction', 'export_available', 'Unwashed Lekempti', 60, '2026-06-10T08:00:00Z', 'Synthetic archived export contract stock deduction', true, '2026-06-11T08:00:00Z'),
  ('99999999-9999-4999-8999-000000000501', '11111111-1111-4111-8111-111111111111', null, 'buyer_inspection', 'f1111111-1111-4111-8111-000000000001', 'buyer_inspection_sample', 'export_available', 'Unwashed Lekempti', 4, '2026-06-08T08:00:00Z', 'Synthetic buyer inspection sample deduction', true, null)
on conflict (id) do update set quantity_kg = excluded.quantity_kg, is_demo = true, archived_at = excluded.archived_at;

insert into public.bag_receipts (
  id, organization_id, supplier_id, warehouse_receipt_id, base44_id, receipt_mode, agent_name,
  supplier_name, date, warehouse_received_kg, bags_received, source, note, is_demo, archived_at
) values
  ('b8000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', '88888888-8888-4888-8888-000000000001', null, 'agent', 'Demo Agent A', 'Demo Wollega Cooperative', '2026-06-03', 1666, 100, 'warehouse', 'Synthetic demo warehouse-linked bag receipt', true, null),
  ('b8000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000002', null, null, 'supplier', 'Demo Agent B', 'Demo Guji Washing Station', '2026-06-05', null, 40, 'manual', 'Synthetic supplier-level bag receipt', true, null),
  ('b8000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000003', null, null, 'supplier', 'Demo Agent C', 'Demo Sidama Export Farm', '2026-06-08', null, 10, 'manual', 'Synthetic archived bag receipt', true, '2026-06-09T08:00:00Z')
on conflict (id) do update set bags_received = excluded.bags_received, is_demo = true, archived_at = excluded.archived_at;

insert into public.reject_bag_usages (
  id, organization_id, supplier_id, base44_id, reject_mode, agent_name, supplier_name,
  date, bags_used, amount_etb, note, is_demo, archived_at
) values
  ('b8100000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', null, 'agent', 'Demo Agent A', null, '2026-06-07', 12, 1836, 'Synthetic reject bag usage', true, null)
on conflict (id) do update set bags_used = excluded.bags_used, amount_etb = excluded.amount_etb, is_demo = true, archived_at = excluded.archived_at;

insert into public.supplier_bag_returns (
  id, organization_id, supplier_id, base44_id, agent_name, supplier_name, return_date,
  bags_returned, note, is_demo, archived_at
) values
  ('b8200000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', null, 'Demo Agent A', null, '2026-06-12', 30, 'Synthetic partial bag return', true, null)
on conflict (id) do update set bags_returned = excluded.bags_returned, is_demo = true, archived_at = excluded.archived_at;

insert into public.supplier_bag_payments (
  id, organization_id, supplier_id, base44_id, agent_name, supplier_name, payment_date,
  bank_name, branch_account, reference_no, payment_type, amount_etb, note, is_demo, archived_at
) values
  ('b8300000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000001', null, 'Demo Agent A', null, '2026-06-13', 'Demo Bank', 'Demo Branch', 'DEMO-BAG-CPV-001', 'Advance', 1000, 'Synthetic partial reject bag cash payment', true, null)
on conflict (id) do update set amount_etb = excluded.amount_etb, is_demo = true, archived_at = excluded.archived_at;

insert into public.supplier_bag_settlements (
  id, organization_id, supplier_id, base44_id, agent_name, supplier_name, settlement_date,
  bags_received_adjustment, bags_used_adjustment, loss_percent_override,
  bags_returned, bags_returned_date, bags_returned_count, bags_returned_note,
  cash_paid, cash_paid_date, note, is_demo, archived_at
) values
  ('b8400000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000002', null, null, 'Demo Guji Washing Station', '2026-06-14', 2, 0, null, false, null, 0, null, false, null, 'Synthetic supplier bag settlement adjustment', true, null)
on conflict (id) do update set bags_received_adjustment = excluded.bags_received_adjustment, is_demo = true, archived_at = excluded.archived_at;

insert into public.material_register_entries (
  id, organization_id, export_contract_id, base44_id, category, date, item_type, bag_size, entry_type,
  item_name, quantity, unit_cost_etb, total_cost_etb, purpose, note, is_demo, archived_at
) values
  ('b8500000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', null, null, 'export', '2026-06-06', 'Bag', '60kg', 'Purchase', null, 80, 250, 20000, null, 'Synthetic export bag material purchase', true, null),
  ('b8500000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-000000000001', null, 'export', '2026-06-09', 'Bag', '60kg', 'Usage', null, 6, null, null, null, 'Synthetic export contract material usage', true, null),
  ('b8500000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', null, null, 'general', '2026-06-10', null, null, null, 'Demo Stationery', 5, 300, 1500, 'Office', 'Synthetic general material purchase', true, null),
  ('b8500000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', null, null, 'export', '2026-06-11', 'Craft', null, 'Purchase', null, 20, 100, 2000, null, 'Synthetic archived material entry', true, '2026-06-12T08:00:00Z')
on conflict (id) do update set quantity = excluded.quantity, total_cost_etb = excluded.total_cost_etb, is_demo = true, archived_at = excluded.archived_at;

insert into public.material_movements (
  id, organization_id, material_register_entry_id, export_contract_id, item_key, movement_type,
  quantity, unit_cost_etb, total_cost_etb, occurred_at, notes, is_demo, archived_at
) values
  ('b8600000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'b8500000-0000-4000-8000-000000000001', null, 'Bag 60kg', 'material_purchase', 80, 250, 20000, '2026-06-06T08:00:00Z', 'Synthetic export bag material purchase', true, null),
  ('b8600000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'b8500000-0000-4000-8000-000000000002', 'eeeeeeee-eeee-4eee-8eee-000000000001', 'Bag 60kg', 'material_usage', 6, null, null, '2026-06-09T08:00:00Z', 'Synthetic export contract material usage', true, null),
  ('b8600000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'b8500000-0000-4000-8000-000000000004', null, 'Craft', 'material_purchase', 20, 100, 2000, '2026-06-11T08:00:00Z', 'Synthetic archived material entry', true, '2026-06-12T08:00:00Z')
on conflict (id) do update set quantity = excluded.quantity, is_demo = true, archived_at = excluded.archived_at;
