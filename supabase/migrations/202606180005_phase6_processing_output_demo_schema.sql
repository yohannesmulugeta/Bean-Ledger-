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
      'stock_adjustment'
    )
  );

create table if not exists public.sample_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  purchase_record_id uuid references public.purchase_records(id) on delete restrict,
  warehouse_receipt_id uuid references public.warehouse_receipts(id) on delete restrict,
  base44_id text unique,
  sample_type text not null default 'Warehouse' check (sample_type in ('Warehouse', 'Export Inspection', 'Export', 'Arrival')),
  supplier_name text,
  coffee_type text,
  coffee_code text,
  sample_date date,
  sample_datetime timestamptz,
  sample_kg numeric(14, 3) not null check (sample_kg > 0),
  company_recipient text,
  keeper_name text,
  remark text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table if not exists public.processing_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  purchase_record_id uuid references public.purchase_records(id) on delete restrict,
  warehouse_receipt_id uuid references public.warehouse_receipts(id) on delete restrict,
  base44_id text unique,
  entry_type text not null default 'Standard' check (entry_type in ('Standard', 'Recleaning')),
  entry_mode text check (entry_mode in ('By Bags', 'By KG')),
  processing_date date not null,
  supplier_name text,
  coffee_type text,
  coffee_code text,
  bags_sent numeric(14, 3) check (bags_sent is null or bags_sent >= 0),
  kg_sent numeric(14, 3) check (kg_sent is null or kg_sent >= 0),
  actual_weighed_kg numeric(14, 3) not null check (actual_weighed_kg > 0),
  batch_variance_kg numeric(14, 3),
  batch_no text,
  remark text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table if not exists public.output_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  processing_log_id uuid references public.processing_logs(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  base44_id text unique,
  entry_type text not null default 'Standard' check (entry_type in ('Standard', 'Recleaned')),
  start_date date not null,
  end_date date not null,
  supplier_name text,
  coffee_type text,
  total_kg_processed numeric(14, 3) not null check (total_kg_processed > 0),
  export_bags numeric(14, 3) not null default 0 check (export_bags >= 0),
  export_kg numeric(14, 3) not null default 0 check (export_kg >= 0),
  reject_bags numeric(14, 3) not null default 0 check (reject_bags >= 0),
  reject_kg numeric(14, 3) not null default 0 check (reject_kg >= 0),
  waste_kg numeric(14, 3) not null default 0 check (waste_kg >= 0),
  reject_pct numeric(9, 4) not null default 0 check (reject_pct >= 0),
  waste_pct numeric(9, 4) not null default 0 check (waste_pct >= 0),
  export_status text not null default 'Available for Export' check (export_status in ('Available for Export', 'Exported')),
  registrar_name text,
  remark text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  constraint output_reports_date_order check (end_date >= start_date)
);

create index if not exists idx_sample_logs_org_archived on public.sample_logs(organization_id, archived_at);
create index if not exists idx_sample_logs_supplier on public.sample_logs(supplier_id, sample_date desc);
create index if not exists idx_sample_logs_receipt on public.sample_logs(warehouse_receipt_id);
create index if not exists idx_processing_logs_org_archived on public.processing_logs(organization_id, archived_at);
create index if not exists idx_processing_logs_supplier_date on public.processing_logs(supplier_id, processing_date desc);
create index if not exists idx_processing_logs_coffee_type_date on public.processing_logs(coffee_type, processing_date desc);
create index if not exists idx_output_reports_org_archived on public.output_reports(organization_id, archived_at);
create index if not exists idx_output_reports_processing on public.output_reports(processing_log_id);
create index if not exists idx_output_reports_coffee_type_date on public.output_reports(coffee_type, start_date desc);

create or replace function public.calculate_supplier_available_kg(
  p_organization_id uuid,
  p_supplier_id uuid default null
)
returns table (
  supplier_id uuid,
  supplier_name text,
  available_kg numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.supplier_name,
    coalesce(sum(case
      when sm.movement_type in ('warehouse_received', 'stock_adjustment') then sm.quantity_kg
      when sm.movement_type in ('sample_deduction', 'processing_deduction') then -sm.quantity_kg
      else 0
    end) filter (
      where sm.stock_pool = 'supplier_available'
        and sm.archived_at is null
    ), 0)::numeric as available_kg
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
set search_path = public
as $$
declare
  v_available numeric;
begin
  if coalesce(p_required_kg, 0) <= 0 then
    raise exception 'KG must be greater than zero';
  end if;

  select coalesce(sum(case
    when sm.movement_type in ('warehouse_received', 'stock_adjustment') then sm.quantity_kg
    when sm.movement_type in ('sample_deduction', 'processing_deduction') then -sm.quantity_kg
    else 0
  end), 0) into v_available
  from public.stock_movements sm
  where sm.organization_id = p_organization_id
    and sm.supplier_id = p_supplier_id
    and sm.stock_pool = 'supplier_available'
    and sm.archived_at is null
    and not (p_exclude_source_type is not null and sm.source_type = p_exclude_source_type and sm.source_id = p_exclude_source_id);

  if p_required_kg > v_available then
    raise exception 'Requested KG exceeds supplier available KG';
  end if;

  return v_available;
end;
$$;

create or replace function public.calculate_output_totals(
  p_total_kg_processed numeric,
  p_export_bags numeric,
  p_reject_bags numeric
)
returns table (
  export_kg numeric,
  reject_kg numeric,
  waste_kg numeric,
  reject_pct numeric,
  waste_pct numeric
)
language plpgsql
stable
as $$
declare
  v_total numeric := coalesce(p_total_kg_processed, 0);
  v_export_bags numeric := coalesce(p_export_bags, 0);
  v_reject_bags numeric := coalesce(p_reject_bags, 0);
begin
  if v_total <= 0 then raise exception 'Total processed KG must be greater than zero'; end if;
  if v_export_bags < 0 or v_reject_bags < 0 then raise exception 'Bag counts cannot be negative'; end if;

  export_kg := v_export_bags * 60;
  reject_kg := v_reject_bags * 85;
  waste_kg := v_total - export_kg - reject_kg;
  if waste_kg < -0.01 then
    raise exception 'Export KG plus reject KG cannot exceed total processed KG';
  end if;
  waste_kg := greatest(waste_kg, 0);
  reject_pct := case when v_total > 0 then (reject_kg / v_total) * 100 else 0 end;
  waste_pct := case when v_total > 0 then (waste_kg / v_total) * 100 else 0 end;
  return next;
end;
$$;

create or replace function public.create_sample_log(p_payload jsonb)
returns public.sample_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier public.suppliers;
  v_receipt public.warehouse_receipts;
  v_sample public.sample_logs;
  v_kg numeric := (p_payload->>'sample_kg')::numeric;
begin
  select * into v_supplier from public.suppliers where id = (p_payload->>'supplier_id')::uuid and archived_at is null for update;
  if not found then raise exception 'Supplier not found'; end if;
  perform public.validate_supplier_available(v_supplier.organization_id, v_supplier.id, v_kg);

  if nullif(p_payload->>'warehouse_receipt_id', '') is not null then
    select * into v_receipt from public.warehouse_receipts where id = (p_payload->>'warehouse_receipt_id')::uuid and archived_at is null;
  end if;

  insert into public.sample_logs (
    organization_id, supplier_id, purchase_record_id, warehouse_receipt_id, base44_id,
    sample_type, supplier_name, coffee_type, coffee_code, sample_date, sample_datetime,
    sample_kg, company_recipient, keeper_name, remark, is_demo, created_by, updated_by
  ) values (
    v_supplier.organization_id, v_supplier.id, nullif(p_payload->>'purchase_record_id', '')::uuid, v_receipt.id, p_payload->>'base44_id',
    coalesce(nullif(p_payload->>'sample_type', ''), 'Warehouse'), v_supplier.supplier_name,
    coalesce(nullif(p_payload->>'coffee_type', ''), v_supplier.coffee_type), nullif(p_payload->>'coffee_code', ''),
    coalesce(nullif(p_payload->>'sample_date', '')::date, current_date),
    coalesce(nullif(p_payload->>'sample_datetime', '')::timestamptz, now()),
    v_kg, nullif(p_payload->>'company_recipient', ''), nullif(p_payload->>'keeper_name', ''),
    nullif(p_payload->>'remark', ''), coalesce((p_payload->>'is_demo')::boolean, false), auth.uid(), auth.uid()
  ) returning * into v_sample;

  insert into public.stock_movements (
    organization_id, supplier_id, purchase_record_id, warehouse_receipt_id, source_type, source_id,
    movement_type, stock_pool, quantity_kg, occurred_at, notes, is_demo, created_by
  ) values (
    v_sample.organization_id, v_sample.supplier_id, v_sample.purchase_record_id, v_sample.warehouse_receipt_id,
    'sample_log', v_sample.id, 'sample_deduction', 'supplier_available', v_sample.sample_kg,
    v_sample.sample_datetime, 'Sample deduction', v_sample.is_demo, auth.uid()
  );

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_sample.organization_id, auth.uid(), v_sample.is_demo, 'Created', 'sample_logs', v_sample.id, v_sample.supplier_name, p_payload->>'reason', to_jsonb(v_sample));

  return v_sample;
end;
$$;

create or replace function public.update_sample_log(p_sample_log_id uuid, p_payload jsonb)
returns public.sample_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.sample_logs;
  v_sample public.sample_logs;
  v_kg numeric;
begin
  select * into v_old from public.sample_logs where id = p_sample_log_id for update;
  if not found then raise exception 'Sample log not found'; end if;
  if v_old.archived_at is not null then raise exception 'Cannot update archived sample log'; end if;
  v_kg := coalesce(nullif(p_payload->>'sample_kg', '')::numeric, v_old.sample_kg);
  perform public.validate_supplier_available(v_old.organization_id, v_old.supplier_id, v_kg, 'sample_log', v_old.id);

  update public.sample_logs
  set sample_date = coalesce(nullif(p_payload->>'sample_date', '')::date, sample_date),
      sample_datetime = coalesce(nullif(p_payload->>'sample_datetime', '')::timestamptz, sample_datetime),
      sample_kg = v_kg,
      company_recipient = coalesce(p_payload->>'company_recipient', company_recipient),
      keeper_name = coalesce(p_payload->>'keeper_name', keeper_name),
      remark = coalesce(p_payload->>'remark', remark),
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_sample_log_id
  returning * into v_sample;

  update public.stock_movements
  set quantity_kg = v_sample.sample_kg,
      occurred_at = v_sample.sample_datetime,
      notes = 'Updated sample deduction'
  where source_type = 'sample_log' and source_id = v_sample.id and archived_at is null;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_sample.organization_id, auth.uid(), v_sample.is_demo, 'Edited', 'sample_logs', v_sample.id, v_sample.supplier_name, p_payload->>'reason', jsonb_build_object('old', to_jsonb(v_old), 'new', to_jsonb(v_sample)));

  return v_sample;
end;
$$;

create or replace function public.archive_sample_log(p_sample_log_id uuid, p_reason text default null)
returns public.sample_logs
language plpgsql
security definer
set search_path = public
as $$
declare v_sample public.sample_logs;
begin
  update public.sample_logs set archived_at = coalesce(archived_at, now()), updated_at = now(), updated_by = auth.uid()
  where id = p_sample_log_id returning * into v_sample;
  if not found then raise exception 'Sample log not found'; end if;
  update public.stock_movements set archived_at = coalesce(archived_at, now()) where source_type = 'sample_log' and source_id = p_sample_log_id;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_sample.organization_id, auth.uid(), v_sample.is_demo, 'Archived', 'sample_logs', v_sample.id, v_sample.supplier_name, p_reason, to_jsonb(v_sample));
  return v_sample;
end;
$$;

create or replace function public.restore_sample_log(p_sample_log_id uuid, p_reason text default null)
returns public.sample_logs
language plpgsql
security definer
set search_path = public
as $$
declare v_sample public.sample_logs;
begin
  select * into v_sample from public.sample_logs where id = p_sample_log_id for update;
  if not found then raise exception 'Sample log not found'; end if;
  perform public.validate_supplier_available(v_sample.organization_id, v_sample.supplier_id, v_sample.sample_kg);
  update public.sample_logs set archived_at = null, updated_at = now(), updated_by = auth.uid()
  where id = p_sample_log_id returning * into v_sample;
  update public.stock_movements set archived_at = null where source_type = 'sample_log' and source_id = p_sample_log_id;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_sample.organization_id, auth.uid(), v_sample.is_demo, 'Restored', 'sample_logs', v_sample.id, v_sample.supplier_name, p_reason, to_jsonb(v_sample));
  return v_sample;
end;
$$;

create or replace function public.create_processing_log(p_payload jsonb)
returns public.processing_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier public.suppliers;
  v_log public.processing_logs;
  v_actual numeric := (p_payload->>'actual_weighed_kg')::numeric;
  v_bags numeric := nullif(p_payload->>'bags_sent', '')::numeric;
  v_kg_sent numeric;
begin
  select * into v_supplier from public.suppliers where id = (p_payload->>'supplier_id')::uuid and archived_at is null for update;
  if not found then raise exception 'Supplier not found'; end if;
  perform public.validate_supplier_available(v_supplier.organization_id, v_supplier.id, v_actual);
  v_kg_sent := coalesce(nullif(p_payload->>'kg_sent', '')::numeric, case when v_bags is not null then v_bags * 85 else null end);

  insert into public.processing_logs (
    organization_id, supplier_id, purchase_record_id, warehouse_receipt_id, base44_id, entry_type, entry_mode,
    processing_date, supplier_name, coffee_type, coffee_code, bags_sent, kg_sent, actual_weighed_kg,
    batch_variance_kg, batch_no, remark, is_demo, created_by, updated_by
  ) values (
    v_supplier.organization_id, v_supplier.id, nullif(p_payload->>'purchase_record_id', '')::uuid, nullif(p_payload->>'warehouse_receipt_id', '')::uuid,
    p_payload->>'base44_id', coalesce(nullif(p_payload->>'entry_type', ''), 'Standard'), coalesce(nullif(p_payload->>'entry_mode', ''), 'By KG'),
    coalesce(nullif(p_payload->>'date', '')::date, current_date), v_supplier.supplier_name,
    coalesce(nullif(p_payload->>'coffee_type', ''), v_supplier.coffee_type), nullif(p_payload->>'coffee_code', ''),
    v_bags, v_kg_sent, v_actual,
    case when v_bags is not null and v_bags > 0 then v_actual - (v_bags * 85) else null end,
    nullif(p_payload->>'batch_no', ''), nullif(p_payload->>'remark', ''), coalesce((p_payload->>'is_demo')::boolean, false), auth.uid(), auth.uid()
  ) returning * into v_log;

  insert into public.stock_movements (
    organization_id, supplier_id, purchase_record_id, warehouse_receipt_id, source_type, source_id,
    movement_type, stock_pool, quantity_kg, occurred_at, notes, is_demo, created_by
  ) values (
    v_log.organization_id, v_log.supplier_id, v_log.purchase_record_id, v_log.warehouse_receipt_id,
    'processing_log', v_log.id, 'processing_deduction', 'supplier_available', v_log.actual_weighed_kg,
    v_log.processing_date::timestamptz, 'Processing deduction', v_log.is_demo, auth.uid()
  );

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_log.organization_id, auth.uid(), v_log.is_demo, 'Created', 'processing_logs', v_log.id, v_log.supplier_name, p_payload->>'reason', to_jsonb(v_log));

  return v_log;
end;
$$;

create or replace function public.update_processing_log(p_processing_log_id uuid, p_payload jsonb)
returns public.processing_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.processing_logs;
  v_log public.processing_logs;
  v_actual numeric;
  v_bags numeric;
begin
  select * into v_old from public.processing_logs where id = p_processing_log_id for update;
  if not found then raise exception 'Processing log not found'; end if;
  if v_old.archived_at is not null then raise exception 'Cannot update archived processing log'; end if;
  v_actual := coalesce(nullif(p_payload->>'actual_weighed_kg', '')::numeric, v_old.actual_weighed_kg);
  v_bags := coalesce(nullif(p_payload->>'bags_sent', '')::numeric, v_old.bags_sent);
  perform public.validate_supplier_available(v_old.organization_id, v_old.supplier_id, v_actual, 'processing_log', v_old.id);

  update public.processing_logs
  set processing_date = coalesce(nullif(p_payload->>'date', '')::date, processing_date),
      bags_sent = v_bags,
      kg_sent = coalesce(nullif(p_payload->>'kg_sent', '')::numeric, case when v_bags is not null then v_bags * 85 else kg_sent end),
      actual_weighed_kg = v_actual,
      batch_variance_kg = case when v_bags is not null and v_bags > 0 then v_actual - (v_bags * 85) else null end,
      batch_no = coalesce(p_payload->>'batch_no', batch_no),
      remark = coalesce(p_payload->>'remark', remark),
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_processing_log_id
  returning * into v_log;

  update public.stock_movements
  set quantity_kg = v_log.actual_weighed_kg,
      occurred_at = v_log.processing_date::timestamptz,
      notes = 'Updated processing deduction'
  where source_type = 'processing_log' and source_id = v_log.id and archived_at is null;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_log.organization_id, auth.uid(), v_log.is_demo, 'Edited', 'processing_logs', v_log.id, v_log.supplier_name, p_payload->>'reason', jsonb_build_object('old', to_jsonb(v_old), 'new', to_jsonb(v_log)));

  return v_log;
end;
$$;

create or replace function public.archive_processing_log(p_processing_log_id uuid, p_reason text default null)
returns public.processing_logs
language plpgsql
security definer
set search_path = public
as $$
declare v_log public.processing_logs;
begin
  update public.processing_logs set archived_at = coalesce(archived_at, now()), updated_at = now(), updated_by = auth.uid()
  where id = p_processing_log_id returning * into v_log;
  if not found then raise exception 'Processing log not found'; end if;
  update public.stock_movements set archived_at = coalesce(archived_at, now()) where source_type = 'processing_log' and source_id = p_processing_log_id;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_log.organization_id, auth.uid(), v_log.is_demo, 'Archived', 'processing_logs', v_log.id, v_log.supplier_name, p_reason, to_jsonb(v_log));
  return v_log;
end;
$$;

create or replace function public.restore_processing_log(p_processing_log_id uuid, p_reason text default null)
returns public.processing_logs
language plpgsql
security definer
set search_path = public
as $$
declare v_log public.processing_logs;
begin
  select * into v_log from public.processing_logs where id = p_processing_log_id for update;
  if not found then raise exception 'Processing log not found'; end if;
  perform public.validate_supplier_available(v_log.organization_id, v_log.supplier_id, v_log.actual_weighed_kg);
  update public.processing_logs set archived_at = null, updated_at = now(), updated_by = auth.uid()
  where id = p_processing_log_id returning * into v_log;
  update public.stock_movements set archived_at = null where source_type = 'processing_log' and source_id = p_processing_log_id;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_log.organization_id, auth.uid(), v_log.is_demo, 'Restored', 'processing_logs', v_log.id, v_log.supplier_name, p_reason, to_jsonb(v_log));
  return v_log;
end;
$$;

create or replace function public.create_output_report(p_payload jsonb)
returns public.output_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_processing public.processing_logs;
  v_report public.output_reports;
  v_totals record;
  v_total numeric := (p_payload->>'total_kg_processed')::numeric;
begin
  if nullif(p_payload->>'processing_log_id', '') is not null then
    select * into v_processing from public.processing_logs where id = (p_payload->>'processing_log_id')::uuid and archived_at is null for update;
    if not found then raise exception 'Processing log not found'; end if;
  end if;
  select * into v_totals from public.calculate_output_totals(v_total, nullif(p_payload->>'export_bags', '')::numeric, nullif(p_payload->>'reject_bags', '')::numeric);

  insert into public.output_reports (
    organization_id, processing_log_id, supplier_id, base44_id, entry_type, start_date, end_date,
    supplier_name, coffee_type, total_kg_processed, export_bags, export_kg, reject_bags, reject_kg,
    waste_kg, reject_pct, waste_pct, export_status, registrar_name, remark, is_demo, created_by, updated_by
  ) values (
    coalesce(v_processing.organization_id, (p_payload->>'organization_id')::uuid),
    v_processing.id, v_processing.supplier_id, p_payload->>'base44_id', coalesce(nullif(p_payload->>'entry_type', ''), 'Standard'),
    coalesce(nullif(p_payload->>'start_date', '')::date, current_date), coalesce(nullif(p_payload->>'end_date', '')::date, current_date),
    coalesce(v_processing.supplier_name, nullif(p_payload->>'supplier_name', '')),
    coalesce(v_processing.coffee_type, nullif(p_payload->>'coffee_type', '')),
    v_total, coalesce(nullif(p_payload->>'export_bags', '')::numeric, 0), v_totals.export_kg,
    coalesce(nullif(p_payload->>'reject_bags', '')::numeric, 0), v_totals.reject_kg,
    v_totals.waste_kg, v_totals.reject_pct, v_totals.waste_pct,
    coalesce(nullif(p_payload->>'export_status', ''), 'Available for Export'),
    nullif(p_payload->>'registrar_name', ''), nullif(p_payload->>'remark', ''),
    coalesce((p_payload->>'is_demo')::boolean, false), auth.uid(), auth.uid()
  ) returning * into v_report;

  if v_report.export_kg > 0 then
    insert into public.stock_movements (organization_id, supplier_id, source_type, source_id, movement_type, stock_pool, quantity_kg, occurred_at, notes, is_demo, created_by)
    values (v_report.organization_id, v_report.supplier_id, 'output_report', v_report.id, 'output_export', 'export_available', v_report.export_kg, v_report.end_date::timestamptz, 'Output export stock', v_report.is_demo, auth.uid());
  end if;
  if v_report.reject_kg > 0 then
    insert into public.stock_movements (organization_id, supplier_id, source_type, source_id, movement_type, stock_pool, quantity_kg, occurred_at, notes, is_demo, created_by)
    values (v_report.organization_id, v_report.supplier_id, 'output_report', v_report.id, 'output_reject', 'reject_available', v_report.reject_kg, v_report.end_date::timestamptz, 'Output reject stock', v_report.is_demo, auth.uid());
  end if;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_report.organization_id, auth.uid(), v_report.is_demo, 'Created', 'output_reports', v_report.id, v_report.coffee_type, p_payload->>'reason', to_jsonb(v_report));

  return v_report;
end;
$$;

create or replace function public.update_output_report(p_output_report_id uuid, p_payload jsonb)
returns public.output_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.output_reports;
  v_report public.output_reports;
  v_totals record;
  v_total numeric;
begin
  select * into v_old from public.output_reports where id = p_output_report_id for update;
  if not found then raise exception 'Output report not found'; end if;
  if v_old.archived_at is not null then raise exception 'Cannot update archived output report'; end if;
  v_total := coalesce(nullif(p_payload->>'total_kg_processed', '')::numeric, v_old.total_kg_processed);
  select * into v_totals from public.calculate_output_totals(v_total, coalesce(nullif(p_payload->>'export_bags', '')::numeric, v_old.export_bags), coalesce(nullif(p_payload->>'reject_bags', '')::numeric, v_old.reject_bags));

  update public.output_reports
  set start_date = coalesce(nullif(p_payload->>'start_date', '')::date, start_date),
      end_date = coalesce(nullif(p_payload->>'end_date', '')::date, end_date),
      total_kg_processed = v_total,
      export_bags = coalesce(nullif(p_payload->>'export_bags', '')::numeric, export_bags),
      export_kg = v_totals.export_kg,
      reject_bags = coalesce(nullif(p_payload->>'reject_bags', '')::numeric, reject_bags),
      reject_kg = v_totals.reject_kg,
      waste_kg = v_totals.waste_kg,
      reject_pct = v_totals.reject_pct,
      waste_pct = v_totals.waste_pct,
      registrar_name = coalesce(p_payload->>'registrar_name', registrar_name),
      remark = coalesce(p_payload->>'remark', remark),
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_output_report_id returning * into v_report;

  delete from public.stock_movements where source_type = 'output_report' and source_id = v_report.id;
  if v_report.export_kg > 0 then
    insert into public.stock_movements (organization_id, supplier_id, source_type, source_id, movement_type, stock_pool, quantity_kg, occurred_at, notes, is_demo, created_by)
    values (v_report.organization_id, v_report.supplier_id, 'output_report', v_report.id, 'output_export', 'export_available', v_report.export_kg, v_report.end_date::timestamptz, 'Updated output export stock', v_report.is_demo, auth.uid());
  end if;
  if v_report.reject_kg > 0 then
    insert into public.stock_movements (organization_id, supplier_id, source_type, source_id, movement_type, stock_pool, quantity_kg, occurred_at, notes, is_demo, created_by)
    values (v_report.organization_id, v_report.supplier_id, 'output_report', v_report.id, 'output_reject', 'reject_available', v_report.reject_kg, v_report.end_date::timestamptz, 'Updated output reject stock', v_report.is_demo, auth.uid());
  end if;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_report.organization_id, auth.uid(), v_report.is_demo, 'Edited', 'output_reports', v_report.id, v_report.coffee_type, p_payload->>'reason', jsonb_build_object('old', to_jsonb(v_old), 'new', to_jsonb(v_report)));

  return v_report;
end;
$$;

create or replace function public.archive_output_report(p_output_report_id uuid, p_reason text default null)
returns public.output_reports
language plpgsql
security definer
set search_path = public
as $$
declare v_report public.output_reports;
begin
  update public.output_reports set archived_at = coalesce(archived_at, now()), updated_at = now(), updated_by = auth.uid()
  where id = p_output_report_id returning * into v_report;
  if not found then raise exception 'Output report not found'; end if;
  update public.stock_movements set archived_at = coalesce(archived_at, now()) where source_type = 'output_report' and source_id = p_output_report_id;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_report.organization_id, auth.uid(), v_report.is_demo, 'Archived', 'output_reports', v_report.id, v_report.coffee_type, p_reason, to_jsonb(v_report));
  return v_report;
end;
$$;

create or replace function public.restore_output_report(p_output_report_id uuid, p_reason text default null)
returns public.output_reports
language plpgsql
security definer
set search_path = public
as $$
declare v_report public.output_reports;
begin
  update public.output_reports set archived_at = null, updated_at = now(), updated_by = auth.uid()
  where id = p_output_report_id returning * into v_report;
  if not found then raise exception 'Output report not found'; end if;
  update public.stock_movements set archived_at = null where source_type = 'output_report' and source_id = p_output_report_id;
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_report.organization_id, auth.uid(), v_report.is_demo, 'Restored', 'output_reports', v_report.id, v_report.coffee_type, p_reason, to_jsonb(v_report));
  return v_report;
end;
$$;

alter table public.sample_logs enable row level security;
alter table public.processing_logs enable row level security;
alter table public.output_reports enable row level security;

create policy sample_logs_select_member on public.sample_logs for select using (public.is_member(organization_id));
create policy sample_logs_write_member on public.sample_logs for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy processing_logs_select_member on public.processing_logs for select using (public.is_member(organization_id));
create policy processing_logs_write_member on public.processing_logs for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy output_reports_select_member on public.output_reports for select using (public.is_member(organization_id));
create policy output_reports_write_member on public.output_reports for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
