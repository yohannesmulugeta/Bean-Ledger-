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
  ('44444444-4444-4444-8444-000000000003', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-000000000003', null, true, 'DEMO/SID/003/2026', '2026-06-07', 'Demo Sidama Export Farm', 'Demo Agent C', 'Sidama', 'Natural Sidama', 1190, 1173, 5800, 3.5)
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
