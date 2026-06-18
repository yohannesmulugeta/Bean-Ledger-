create extension if not exists "pgcrypto";

alter table public.organizations add column if not exists is_demo boolean not null default false;
alter table public.profiles add column if not exists is_demo boolean not null default false;
alter table public.roles add column if not exists is_demo boolean not null default false;
alter table public.permissions add column if not exists is_demo boolean not null default false;
alter table public.organization_memberships add column if not exists is_demo boolean not null default false;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  base44_id text unique,
  is_demo boolean not null default false,
  supplier_name text not null,
  region text,
  agent text,
  coffee_type text,
  opening_stock_kg numeric(14, 3) not null default 0 check (opening_stock_kg >= 0),
  phone_number text,
  coffee_origin text,
  station_name text,
  agreement_date date,
  agreement_expiry_date date,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table if not exists public.purchase_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  base44_id text unique,
  is_demo boolean not null default false,
  coffee_code text not null,
  purchase_date date not null,
  supplier_name text not null,
  agent text,
  region text,
  coffee_type text,
  net_dispatch_weight_kg numeric(14, 3) not null check (net_dispatch_weight_kg >= 0),
  warehouse_received_kg numeric(14, 3) check (warehouse_received_kg is null or warehouse_received_kg >= 0),
  unit_price_etb_per_feresula numeric(14, 2) not null check (unit_price_etb_per_feresula >= 0),
  commission_percent numeric(8, 4) not null default 0 check (commission_percent >= 0),
  net_feresula numeric(14, 6) not null default 0 check (net_feresula >= 0),
  warehouse_feresula numeric(14, 6) not null default 0 check (warehouse_feresula >= 0),
  total_purchase_price_etb numeric(16, 2) not null default 0 check (total_purchase_price_etb >= 0),
  commission_etb numeric(16, 2) not null default 0 check (commission_etb >= 0),
  additional_costs_total_etb numeric(16, 2) not null default 0 check (additional_costs_total_etb >= 0),
  grand_total_etb numeric(16, 2) not null default 0 check (grand_total_etb >= 0),
  total_paid_etb numeric(16, 2) not null default 0 check (total_paid_etb >= 0),
  balance_etb numeric(16, 2) not null default 0,
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid', 'Partial', 'Paid', 'Overpaid')),
  remark text,
  archive_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table if not exists public.purchase_additional_costs (
  id uuid primary key default gen_random_uuid(),
  purchase_record_id uuid not null references public.purchase_records(id) on delete cascade,
  base44_id text unique,
  is_demo boolean not null default false,
  name text not null,
  amount_etb numeric(16, 2) not null check (amount_etb >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_record_id uuid not null references public.purchase_records(id) on delete cascade,
  base44_id text unique,
  is_demo boolean not null default false,
  payment_no integer not null check (payment_no > 0),
  payment_date date not null,
  amount_etb numeric(16, 2) not null check (amount_etb >= 0),
  bank_name text,
  cpv_reference text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  unique (purchase_record_id, payment_no)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  profile_id uuid references public.profiles(id),
  base44_id text unique,
  is_demo boolean not null default false,
  action_type text not null,
  entity_table text not null,
  entity_id uuid,
  record_description text,
  reason text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index if not exists idx_suppliers_org_name_active
  on public.suppliers (organization_id, lower(supplier_name))
  where archived_at is null;

create unique index if not exists idx_purchase_records_org_coffee_code_active
  on public.purchase_records (organization_id, lower(coffee_code))
  where archived_at is null;

create index if not exists idx_suppliers_org_archived on public.suppliers(organization_id, archived_at);
create index if not exists idx_purchase_records_org_archived on public.purchase_records(organization_id, archived_at);
create index if not exists idx_purchase_records_supplier on public.purchase_records(supplier_id);
create index if not exists idx_purchase_additional_costs_purchase on public.purchase_additional_costs(purchase_record_id);
create index if not exists idx_purchase_payments_purchase on public.purchase_payments(purchase_record_id);
create index if not exists idx_audit_logs_org_created on public.audit_logs(organization_id, created_at desc);

create or replace function public.calculate_purchase_totals(
  p_dispatch_kg numeric,
  p_warehouse_received_kg numeric,
  p_unit_price_etb_per_feresula numeric,
  p_commission_percent numeric,
  p_additional_costs_etb numeric default 0,
  p_payments_etb numeric default 0
)
returns table (
  net_feresula numeric,
  warehouse_feresula numeric,
  total_purchase_price_etb numeric,
  commission_etb numeric,
  additional_costs_total_etb numeric,
  grand_total_etb numeric,
  total_paid_etb numeric,
  balance_etb numeric,
  payment_status text
)
language plpgsql
stable
as $$
declare
  v_dispatch_kg numeric := coalesce(p_dispatch_kg, 0);
  v_warehouse_kg numeric := coalesce(p_warehouse_received_kg, coalesce(p_dispatch_kg, 0));
  v_unit_price numeric := coalesce(p_unit_price_etb_per_feresula, 0);
  v_commission_percent numeric := coalesce(p_commission_percent, 0);
  v_additional_costs numeric := coalesce(p_additional_costs_etb, 0);
  v_payments numeric := coalesce(p_payments_etb, 0);
  v_balance numeric;
begin
  if v_dispatch_kg < 0 or v_warehouse_kg < 0 or v_unit_price < 0 or v_commission_percent < 0 or v_additional_costs < 0 or v_payments < 0 then
    raise exception 'Purchase calculation inputs cannot be negative';
  end if;

  net_feresula := v_dispatch_kg / 17.0;
  warehouse_feresula := v_warehouse_kg / 17.0;
  total_purchase_price_etb := round(v_unit_price * net_feresula, 2);
  commission_etb := round(warehouse_feresula * v_unit_price * (v_commission_percent / 100.0), 2);
  additional_costs_total_etb := round(v_additional_costs, 2);
  grand_total_etb := round(total_purchase_price_etb + commission_etb + additional_costs_total_etb, 2);
  total_paid_etb := round(v_payments, 2);
  v_balance := round(grand_total_etb - total_paid_etb, 2);
  balance_etb := case when abs(v_balance) <= 1 then 0 else v_balance end;
  payment_status := case
    when balance_etb < 0 then 'Overpaid'
    when balance_etb = 0 then 'Paid'
    when total_paid_etb > 0 then 'Partial'
    else 'Unpaid'
  end;

  return next;
end;
$$;

create or replace function public.recalculate_purchase_record(p_purchase_record_id uuid)
returns public.purchase_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchase_records;
  v_additional_costs numeric;
  v_payments numeric;
  v_totals record;
begin
  select * into v_purchase from public.purchase_records where id = p_purchase_record_id;
  if not found then
    raise exception 'Purchase record not found: %', p_purchase_record_id;
  end if;

  select coalesce(sum(amount_etb), 0) into v_additional_costs
  from public.purchase_additional_costs
  where purchase_record_id = p_purchase_record_id and archived_at is null;

  select coalesce(sum(amount_etb), 0) into v_payments
  from public.purchase_payments
  where purchase_record_id = p_purchase_record_id and archived_at is null;

  select * into v_totals
  from public.calculate_purchase_totals(
    v_purchase.net_dispatch_weight_kg,
    v_purchase.warehouse_received_kg,
    v_purchase.unit_price_etb_per_feresula,
    v_purchase.commission_percent,
    v_additional_costs,
    v_payments
  );

  update public.purchase_records
  set net_feresula = v_totals.net_feresula,
      warehouse_feresula = v_totals.warehouse_feresula,
      total_purchase_price_etb = v_totals.total_purchase_price_etb,
      commission_etb = v_totals.commission_etb,
      additional_costs_total_etb = v_totals.additional_costs_total_etb,
      grand_total_etb = v_totals.grand_total_etb,
      total_paid_etb = v_totals.total_paid_etb,
      balance_etb = v_totals.balance_etb,
      payment_status = v_totals.payment_status,
      updated_at = now()
  where id = p_purchase_record_id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

create or replace function public.recalculate_purchase_record_trigger()
returns trigger
language plpgsql
as $$
declare
  v_purchase_id uuid;
begin
  v_purchase_id := coalesce(new.purchase_record_id, old.purchase_record_id);
  perform public.recalculate_purchase_record(v_purchase_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_purchase_costs_recalculate on public.purchase_additional_costs;
create trigger trg_purchase_costs_recalculate
after insert or update or delete on public.purchase_additional_costs
for each row execute function public.recalculate_purchase_record_trigger();

drop trigger if exists trg_purchase_payments_recalculate on public.purchase_payments;
create trigger trg_purchase_payments_recalculate
after insert or update or delete on public.purchase_payments
for each row execute function public.recalculate_purchase_record_trigger();

alter table public.suppliers enable row level security;
alter table public.purchase_records enable row level security;
alter table public.purchase_additional_costs enable row level security;
alter table public.purchase_payments enable row level security;
alter table public.audit_logs enable row level security;

create policy suppliers_select_member on public.suppliers for select using (public.is_member(organization_id));
create policy suppliers_write_admin on public.suppliers for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy purchase_records_select_member on public.purchase_records for select using (public.is_member(organization_id));
create policy purchase_records_write_member on public.purchase_records for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy purchase_costs_select_member on public.purchase_additional_costs for select using (
  exists (select 1 from public.purchase_records pr where pr.id = purchase_record_id and public.is_member(pr.organization_id))
);
create policy purchase_costs_write_member on public.purchase_additional_costs for all using (
  exists (select 1 from public.purchase_records pr where pr.id = purchase_record_id and public.is_member(pr.organization_id))
) with check (
  exists (select 1 from public.purchase_records pr where pr.id = purchase_record_id and public.is_member(pr.organization_id))
);
create policy purchase_payments_select_member on public.purchase_payments for select using (
  exists (select 1 from public.purchase_records pr where pr.id = purchase_record_id and public.is_member(pr.organization_id))
);
create policy purchase_payments_write_member on public.purchase_payments for all using (
  exists (select 1 from public.purchase_records pr where pr.id = purchase_record_id and public.is_member(pr.organization_id))
) with check (
  exists (select 1 from public.purchase_records pr where pr.id = purchase_record_id and public.is_member(pr.organization_id))
);
create policy audit_logs_select_member on public.audit_logs for select using (organization_id is null or public.is_member(organization_id));
