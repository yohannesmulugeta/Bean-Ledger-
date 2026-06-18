alter table public.stock_movements add column if not exists coffee_type text;

alter table public.stock_movements drop constraint if exists stock_movements_movement_type_check;
alter table public.stock_movements
  add constraint stock_movements_movement_type_check check (
    movement_type in (
      'warehouse_received',
      'warehouse_receipt_archived',
      'sample_deduction',
      'processing_deduction',
      'output_export',
      'output_reject',
      'stock_adjustment',
      'export_contract_deduction',
      'buyer_inspection_sample'
    )
  );

update public.stock_movements sm
set coffee_type = o.coffee_type
from public.output_reports o
where sm.source_type = 'output_report'
  and sm.source_id = o.id
  and sm.coffee_type is null;

create table if not exists public.export_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  output_report_id uuid references public.output_reports(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  base44_id text unique,
  contract_no text not null,
  contract_pi_number text,
  certificate_no text,
  contract_date date not null,
  stock_pool text not null default 'Fresh' check (stock_pool in ('Fresh', 'Recleaned', 'Reject')),
  coffee_type text not null,
  coffee_grade text,
  destination_country text,
  buyer_name text,
  payment_terms text,
  custom_payment_terms text,
  expected_payment_date date,
  export_bags numeric(14, 3) not null check (export_bags > 0),
  export_kg numeric(14, 3) not null check (export_kg > 0),
  export_sample_kg numeric(14, 3) not null default 0 check (export_sample_kg >= 0),
  actual_shipped_kg numeric(14, 3) not null check (actual_shipped_kg >= 0),
  pricing_method text not null default 'per_lb' check (pricing_method in ('per_lb', 'per_kg')),
  price_per_lb_usd numeric(14, 6) check (price_per_lb_usd is null or price_per_lb_usd >= 0),
  price_per_kg_usd numeric(14, 6) check (price_per_kg_usd is null or price_per_kg_usd >= 0),
  total_lb numeric(14, 3) not null default 0 check (total_lb >= 0),
  contract_rate_etb numeric(14, 6) not null default 0 check (contract_rate_etb >= 0),
  rate_status text not null default 'Rate Confirmed' check (rate_status in ('Rate Pending', 'Rate Confirmed')),
  rate_confirmed_date date,
  total_export_value_usd numeric(14, 2) not null default 0 check (total_export_value_usd >= 0),
  total_export_value_etb numeric(14, 2) not null default 0 check (total_export_value_etb >= 0),
  total_materials_etb numeric(14, 2) not null default 0 check (total_materials_etb >= 0),
  total_costs_etb numeric(14, 2) not null default 0 check (total_costs_etb >= 0),
  reject_sales_etb numeric(14, 2) not null default 0 check (reject_sales_etb >= 0),
  grand_total_revenue_etb numeric(14, 2) not null default 0 check (grand_total_revenue_etb >= 0),
  profit_etb numeric(14, 2) not null default 0,
  profit_usd numeric(14, 2) not null default 0,
  profit_margin_pct numeric(9, 4) not null default 0,
  total_received_usd numeric(14, 2) not null default 0 check (total_received_usd >= 0),
  total_received_etb numeric(14, 2) not null default 0 check (total_received_etb >= 0),
  balance_etb numeric(14, 2) not null default 0,
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid', 'Partial', 'Fully Received')),
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Shipped', 'Completed')),
  remark text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  constraint export_contracts_sample_lte_export check (export_sample_kg <= export_kg),
  constraint export_contracts_contract_no_unique unique (organization_id, contract_no)
);

create table if not exists public.export_contract_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  export_contract_id uuid not null references public.export_contracts(id) on delete cascade,
  base44_id text unique,
  name text not null,
  amount_etb numeric(14, 2) not null check (amount_etb >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table if not exists public.export_contract_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  export_contract_id uuid not null references public.export_contracts(id) on delete cascade,
  base44_id text unique,
  name text not null,
  quantity numeric(14, 3) not null check (quantity >= 0),
  unit_cost_etb numeric(14, 2) not null check (unit_cost_etb >= 0),
  total_cost_etb numeric(14, 2) not null check (total_cost_etb >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table if not exists public.export_contract_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  export_contract_id uuid not null references public.export_contracts(id) on delete cascade,
  base44_id text unique,
  payment_date date not null,
  amount_usd numeric(14, 2) not null default 0 check (amount_usd >= 0),
  actual_rate_etb numeric(14, 6) not null default 0 check (actual_rate_etb >= 0),
  amount_etb numeric(14, 2) not null default 0 check (amount_etb >= 0),
  bank_name text,
  reference_no text,
  note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table if not exists public.buyer_inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  export_contract_id uuid references public.export_contracts(id) on delete set null,
  base44_id text unique,
  inspection_date date not null,
  buyer_name text not null,
  coffee_type text not null,
  kg_to_inspect numeric(14, 3) not null check (kg_to_inspect > 0),
  sample_kg_taken numeric(14, 3) not null check (sample_kg_taken > 0),
  result text not null default 'Pending' check (result in ('Pending', 'Passed', 'Failed')),
  kg_approved numeric(14, 3) check (kg_approved is null or kg_approved >= 0),
  linked_contract_no text,
  rejection_reason text,
  kg_rejected numeric(14, 3) check (kg_rejected is null or kg_rejected >= 0),
  action_taken text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create index if not exists idx_export_contracts_org_archived on public.export_contracts(organization_id, archived_at);
create index if not exists idx_export_contracts_coffee_pool on public.export_contracts(organization_id, coffee_type, stock_pool, archived_at);
create index if not exists idx_export_costs_contract on public.export_contract_costs(export_contract_id, archived_at);
create index if not exists idx_export_materials_contract on public.export_contract_materials(export_contract_id, archived_at);
create index if not exists idx_export_payments_contract on public.export_contract_payments(export_contract_id, archived_at);
create index if not exists idx_buyer_inspections_org_archived on public.buyer_inspections(organization_id, archived_at);
create index if not exists idx_stock_movements_pool_coffee on public.stock_movements(organization_id, stock_pool, coffee_type, archived_at);

create or replace function public.stock_pool_for_contract(p_stock_pool text)
returns text
language sql
immutable
as $$
  select case
    when p_stock_pool = 'Reject' then 'reject_available'
    else 'export_available'
  end;
$$;

create or replace function public.calculate_export_available_stock(
  p_organization_id uuid,
  p_stock_pool text default null,
  p_coffee_type text default null
)
returns table (
  stock_pool text,
  coffee_type text,
  available_kg numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      sm.stock_pool,
      coalesce(sm.coffee_type, o.coffee_type, ec.coffee_type, bi.coffee_type) as coffee_type,
      case
        when sm.movement_type in ('output_export', 'output_reject', 'stock_adjustment') then sm.quantity_kg
        when sm.movement_type in ('export_contract_deduction', 'buyer_inspection_sample') then -sm.quantity_kg
        else 0
      end as signed_kg
    from public.stock_movements sm
    left join public.output_reports o on sm.source_type = 'output_report' and sm.source_id = o.id
    left join public.export_contracts ec on sm.source_type = 'export_contract' and sm.source_id = ec.id
    left join public.buyer_inspections bi on sm.source_type = 'buyer_inspection' and sm.source_id = bi.id
    where sm.organization_id = p_organization_id
      and sm.archived_at is null
      and sm.stock_pool in ('export_available', 'reject_available')
  )
  select
    n.stock_pool,
    n.coffee_type,
    coalesce(sum(n.signed_kg), 0)::numeric as available_kg
  from normalized n
  where (p_stock_pool is null or n.stock_pool = p_stock_pool or public.stock_pool_for_contract(p_stock_pool) = n.stock_pool)
    and (p_coffee_type is null or n.coffee_type = p_coffee_type)
  group by n.stock_pool, n.coffee_type
  order by n.stock_pool, n.coffee_type;
$$;

create or replace function public.validate_export_stock(
  p_organization_id uuid,
  p_stock_pool text,
  p_coffee_type text,
  p_required_kg numeric,
  p_exclude_contract_id uuid default null
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_available numeric;
  v_pool text := public.stock_pool_for_contract(p_stock_pool);
begin
  if coalesce(p_required_kg, 0) <= 0 then raise exception 'Export KG must be greater than zero'; end if;
  select coalesce(sum(case
    when sm.movement_type in ('output_export', 'output_reject', 'stock_adjustment') then sm.quantity_kg
    when sm.movement_type in ('export_contract_deduction', 'buyer_inspection_sample') then -sm.quantity_kg
    else 0
  end), 0) into v_available
  from public.stock_movements sm
  left join public.output_reports o on sm.source_type = 'output_report' and sm.source_id = o.id
  left join public.export_contracts ec on sm.source_type = 'export_contract' and sm.source_id = ec.id
  left join public.buyer_inspections bi on sm.source_type = 'buyer_inspection' and sm.source_id = bi.id
  where sm.organization_id = p_organization_id
    and sm.stock_pool = v_pool
    and coalesce(sm.coffee_type, o.coffee_type, ec.coffee_type, bi.coffee_type) = p_coffee_type
    and sm.archived_at is null
    and not (p_exclude_contract_id is not null and sm.source_type = 'export_contract' and sm.source_id = p_exclude_contract_id);

  if p_required_kg > v_available then
    raise exception 'Requested export KG exceeds available stock';
  end if;
  return v_available;
end;
$$;

create or replace function public.calculate_export_contract_totals(
  p_export_bags numeric,
  p_export_sample_kg numeric,
  p_pricing_method text,
  p_price_per_lb_usd numeric,
  p_price_per_kg_usd numeric,
  p_exchange_rate_etb numeric,
  p_costs_etb numeric default 0,
  p_materials_etb numeric default 0,
  p_payments_etb numeric default 0,
  p_reject_sales_etb numeric default 0
)
returns table (
  export_kg numeric,
  actual_shipped_kg numeric,
  total_lb numeric,
  total_export_value_usd numeric,
  total_export_value_etb numeric,
  total_costs_etb numeric,
  total_received_etb numeric,
  balance_etb numeric,
  profit_etb numeric,
  profit_usd numeric,
  profit_margin_pct numeric,
  payment_status text
)
language plpgsql
stable
as $$
declare
  v_bags numeric := coalesce(p_export_bags, 0);
  v_sample numeric := coalesce(p_export_sample_kg, 0);
  v_rate numeric := coalesce(p_exchange_rate_etb, 0);
  v_costs numeric := coalesce(p_costs_etb, 0) + coalesce(p_materials_etb, 0);
  v_reject_sales numeric := coalesce(p_reject_sales_etb, 0);
  v_revenue numeric;
begin
  if v_bags <= 0 then raise exception 'Export bags must be greater than zero'; end if;
  if v_sample < 0 then raise exception 'Export sample KG cannot be negative'; end if;
  if coalesce(p_price_per_lb_usd, 0) < 0 or coalesce(p_price_per_kg_usd, 0) < 0 then raise exception 'Export price cannot be negative'; end if;
  if v_rate < 0 then raise exception 'Exchange rate cannot be negative'; end if;
  if v_costs < 0 or coalesce(p_payments_etb, 0) < 0 or v_reject_sales < 0 then raise exception 'Financial values cannot be negative'; end if;

  export_kg := v_bags * 60;
  if v_sample > export_kg then raise exception 'Export sample KG cannot exceed export KG'; end if;
  actual_shipped_kg := export_kg - v_sample;
  total_lb := actual_shipped_kg * 2.2046;
  total_export_value_usd := case
    when p_pricing_method = 'per_kg' then actual_shipped_kg * coalesce(p_price_per_kg_usd, 0)
    else total_lb * coalesce(p_price_per_lb_usd, 0)
  end;
  total_export_value_etb := total_export_value_usd * v_rate;
  total_costs_etb := v_costs;
  total_received_etb := coalesce(p_payments_etb, 0);
  balance_etb := total_export_value_etb - total_received_etb;
  v_revenue := total_export_value_etb + v_reject_sales;
  profit_etb := v_revenue - total_costs_etb;
  profit_usd := case when v_rate > 0 then profit_etb / v_rate else 0 end;
  profit_margin_pct := case when v_revenue > 0 then (profit_etb / v_revenue) * 100 else 0 end;
  payment_status := case
    when total_received_etb <= 0 then 'Unpaid'
    when total_received_etb + 1 >= total_export_value_etb then 'Fully Received'
    else 'Partial'
  end;
  return next;
end;
$$;

create or replace function public.recalculate_export_contract(p_export_contract_id uuid)
returns public.export_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.export_contracts;
  v_costs numeric;
  v_materials numeric;
  v_payments_etb numeric;
  v_payments_usd numeric;
  v_totals record;
begin
  select * into v_contract from public.export_contracts where id = p_export_contract_id for update;
  if not found then raise exception 'Export contract not found'; end if;
  select coalesce(sum(amount_etb), 0) into v_costs from public.export_contract_costs where export_contract_id = p_export_contract_id and archived_at is null;
  select coalesce(sum(total_cost_etb), 0) into v_materials from public.export_contract_materials where export_contract_id = p_export_contract_id and archived_at is null;
  select coalesce(sum(amount_etb), 0), coalesce(sum(amount_usd), 0) into v_payments_etb, v_payments_usd from public.export_contract_payments where export_contract_id = p_export_contract_id and archived_at is null;
  select * into v_totals from public.calculate_export_contract_totals(v_contract.export_bags, v_contract.export_sample_kg, v_contract.pricing_method, v_contract.price_per_lb_usd, v_contract.price_per_kg_usd, v_contract.contract_rate_etb, v_costs, v_materials, v_payments_etb, v_contract.reject_sales_etb);
  update public.export_contracts
  set export_kg = v_totals.export_kg,
      actual_shipped_kg = v_totals.actual_shipped_kg,
      total_lb = v_totals.total_lb,
      total_export_value_usd = round(v_totals.total_export_value_usd, 2),
      total_export_value_etb = round(v_totals.total_export_value_etb, 2),
      total_materials_etb = round(v_materials, 2),
      total_costs_etb = round(v_totals.total_costs_etb, 2),
      grand_total_revenue_etb = round(v_totals.total_export_value_etb + reject_sales_etb, 2),
      profit_etb = round(v_totals.profit_etb, 2),
      profit_usd = round(v_totals.profit_usd, 2),
      profit_margin_pct = round(v_totals.profit_margin_pct, 4),
      total_received_usd = round(v_payments_usd, 2),
      total_received_etb = round(v_totals.total_received_etb, 2),
      balance_etb = round(v_totals.balance_etb, 2),
      payment_status = v_totals.payment_status,
      updated_at = now()
  where id = p_export_contract_id
  returning * into v_contract;
  return v_contract;
end;
$$;

create or replace function public.replace_export_child_rows(p_contract public.export_contracts, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare item jsonb;
begin
  delete from public.export_contract_costs where export_contract_id = p_contract.id;
  for item in select * from jsonb_array_elements(coalesce(p_payload->'cost_rows', '[]'::jsonb)) loop
    if nullif(item->>'name', '') is not null then
      insert into public.export_contract_costs (organization_id, export_contract_id, name, amount_etb, is_demo, created_by, updated_by)
      values (p_contract.organization_id, p_contract.id, item->>'name', coalesce(nullif(item->>'amount_etb', '')::numeric, 0), p_contract.is_demo, auth.uid(), auth.uid());
    end if;
  end loop;

  delete from public.export_contract_materials where export_contract_id = p_contract.id;
  for item in select * from jsonb_array_elements(coalesce(p_payload->'material_rows', '[]'::jsonb)) loop
    if nullif(item->>'name', '') is not null then
      insert into public.export_contract_materials (organization_id, export_contract_id, name, quantity, unit_cost_etb, total_cost_etb, is_demo, created_by, updated_by)
      values (p_contract.organization_id, p_contract.id, item->>'name', coalesce(nullif(item->>'quantity', '')::numeric, 0), coalesce(nullif(item->>'unit_cost_etb', '')::numeric, 0), coalesce(nullif(item->>'quantity', '')::numeric, 0) * coalesce(nullif(item->>'unit_cost_etb', '')::numeric, 0), p_contract.is_demo, auth.uid(), auth.uid());
    end if;
  end loop;

  delete from public.export_contract_payments where export_contract_id = p_contract.id;
  for item in select * from jsonb_array_elements(coalesce(p_payload->'payment_history', '[]'::jsonb)) loop
    insert into public.export_contract_payments (organization_id, export_contract_id, payment_date, amount_usd, actual_rate_etb, amount_etb, bank_name, reference_no, note, is_demo, created_by, updated_by)
    values (p_contract.organization_id, p_contract.id, coalesce(nullif(item->>'payment_date', '')::date, current_date), coalesce(nullif(item->>'amount_usd', '')::numeric, 0), coalesce(nullif(item->>'actual_rate_etb', '')::numeric, p_contract.contract_rate_etb), coalesce(nullif(item->>'amount_etb', '')::numeric, coalesce(nullif(item->>'amount_usd', '')::numeric, 0) * coalesce(nullif(item->>'actual_rate_etb', '')::numeric, p_contract.contract_rate_etb)), nullif(item->>'bank_name', ''), nullif(item->>'reference_no', ''), nullif(item->>'note', ''), p_contract.is_demo, auth.uid(), auth.uid());
  end loop;
end;
$$;

create or replace function public.create_export_contract(p_payload jsonb)
returns public.export_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.export_contracts;
  v_org uuid := coalesce(nullif(p_payload->>'organization_id', '')::uuid, '11111111-1111-4111-8111-111111111111'::uuid);
  v_totals record;
  v_pool text := coalesce(nullif(p_payload->>'stock_pool', ''), 'Fresh');
  v_coffee_type text := nullif(p_payload->>'coffee_type', '');
begin
  if not exists (select 1 from public.organizations where id = v_org) then raise exception 'Organization not found'; end if;
  select * into v_totals from public.calculate_export_contract_totals((p_payload->>'export_bags')::numeric, coalesce(nullif(p_payload->>'export_sample_kg', '')::numeric, 0), coalesce(nullif(p_payload->>'pricing_method', ''), 'per_lb'), nullif(p_payload->>'price_per_lb_usd', '')::numeric, nullif(p_payload->>'price_per_kg_usd', '')::numeric, coalesce(nullif(p_payload->>'contract_rate_etb', '')::numeric, 0), 0, 0, 0, coalesce(nullif(p_payload->>'reject_sales_etb', '')::numeric, 0));
  perform public.validate_export_stock(v_org, v_pool, v_coffee_type, v_totals.export_kg);

  insert into public.export_contracts (
    organization_id, output_report_id, supplier_id, base44_id, contract_no, contract_pi_number, certificate_no, contract_date,
    stock_pool, coffee_type, coffee_grade, destination_country, buyer_name, payment_terms, custom_payment_terms,
    expected_payment_date, export_bags, export_kg, export_sample_kg, actual_shipped_kg, pricing_method,
    price_per_lb_usd, price_per_kg_usd, total_lb, contract_rate_etb, rate_status, rate_confirmed_date,
    reject_sales_etb, status, remark, is_demo, created_by, updated_by
  ) values (
    v_org, nullif(p_payload->>'output_report_id', '')::uuid, nullif(p_payload->>'supplier_id', '')::uuid, p_payload->>'base44_id',
    nullif(p_payload->>'contract_no', ''), nullif(p_payload->>'contract_pi_number', ''), nullif(p_payload->>'certificate_no', ''), coalesce(nullif(p_payload->>'contract_date', '')::date, current_date),
    v_pool, v_coffee_type, nullif(p_payload->>'coffee_grade', ''), nullif(p_payload->>'destination_country', ''), nullif(p_payload->>'buyer_name', ''), nullif(p_payload->>'payment_terms', ''), nullif(p_payload->>'custom_payment_terms', ''),
    nullif(p_payload->>'expected_payment_date', '')::date, (p_payload->>'export_bags')::numeric, v_totals.export_kg, coalesce(nullif(p_payload->>'export_sample_kg', '')::numeric, 0), v_totals.actual_shipped_kg, coalesce(nullif(p_payload->>'pricing_method', ''), 'per_lb'),
    nullif(p_payload->>'price_per_lb_usd', '')::numeric, nullif(p_payload->>'price_per_kg_usd', '')::numeric, v_totals.total_lb, coalesce(nullif(p_payload->>'contract_rate_etb', '')::numeric, 0), coalesce(nullif(p_payload->>'rate_status', ''), 'Rate Confirmed'), nullif(p_payload->>'rate_confirmed_date', '')::date,
    coalesce(nullif(p_payload->>'reject_sales_etb', '')::numeric, 0), coalesce(nullif(p_payload->>'status', ''), 'Pending'), nullif(p_payload->>'remark', ''), coalesce((p_payload->>'is_demo')::boolean, false), auth.uid(), auth.uid()
  ) returning * into v_contract;

  perform public.replace_export_child_rows(v_contract, p_payload);
  v_contract := public.recalculate_export_contract(v_contract.id);

  insert into public.stock_movements (organization_id, supplier_id, source_type, source_id, movement_type, stock_pool, coffee_type, quantity_kg, occurred_at, notes, is_demo, created_by)
  values (v_contract.organization_id, v_contract.supplier_id, 'export_contract', v_contract.id, 'export_contract_deduction', public.stock_pool_for_contract(v_contract.stock_pool), v_contract.coffee_type, v_contract.export_kg, v_contract.contract_date::timestamptz, 'Export contract stock deduction', v_contract.is_demo, auth.uid());

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_contract.organization_id, auth.uid(), v_contract.is_demo, 'Created', 'export_contracts', v_contract.id, v_contract.contract_no, p_payload->>'reason', to_jsonb(v_contract));
  return v_contract;
end;
$$;

create or replace function public.update_export_contract(p_export_contract_id uuid, p_payload jsonb)
returns public.export_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.export_contracts;
  v_contract public.export_contracts;
  v_totals record;
  v_bags numeric;
  v_sample numeric;
  v_pool text;
  v_coffee_type text;
begin
  select * into v_old from public.export_contracts where id = p_export_contract_id for update;
  if not found then raise exception 'Export contract not found'; end if;
  if v_old.archived_at is not null then raise exception 'Cannot update archived export contract'; end if;
  v_bags := coalesce(nullif(p_payload->>'export_bags', '')::numeric, v_old.export_bags);
  v_sample := coalesce(nullif(p_payload->>'export_sample_kg', '')::numeric, v_old.export_sample_kg);
  v_pool := coalesce(nullif(p_payload->>'stock_pool', ''), v_old.stock_pool);
  v_coffee_type := coalesce(nullif(p_payload->>'coffee_type', ''), v_old.coffee_type);
  select * into v_totals from public.calculate_export_contract_totals(v_bags, v_sample, coalesce(nullif(p_payload->>'pricing_method', ''), v_old.pricing_method), coalesce(nullif(p_payload->>'price_per_lb_usd', '')::numeric, v_old.price_per_lb_usd), coalesce(nullif(p_payload->>'price_per_kg_usd', '')::numeric, v_old.price_per_kg_usd), coalesce(nullif(p_payload->>'contract_rate_etb', '')::numeric, v_old.contract_rate_etb), 0, 0, 0, coalesce(nullif(p_payload->>'reject_sales_etb', '')::numeric, v_old.reject_sales_etb));
  perform public.validate_export_stock(v_old.organization_id, v_pool, v_coffee_type, v_totals.export_kg, v_old.id);

  update public.export_contracts
  set contract_no = coalesce(nullif(p_payload->>'contract_no', ''), contract_no),
      contract_date = coalesce(nullif(p_payload->>'contract_date', '')::date, contract_date),
      stock_pool = v_pool,
      coffee_type = v_coffee_type,
      coffee_grade = coalesce(p_payload->>'coffee_grade', coffee_grade),
      destination_country = coalesce(p_payload->>'destination_country', destination_country),
      buyer_name = coalesce(p_payload->>'buyer_name', buyer_name),
      payment_terms = coalesce(p_payload->>'payment_terms', payment_terms),
      export_bags = v_bags,
      export_kg = v_totals.export_kg,
      export_sample_kg = v_sample,
      actual_shipped_kg = v_totals.actual_shipped_kg,
      pricing_method = coalesce(nullif(p_payload->>'pricing_method', ''), pricing_method),
      price_per_lb_usd = coalesce(nullif(p_payload->>'price_per_lb_usd', '')::numeric, price_per_lb_usd),
      price_per_kg_usd = coalesce(nullif(p_payload->>'price_per_kg_usd', '')::numeric, price_per_kg_usd),
      total_lb = v_totals.total_lb,
      contract_rate_etb = coalesce(nullif(p_payload->>'contract_rate_etb', '')::numeric, contract_rate_etb),
      reject_sales_etb = coalesce(nullif(p_payload->>'reject_sales_etb', '')::numeric, reject_sales_etb),
      status = coalesce(nullif(p_payload->>'status', ''), status),
      remark = coalesce(p_payload->>'remark', remark),
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_export_contract_id returning * into v_contract;

  perform public.replace_export_child_rows(v_contract, p_payload);
  v_contract := public.recalculate_export_contract(v_contract.id);

  update public.stock_movements
  set stock_pool = public.stock_pool_for_contract(v_contract.stock_pool),
      coffee_type = v_contract.coffee_type,
      quantity_kg = v_contract.export_kg,
      occurred_at = v_contract.contract_date::timestamptz
  where source_type = 'export_contract' and source_id = v_contract.id and archived_at is null;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_contract.organization_id, auth.uid(), v_contract.is_demo, 'Edited', 'export_contracts', v_contract.id, v_contract.contract_no, p_payload->>'reason', jsonb_build_object('old', to_jsonb(v_old), 'new', to_jsonb(v_contract)));
  return v_contract;
end;
$$;

create or replace function public.archive_export_contract(p_export_contract_id uuid, p_reason text default null)
returns public.export_contracts
language plpgsql
security definer
set search_path = public
as $$
declare v_contract public.export_contracts;
begin
  update public.export_contracts set archived_at = coalesce(archived_at, now()), updated_at = now(), updated_by = auth.uid()
  where id = p_export_contract_id returning * into v_contract;
  if not found then raise exception 'Export contract not found'; end if;
  update public.stock_movements set archived_at = coalesce(archived_at, now()) where source_type = 'export_contract' and source_id = p_export_contract_id;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_contract.organization_id, auth.uid(), v_contract.is_demo, 'Archived', 'export_contracts', v_contract.id, v_contract.contract_no, p_reason, to_jsonb(v_contract));
  return v_contract;
end;
$$;

create or replace function public.restore_export_contract(p_export_contract_id uuid, p_reason text default null)
returns public.export_contracts
language plpgsql
security definer
set search_path = public
as $$
declare v_contract public.export_contracts;
begin
  select * into v_contract from public.export_contracts where id = p_export_contract_id for update;
  if not found then raise exception 'Export contract not found'; end if;
  perform public.validate_export_stock(v_contract.organization_id, v_contract.stock_pool, v_contract.coffee_type, v_contract.export_kg);
  update public.export_contracts set archived_at = null, updated_at = now(), updated_by = auth.uid()
  where id = p_export_contract_id returning * into v_contract;
  update public.stock_movements set archived_at = null where source_type = 'export_contract' and source_id = p_export_contract_id;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_contract.organization_id, auth.uid(), v_contract.is_demo, 'Restored', 'export_contracts', v_contract.id, v_contract.contract_no, p_reason, to_jsonb(v_contract));
  return v_contract;
end;
$$;

create or replace function public.record_export_payment(p_export_contract_id uuid, p_payload jsonb)
returns public.export_contract_payments
language plpgsql
security definer
set search_path = public
as $$
declare v_contract public.export_contracts; v_payment public.export_contract_payments; v_usd numeric; v_rate numeric;
begin
  select * into v_contract from public.export_contracts where id = p_export_contract_id for update;
  if not found then raise exception 'Export contract not found'; end if;
  v_usd := coalesce(nullif(p_payload->>'amount_usd', '')::numeric, 0);
  v_rate := coalesce(nullif(p_payload->>'actual_rate_etb', '')::numeric, v_contract.contract_rate_etb);
  if v_usd < 0 or v_rate < 0 then raise exception 'Payment values cannot be negative'; end if;
  insert into public.export_contract_payments (organization_id, export_contract_id, payment_date, amount_usd, actual_rate_etb, amount_etb, bank_name, reference_no, note, is_demo, created_by, updated_by)
  values (v_contract.organization_id, v_contract.id, coalesce(nullif(p_payload->>'payment_date', '')::date, current_date), v_usd, v_rate, coalesce(nullif(p_payload->>'amount_etb', '')::numeric, v_usd * v_rate), nullif(p_payload->>'bank_name', ''), nullif(p_payload->>'reference_no', ''), nullif(p_payload->>'note', ''), v_contract.is_demo, auth.uid(), auth.uid())
  returning * into v_payment;
  perform public.recalculate_export_contract(v_contract.id);
  return v_payment;
end;
$$;

create or replace function public.update_export_payment(p_export_payment_id uuid, p_payload jsonb)
returns public.export_contract_payments
language plpgsql
security definer
set search_path = public
as $$
declare v_payment public.export_contract_payments; v_usd numeric; v_rate numeric;
begin
  select * into v_payment from public.export_contract_payments where id = p_export_payment_id for update;
  if not found then raise exception 'Export payment not found'; end if;
  v_usd := coalesce(nullif(p_payload->>'amount_usd', '')::numeric, v_payment.amount_usd);
  v_rate := coalesce(nullif(p_payload->>'actual_rate_etb', '')::numeric, v_payment.actual_rate_etb);
  if v_usd < 0 or v_rate < 0 then raise exception 'Payment values cannot be negative'; end if;
  update public.export_contract_payments set payment_date = coalesce(nullif(p_payload->>'payment_date', '')::date, payment_date), amount_usd = v_usd, actual_rate_etb = v_rate, amount_etb = coalesce(nullif(p_payload->>'amount_etb', '')::numeric, v_usd * v_rate), bank_name = coalesce(p_payload->>'bank_name', bank_name), reference_no = coalesce(p_payload->>'reference_no', reference_no), note = coalesce(p_payload->>'note', note), updated_at = now(), updated_by = auth.uid()
  where id = p_export_payment_id returning * into v_payment;
  perform public.recalculate_export_contract(v_payment.export_contract_id);
  return v_payment;
end;
$$;

create or replace function public.archive_export_payment(p_export_payment_id uuid, p_reason text default null)
returns public.export_contract_payments
language plpgsql
security definer
set search_path = public
as $$
declare v_payment public.export_contract_payments;
begin
  update public.export_contract_payments set archived_at = coalesce(archived_at, now()), updated_at = now(), updated_by = auth.uid()
  where id = p_export_payment_id returning * into v_payment;
  if not found then raise exception 'Export payment not found'; end if;
  perform public.recalculate_export_contract(v_payment.export_contract_id);
  return v_payment;
end;
$$;

create or replace function public.create_buyer_inspection(p_payload jsonb)
returns public.buyer_inspections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := coalesce(nullif(p_payload->>'organization_id', '')::uuid, '11111111-1111-4111-8111-111111111111'::uuid);
  v_inspection public.buyer_inspections;
  v_sample numeric := (p_payload->>'sample_kg_taken')::numeric;
  v_coffee_type text := nullif(p_payload->>'coffee_type', '');
begin
  if v_sample <= 0 then raise exception 'Sample KG must be greater than zero'; end if;
  perform public.validate_export_stock(v_org, 'Fresh', v_coffee_type, v_sample);
  insert into public.buyer_inspections (
    organization_id, export_contract_id, base44_id, inspection_date, buyer_name, coffee_type, kg_to_inspect,
    sample_kg_taken, result, kg_approved, linked_contract_no, rejection_reason, kg_rejected, action_taken,
    notes, is_demo, created_by, updated_by
  ) values (
    v_org, nullif(p_payload->>'linked_contract_id', '')::uuid, p_payload->>'base44_id', coalesce(nullif(p_payload->>'inspection_date', '')::date, current_date), nullif(p_payload->>'buyer_name', ''), v_coffee_type, (p_payload->>'kg_to_inspect')::numeric,
    v_sample, coalesce(nullif(p_payload->>'result', ''), 'Pending'), nullif(p_payload->>'kg_approved', '')::numeric, nullif(p_payload->>'linked_contract_no', ''), nullif(p_payload->>'rejection_reason', ''), nullif(p_payload->>'kg_rejected', '')::numeric, nullif(p_payload->>'action_taken', ''),
    nullif(p_payload->>'notes', ''), coalesce((p_payload->>'is_demo')::boolean, false), auth.uid(), auth.uid()
  ) returning * into v_inspection;
  insert into public.stock_movements (organization_id, source_type, source_id, movement_type, stock_pool, coffee_type, quantity_kg, occurred_at, notes, is_demo, created_by)
  values (v_inspection.organization_id, 'buyer_inspection', v_inspection.id, 'buyer_inspection_sample', 'export_available', v_inspection.coffee_type, v_inspection.sample_kg_taken, v_inspection.inspection_date::timestamptz, 'Buyer inspection sample deduction', v_inspection.is_demo, auth.uid());
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_inspection.organization_id, auth.uid(), v_inspection.is_demo, 'Created', 'buyer_inspections', v_inspection.id, v_inspection.buyer_name, p_payload->>'reason', to_jsonb(v_inspection));
  return v_inspection;
end;
$$;

create or replace function public.update_buyer_inspection(p_buyer_inspection_id uuid, p_payload jsonb)
returns public.buyer_inspections
language plpgsql
security definer
set search_path = public
as $$
declare v_old public.buyer_inspections; v_inspection public.buyer_inspections; v_sample numeric; v_coffee_type text;
begin
  select * into v_old from public.buyer_inspections where id = p_buyer_inspection_id for update;
  if not found then raise exception 'Buyer inspection not found'; end if;
  if v_old.archived_at is not null then raise exception 'Cannot update archived buyer inspection'; end if;
  v_sample := coalesce(nullif(p_payload->>'sample_kg_taken', '')::numeric, v_old.sample_kg_taken);
  v_coffee_type := coalesce(nullif(p_payload->>'coffee_type', ''), v_old.coffee_type);
  perform public.validate_export_stock(v_old.organization_id, 'Fresh', v_coffee_type, v_sample, null);
  update public.buyer_inspections
  set inspection_date = coalesce(nullif(p_payload->>'inspection_date', '')::date, inspection_date),
      buyer_name = coalesce(p_payload->>'buyer_name', buyer_name),
      coffee_type = v_coffee_type,
      kg_to_inspect = coalesce(nullif(p_payload->>'kg_to_inspect', '')::numeric, kg_to_inspect),
      sample_kg_taken = v_sample,
      result = coalesce(nullif(p_payload->>'result', ''), result),
      kg_approved = coalesce(nullif(p_payload->>'kg_approved', '')::numeric, kg_approved),
      linked_contract_no = coalesce(p_payload->>'linked_contract_no', linked_contract_no),
      rejection_reason = coalesce(p_payload->>'rejection_reason', rejection_reason),
      kg_rejected = coalesce(nullif(p_payload->>'kg_rejected', '')::numeric, kg_rejected),
      action_taken = coalesce(p_payload->>'action_taken', action_taken),
      notes = coalesce(p_payload->>'notes', notes),
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_buyer_inspection_id returning * into v_inspection;
  update public.stock_movements set coffee_type = v_inspection.coffee_type, quantity_kg = v_inspection.sample_kg_taken, occurred_at = v_inspection.inspection_date::timestamptz
  where source_type = 'buyer_inspection' and source_id = v_inspection.id and archived_at is null;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_inspection.organization_id, auth.uid(), v_inspection.is_demo, 'Edited', 'buyer_inspections', v_inspection.id, v_inspection.buyer_name, p_payload->>'reason', jsonb_build_object('old', to_jsonb(v_old), 'new', to_jsonb(v_inspection)));
  return v_inspection;
end;
$$;

create or replace function public.archive_buyer_inspection(p_buyer_inspection_id uuid, p_reason text default null)
returns public.buyer_inspections
language plpgsql
security definer
set search_path = public
as $$
declare v_inspection public.buyer_inspections;
begin
  update public.buyer_inspections set archived_at = coalesce(archived_at, now()), updated_at = now(), updated_by = auth.uid()
  where id = p_buyer_inspection_id returning * into v_inspection;
  if not found then raise exception 'Buyer inspection not found'; end if;
  update public.stock_movements set archived_at = coalesce(archived_at, now()) where source_type = 'buyer_inspection' and source_id = p_buyer_inspection_id;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_inspection.organization_id, auth.uid(), v_inspection.is_demo, 'Archived', 'buyer_inspections', v_inspection.id, v_inspection.buyer_name, p_reason, to_jsonb(v_inspection));
  return v_inspection;
end;
$$;

alter table public.export_contracts enable row level security;
alter table public.export_contract_costs enable row level security;
alter table public.export_contract_materials enable row level security;
alter table public.export_contract_payments enable row level security;
alter table public.buyer_inspections enable row level security;

create policy export_contracts_select_member on public.export_contracts for select using (public.is_member(organization_id));
create policy export_contracts_write_member on public.export_contracts for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy export_costs_select_member on public.export_contract_costs for select using (public.is_member(organization_id));
create policy export_costs_write_member on public.export_contract_costs for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy export_materials_select_member on public.export_contract_materials for select using (public.is_member(organization_id));
create policy export_materials_write_member on public.export_contract_materials for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy export_payments_select_member on public.export_contract_payments for select using (public.is_member(organization_id));
create policy export_payments_write_member on public.export_contract_payments for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy buyer_inspections_select_member on public.buyer_inspections for select using (public.is_member(organization_id));
create policy buyer_inspections_write_member on public.buyer_inspections for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
