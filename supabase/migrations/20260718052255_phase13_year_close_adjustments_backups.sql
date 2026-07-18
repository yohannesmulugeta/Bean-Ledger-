create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  adjustment_no text not null,
  adjustment_date date not null,
  target_type text not null check (target_type in ('supplier', 'Fresh', 'Recleaned', 'Reject')),
  supplier_id uuid references public.suppliers(id) on delete restrict,
  supplier_name text,
  coffee_type text,
  quantity_kg numeric(14, 3) not null check (quantity_kg <> 0),
  reason text not null check (length(trim(reason)) >= 3),
  notes text,
  status text not null default 'approved' check (status in ('approved', 'reversed')),
  reversal_reason text,
  reversed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  unique (organization_id, adjustment_no),
  constraint stock_adjustment_target_check check (
    (target_type = 'supplier' and supplier_id is not null and supplier_name is not null)
    or (target_type <> 'supplier' and coffee_type is not null)
  )
);

create table if not exists public.annual_reporting_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  period_label text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'closed' check (status in ('closed', 'reopened')),
  snapshot jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  closed_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id),
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id),
  reopen_reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, start_date, end_date),
  constraint annual_reporting_period_date_check check (end_date >= start_date)
);

create table if not exists public.year_end_stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  annual_reporting_period_id uuid not null references public.annual_reporting_periods(id) on delete cascade,
  stock_adjustment_id uuid not null references public.stock_adjustments(id) on delete restrict,
  target_type text not null,
  supplier_name text,
  coffee_type text,
  quantity_kg numeric(14, 3) not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  unique (annual_reporting_period_id, stock_adjustment_id)
);

create table if not exists public.backup_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  export_scope text not null check (export_scope in ('daily', 'date_range', 'full')),
  from_date date,
  to_date date,
  file_name text not null,
  row_count integer not null default 0 check (row_count >= 0),
  status text not null default 'completed' check (status in ('completed', 'failed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  constraint backup_export_date_check check (
    (export_scope = 'full' and from_date is null and to_date is null)
    or (export_scope <> 'full' and from_date is not null and to_date is not null and to_date >= from_date)
  )
);

create index if not exists idx_stock_adjustments_org_date
  on public.stock_adjustments(organization_id, adjustment_date desc);
create index if not exists idx_stock_adjustments_supplier
  on public.stock_adjustments(supplier_id, adjustment_date desc)
  where archived_at is null;
create index if not exists idx_annual_reporting_periods_org_end
  on public.annual_reporting_periods(organization_id, end_date desc);
create index if not exists idx_backup_exports_org_created
  on public.backup_exports(organization_id, created_at desc);

alter table public.stock_movements drop constraint if exists stock_movements_movement_type_check;
alter table public.stock_movements
  add constraint stock_movements_movement_type_check check (
    movement_type in (
      'warehouse_received', 'warehouse_reversal', 'sample_deduction',
      'processing_deduction', 'output_export', 'output_reject',
      'export_contract_deduction', 'buyer_inspection_sample',
      'stock_adjustment', 'stock_adjustment_deduction'
    )
  );

create or replace function public.create_demo_stock_adjustment(p_payload jsonb)
returns public.stock_adjustments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_adjustment public.stock_adjustments;
  v_target text := p_payload->>'target_type';
  v_quantity numeric := (p_payload->>'quantity_kg')::numeric;
  v_supplier_id uuid := nullif(p_payload->>'supplier_id', '')::uuid;
  v_pool text;
begin
  if coalesce(v_quantity, 0) = 0 then raise exception 'Adjustment KG cannot be zero'; end if;
  if length(trim(coalesce(p_payload->>'reason', ''))) < 3 then raise exception 'Adjustment reason is required'; end if;

  v_pool := case
    when v_target = 'supplier' then 'supplier_available'
    when v_target = 'Reject' then 'reject_available'
    else 'export_available'
  end;

  insert into public.stock_adjustments (
    organization_id, adjustment_no, adjustment_date, target_type,
    supplier_id, supplier_name, coffee_type, quantity_kg, reason, notes, is_demo
  ) values (
    (p_payload->>'organization_id')::uuid,
    p_payload->>'adjustment_no',
    (p_payload->>'adjustment_date')::date,
    v_target,
    v_supplier_id,
    nullif(p_payload->>'supplier_name', ''),
    nullif(p_payload->>'coffee_type', ''),
    v_quantity,
    p_payload->>'reason',
    nullif(p_payload->>'notes', ''),
    coalesce((p_payload->>'is_demo')::boolean, false)
  ) returning * into v_adjustment;

  insert into public.stock_movements (
    organization_id, supplier_id, source_type, source_id, movement_type,
    stock_pool, coffee_type, quantity_kg, occurred_at, notes, is_demo
  ) values (
    v_adjustment.organization_id,
    v_adjustment.supplier_id,
    'stock_adjustment',
    v_adjustment.id,
    case when v_adjustment.quantity_kg > 0 then 'stock_adjustment' else 'stock_adjustment_deduction' end,
    v_pool,
    v_adjustment.coffee_type,
    abs(v_adjustment.quantity_kg),
    v_adjustment.adjustment_date::timestamptz,
    v_adjustment.reason,
    v_adjustment.is_demo
  );

  return v_adjustment;
end;
$$;

create or replace function public.reverse_demo_stock_adjustment(
  p_adjustment_id uuid,
  p_reason text
)
returns public.stock_adjustments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_adjustment public.stock_adjustments;
begin
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Reversal reason is required'; end if;

  update public.stock_adjustments
  set status = 'reversed', reversal_reason = p_reason, reversed_at = now(), updated_at = now()
  where id = p_adjustment_id and status = 'approved' and archived_at is null
  returning * into v_adjustment;

  if not found then raise exception 'Approved adjustment not found'; end if;

  update public.stock_movements
  set archived_at = now(), notes = concat_ws(' | ', notes, 'Reversed: ' || p_reason)
  where source_type = 'stock_adjustment' and source_id = p_adjustment_id and archived_at is null;

  return v_adjustment;
end;
$$;

create or replace function public.close_demo_reporting_period(
  p_organization_id uuid,
  p_period_label text,
  p_start_date date,
  p_end_date date,
  p_snapshot jsonb,
  p_warnings jsonb,
  p_adjustment_ids uuid[] default '{}'::uuid[]
)
returns public.annual_reporting_periods
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_period public.annual_reporting_periods;
begin
  if p_end_date < p_start_date then raise exception 'End date must be on or after start date'; end if;

  insert into public.annual_reporting_periods (
    organization_id, period_label, start_date, end_date, snapshot, warnings, is_demo
  ) values (
    p_organization_id, p_period_label, p_start_date, p_end_date,
    coalesce(p_snapshot, '{}'::jsonb), coalesce(p_warnings, '[]'::jsonb), true
  ) returning * into v_period;

  insert into public.year_end_stock_adjustments (
    organization_id, annual_reporting_period_id, stock_adjustment_id,
    target_type, supplier_name, coffee_type, quantity_kg, is_demo
  )
  select
    sa.organization_id, v_period.id, sa.id, sa.target_type,
    sa.supplier_name, sa.coffee_type, sa.quantity_kg, sa.is_demo
  from public.stock_adjustments sa
  where sa.organization_id = p_organization_id
    and sa.id = any(coalesce(p_adjustment_ids, '{}'::uuid[]))
    and sa.status = 'approved'
    and sa.archived_at is null;

  return v_period;
end;
$$;

create or replace function public.calculate_supplier_available_kg(
  p_organization_id uuid,
  p_supplier_id uuid default null
)
returns table (supplier_id uuid, supplier_name text, available_kg numeric)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id, s.supplier_name,
    coalesce(sum(case
      when sm.movement_type in ('warehouse_received', 'stock_adjustment') then sm.quantity_kg
      when sm.movement_type in ('sample_deduction', 'processing_deduction', 'stock_adjustment_deduction') then -sm.quantity_kg
      else 0
    end) filter (where sm.stock_pool = 'supplier_available' and sm.archived_at is null), 0)::numeric
  from public.suppliers s
  left join public.stock_movements sm on sm.supplier_id = s.id
  where s.organization_id = p_organization_id
    and s.archived_at is null
    and (p_supplier_id is null or s.id = p_supplier_id)
  group by s.id, s.supplier_name
  order by s.supplier_name;
$$;

create or replace function public.validate_supplier_available(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_required_kg numeric,
  p_exclude_source_type text default null,
  p_exclude_source_id uuid default null
)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_available numeric;
begin
  if coalesce(p_required_kg, 0) <= 0 then raise exception 'KG must be greater than zero'; end if;
  select coalesce(sum(case
    when sm.movement_type in ('warehouse_received', 'stock_adjustment') then sm.quantity_kg
    when sm.movement_type in ('sample_deduction', 'processing_deduction', 'stock_adjustment_deduction') then -sm.quantity_kg
    else 0
  end), 0) into v_available
  from public.stock_movements sm
  where sm.organization_id = p_organization_id
    and sm.supplier_id = p_supplier_id
    and sm.stock_pool = 'supplier_available'
    and sm.archived_at is null
    and not (p_exclude_source_type is not null and sm.source_type = p_exclude_source_type and sm.source_id = p_exclude_source_id);
  if p_required_kg > v_available then raise exception 'Requested KG exceeds supplier available KG'; end if;
  return v_available;
end;
$$;

create or replace function public.calculate_export_available_stock(
  p_organization_id uuid,
  p_stock_pool text default null,
  p_coffee_type text default null
)
returns table (stock_pool text, coffee_type text, available_kg numeric)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with normalized as (
    select sm.stock_pool,
      coalesce(sm.coffee_type, o.coffee_type, ec.coffee_type, bi.coffee_type) as coffee_type,
      case
        when sm.movement_type in ('output_export', 'output_reject', 'stock_adjustment') then sm.quantity_kg
        when sm.movement_type in ('export_contract_deduction', 'buyer_inspection_sample', 'stock_adjustment_deduction') then -sm.quantity_kg
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
  select n.stock_pool, n.coffee_type, coalesce(sum(n.signed_kg), 0)::numeric
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
set search_path = public, pg_temp
as $$
declare
  v_available numeric;
  v_pool text := public.stock_pool_for_contract(p_stock_pool);
begin
  if coalesce(p_required_kg, 0) <= 0 then raise exception 'Export KG must be greater than zero'; end if;
  select coalesce(sum(case
    when sm.movement_type in ('output_export', 'output_reject', 'stock_adjustment') then sm.quantity_kg
    when sm.movement_type in ('export_contract_deduction', 'buyer_inspection_sample', 'stock_adjustment_deduction') then -sm.quantity_kg
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
  if p_required_kg > v_available then raise exception 'Requested export KG exceeds available stock'; end if;
  return v_available;
end;
$$;

alter table public.stock_adjustments enable row level security;
alter table public.annual_reporting_periods enable row level security;
alter table public.year_end_stock_adjustments enable row level security;
alter table public.backup_exports enable row level security;

grant select, insert, update on public.stock_adjustments to anon, authenticated;
grant select, insert, update on public.annual_reporting_periods to anon, authenticated;
grant select, insert on public.year_end_stock_adjustments to anon, authenticated;
grant select, insert on public.backup_exports to anon, authenticated;
grant select, insert, update on public.stock_movements to anon, authenticated;
grant execute on function public.create_demo_stock_adjustment(jsonb) to anon, authenticated;
grant execute on function public.reverse_demo_stock_adjustment(uuid, text) to anon, authenticated;
grant execute on function public.close_demo_reporting_period(uuid, text, date, date, jsonb, jsonb, uuid[]) to anon, authenticated;

create policy stock_adjustments_member_select on public.stock_adjustments for select to authenticated
using (public.is_member(organization_id));
create policy stock_adjustments_member_insert on public.stock_adjustments for insert to authenticated
with check (public.is_member(organization_id));
create policy stock_adjustments_member_update on public.stock_adjustments for update to authenticated
using (public.is_member(organization_id)) with check (public.is_member(organization_id));

create policy annual_periods_member_select on public.annual_reporting_periods for select to authenticated
using (public.is_member(organization_id));
create policy annual_periods_member_insert on public.annual_reporting_periods for insert to authenticated
with check (public.is_member(organization_id));
create policy annual_periods_member_update on public.annual_reporting_periods for update to authenticated
using (public.is_member(organization_id)) with check (public.is_member(organization_id));

create policy year_end_adjustments_member_select on public.year_end_stock_adjustments for select to authenticated
using (public.is_member(organization_id));
create policy year_end_adjustments_member_insert on public.year_end_stock_adjustments for insert to authenticated
with check (public.is_member(organization_id));

create policy backup_exports_member_select on public.backup_exports for select to authenticated
using (public.is_member(organization_id));
create policy backup_exports_member_insert on public.backup_exports for insert to authenticated
with check (public.is_member(organization_id));

create policy stock_movements_adjustment_member_insert on public.stock_movements for insert to authenticated
with check (
  public.is_member(organization_id)
  and source_type = 'stock_adjustment'
  and movement_type in ('stock_adjustment', 'stock_adjustment_deduction')
);
create policy stock_movements_adjustment_member_update on public.stock_movements for update to authenticated
using (public.is_member(organization_id) and source_type = 'stock_adjustment')
with check (public.is_member(organization_id) and source_type = 'stock_adjustment');

create policy stock_adjustments_demo_anon_select on public.stock_adjustments for select to anon
using (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);
create policy stock_adjustments_demo_anon_insert on public.stock_adjustments for insert to anon
with check (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);
create policy stock_adjustments_demo_anon_update on public.stock_adjustments for update to anon
using (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid)
with check (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy annual_periods_demo_anon_select on public.annual_reporting_periods for select to anon
using (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);
create policy annual_periods_demo_anon_insert on public.annual_reporting_periods for insert to anon
with check (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);
create policy annual_periods_demo_anon_update on public.annual_reporting_periods for update to anon
using (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid)
with check (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy year_end_adjustments_demo_anon_select on public.year_end_stock_adjustments for select to anon
using (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);
create policy year_end_adjustments_demo_anon_insert on public.year_end_stock_adjustments for insert to anon
with check (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy backup_exports_demo_anon_select on public.backup_exports for select to anon
using (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);
create policy backup_exports_demo_anon_insert on public.backup_exports for insert to anon
with check (is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy stock_movements_demo_adjustment_insert on public.stock_movements for insert to anon
with check (
  is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid
  and source_type = 'stock_adjustment'
  and movement_type in ('stock_adjustment', 'stock_adjustment_deduction')
);
create policy stock_movements_demo_adjustment_select on public.stock_movements for select to anon
using (
  is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid
  and source_type = 'stock_adjustment'
);
create policy stock_movements_demo_adjustment_update on public.stock_movements for update to anon
using (
  is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid
  and source_type = 'stock_adjustment'
)
with check (
  is_demo and organization_id = '11111111-1111-4111-8111-111111111111'::uuid
  and source_type = 'stock_adjustment'
);
