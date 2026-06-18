create table if not exists public.warehouse_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  purchase_record_id uuid not null references public.purchase_records(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  base44_id text unique,
  receipt_number text,
  coffee_code text not null,
  supplier_name text not null,
  received_date date not null,
  dispatch_kg numeric(14, 3) not null check (dispatch_kg >= 0),
  received_kg numeric(14, 3) not null check (received_kg > 0),
  shortage_kg numeric(14, 3) not null check (shortage_kg >= 0),
  warehouse_name text,
  status text not null default 'received' check (status in ('draft', 'received', 'archived')),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table if not exists public.warehouse_receipt_history (
  id uuid primary key default gen_random_uuid(),
  warehouse_receipt_id uuid not null references public.warehouse_receipts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  action_type text not null,
  changes jsonb not null default '{}'::jsonb,
  reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  purchase_record_id uuid references public.purchase_records(id) on delete restrict,
  warehouse_receipt_id uuid references public.warehouse_receipts(id) on delete restrict,
  source_type text not null,
  source_id uuid not null,
  movement_type text not null check (movement_type in ('warehouse_received', 'warehouse_receipt_archived')),
  stock_pool text not null default 'supplier_available',
  quantity_kg numeric(14, 3) not null check (quantity_kg >= 0),
  occurred_at timestamptz not null default now(),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  archived_at timestamptz
);

create unique index if not exists idx_wh_receipts_org_receipt_number_active
  on public.warehouse_receipts(organization_id, lower(receipt_number))
  where receipt_number is not null and archived_at is null;

create unique index if not exists idx_wh_receipts_purchase_active
  on public.warehouse_receipts(purchase_record_id)
  where archived_at is null;

create unique index if not exists idx_stock_movements_receipt_active
  on public.stock_movements(warehouse_receipt_id, movement_type)
  where archived_at is null;

create index if not exists idx_wh_receipts_org_archived on public.warehouse_receipts(organization_id, archived_at);
create index if not exists idx_wh_receipts_supplier on public.warehouse_receipts(supplier_id);
create index if not exists idx_wh_receipts_purchase on public.warehouse_receipts(purchase_record_id);
create index if not exists idx_wh_history_receipt_created on public.warehouse_receipt_history(warehouse_receipt_id, created_at desc);
create index if not exists idx_stock_movements_supplier_pool on public.stock_movements(supplier_id, stock_pool, archived_at);
create index if not exists idx_stock_movements_purchase on public.stock_movements(purchase_record_id);

create or replace function public.validate_warehouse_receipt_payload(
  p_purchase public.purchase_records,
  p_supplier_id uuid,
  p_received_kg numeric
)
returns numeric
language plpgsql
stable
as $$
declare
  v_shortage numeric;
begin
  if p_purchase.id is null then
    raise exception 'Purchase record not found';
  end if;
  if p_purchase.archived_at is not null then
    raise exception 'Cannot receive warehouse stock for an archived purchase';
  end if;
  if p_supplier_id is not null and p_purchase.supplier_id is not null and p_supplier_id <> p_purchase.supplier_id then
    raise exception 'Supplier does not match the selected purchase';
  end if;
  if coalesce(p_received_kg, 0) <= 0 then
    raise exception 'Received KG must be greater than zero';
  end if;
  if p_received_kg > p_purchase.net_dispatch_weight_kg then
    raise exception 'Received KG cannot exceed dispatch KG in the demo workflow';
  end if;

  v_shortage := p_purchase.net_dispatch_weight_kg - p_received_kg;
  return v_shortage;
end;
$$;

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
    coalesce(sum(sm.quantity_kg) filter (
      where sm.movement_type = 'warehouse_received'
        and sm.stock_pool = 'supplier_available'
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

create or replace function public.create_warehouse_receipt(p_payload jsonb)
returns public.warehouse_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchase_records;
  v_supplier public.suppliers;
  v_receipt public.warehouse_receipts;
  v_shortage numeric;
  v_received numeric := (p_payload->>'received_kg')::numeric;
  v_supplier_id uuid := nullif(p_payload->>'supplier_id', '')::uuid;
begin
  select * into v_purchase
  from public.purchase_records
  where id = (p_payload->>'purchase_record_id')::uuid
  for update;

  if not found then
    raise exception 'Purchase record not found';
  end if;

  v_supplier_id := coalesce(v_supplier_id, v_purchase.supplier_id);
  select * into v_supplier from public.suppliers where id = v_supplier_id and organization_id = v_purchase.organization_id;
  if not found then
    raise exception 'Supplier not found for purchase organization';
  end if;

  v_shortage := public.validate_warehouse_receipt_payload(v_purchase, v_supplier.id, v_received);

  insert into public.warehouse_receipts (
    organization_id, purchase_record_id, supplier_id, base44_id, receipt_number,
    coffee_code, supplier_name, received_date, dispatch_kg, received_kg,
    shortage_kg, warehouse_name, status, notes, is_demo, created_by, updated_by
  ) values (
    v_purchase.organization_id,
    v_purchase.id,
    v_supplier.id,
    p_payload->>'base44_id',
    nullif(p_payload->>'receipt_number', ''),
    v_purchase.coffee_code,
    v_supplier.supplier_name,
    coalesce(nullif(p_payload->>'received_date', '')::date, current_date),
    v_purchase.net_dispatch_weight_kg,
    v_received,
    v_shortage,
    nullif(p_payload->>'warehouse_name', ''),
    'received',
    nullif(p_payload->>'notes', ''),
    coalesce((p_payload->>'is_demo')::boolean, false),
    auth.uid(),
    auth.uid()
  )
  returning * into v_receipt;

  insert into public.stock_movements (
    organization_id, supplier_id, purchase_record_id, warehouse_receipt_id,
    source_type, source_id, movement_type, stock_pool, quantity_kg,
    occurred_at, notes, is_demo, created_by
  ) values (
    v_receipt.organization_id, v_receipt.supplier_id, v_receipt.purchase_record_id, v_receipt.id,
    'warehouse_receipt', v_receipt.id, 'warehouse_received', 'supplier_available', v_receipt.received_kg,
    v_receipt.received_date::timestamptz, 'Created from warehouse receipt', v_receipt.is_demo, auth.uid()
  );

  insert into public.warehouse_receipt_history (warehouse_receipt_id, organization_id, action_type, changes, reason, is_demo, created_by)
  values (v_receipt.id, v_receipt.organization_id, 'Created', to_jsonb(v_receipt), p_payload->>'reason', v_receipt.is_demo, auth.uid());

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_receipt.organization_id, auth.uid(), v_receipt.is_demo, 'Created', 'warehouse_receipts', v_receipt.id, v_receipt.receipt_number, p_payload->>'reason', to_jsonb(v_receipt));

  update public.purchase_records
  set warehouse_received_kg = v_receipt.received_kg,
      updated_at = now(),
      updated_by = auth.uid()
  where id = v_receipt.purchase_record_id;

  perform public.recalculate_purchase_record(v_receipt.purchase_record_id);
  return v_receipt;
end;
$$;

create or replace function public.update_warehouse_receipt(p_warehouse_receipt_id uuid, p_payload jsonb)
returns public.warehouse_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.warehouse_receipts;
  v_purchase public.purchase_records;
  v_receipt public.warehouse_receipts;
  v_received numeric;
  v_shortage numeric;
begin
  select * into v_old from public.warehouse_receipts where id = p_warehouse_receipt_id for update;
  if not found then raise exception 'Warehouse receipt not found'; end if;
  if v_old.archived_at is not null then raise exception 'Cannot update archived warehouse receipt'; end if;

  select * into v_purchase from public.purchase_records where id = v_old.purchase_record_id for update;
  v_received := coalesce(nullif(p_payload->>'received_kg', '')::numeric, v_old.received_kg);
  v_shortage := public.validate_warehouse_receipt_payload(v_purchase, v_old.supplier_id, v_received);

  update public.warehouse_receipts
  set receipt_number = coalesce(nullif(p_payload->>'receipt_number', ''), receipt_number),
      received_date = coalesce(nullif(p_payload->>'received_date', '')::date, received_date),
      received_kg = v_received,
      shortage_kg = v_shortage,
      warehouse_name = coalesce(nullif(p_payload->>'warehouse_name', ''), warehouse_name),
      notes = coalesce(p_payload->>'notes', notes),
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_warehouse_receipt_id
  returning * into v_receipt;

  update public.stock_movements
  set quantity_kg = v_receipt.received_kg,
      occurred_at = v_receipt.received_date::timestamptz,
      notes = 'Updated from warehouse receipt'
  where warehouse_receipt_id = v_receipt.id
    and movement_type = 'warehouse_received'
    and archived_at is null;

  insert into public.warehouse_receipt_history (warehouse_receipt_id, organization_id, action_type, changes, reason, is_demo, created_by)
  values (v_receipt.id, v_receipt.organization_id, 'Edited', jsonb_build_object('old', to_jsonb(v_old), 'new', to_jsonb(v_receipt)), p_payload->>'reason', v_receipt.is_demo, auth.uid());

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_receipt.organization_id, auth.uid(), v_receipt.is_demo, 'Edited', 'warehouse_receipts', v_receipt.id, v_receipt.receipt_number, p_payload->>'reason', jsonb_build_object('old', to_jsonb(v_old), 'new', to_jsonb(v_receipt)));

  update public.purchase_records
  set warehouse_received_kg = v_receipt.received_kg,
      updated_at = now(),
      updated_by = auth.uid()
  where id = v_receipt.purchase_record_id;

  perform public.recalculate_purchase_record(v_receipt.purchase_record_id);
  return v_receipt;
end;
$$;

create or replace function public.archive_warehouse_receipt(p_warehouse_receipt_id uuid, p_reason text default null)
returns public.warehouse_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.warehouse_receipts;
begin
  select * into v_receipt from public.warehouse_receipts where id = p_warehouse_receipt_id for update;
  if not found then raise exception 'Warehouse receipt not found'; end if;

  update public.warehouse_receipts
  set archived_at = coalesce(archived_at, now()),
      status = 'archived',
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_warehouse_receipt_id
  returning * into v_receipt;

  update public.stock_movements
  set archived_at = coalesce(archived_at, now())
  where warehouse_receipt_id = p_warehouse_receipt_id;

  insert into public.warehouse_receipt_history (warehouse_receipt_id, organization_id, action_type, changes, reason, is_demo, created_by)
  values (v_receipt.id, v_receipt.organization_id, 'Archived', to_jsonb(v_receipt), p_reason, v_receipt.is_demo, auth.uid());

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_receipt.organization_id, auth.uid(), v_receipt.is_demo, 'Archived', 'warehouse_receipts', v_receipt.id, v_receipt.receipt_number, p_reason, to_jsonb(v_receipt));

  update public.purchase_records
  set warehouse_received_kg = null,
      updated_at = now(),
      updated_by = auth.uid()
  where id = v_receipt.purchase_record_id;

  perform public.recalculate_purchase_record(v_receipt.purchase_record_id);
  return v_receipt;
end;
$$;

create or replace function public.restore_warehouse_receipt(p_warehouse_receipt_id uuid, p_reason text default null)
returns public.warehouse_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.warehouse_receipts;
  v_purchase public.purchase_records;
begin
  select * into v_receipt from public.warehouse_receipts where id = p_warehouse_receipt_id for update;
  if not found then raise exception 'Warehouse receipt not found'; end if;
  select * into v_purchase from public.purchase_records where id = v_receipt.purchase_record_id for update;
  perform public.validate_warehouse_receipt_payload(v_purchase, v_receipt.supplier_id, v_receipt.received_kg);

  update public.warehouse_receipts
  set archived_at = null,
      status = 'received',
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_warehouse_receipt_id
  returning * into v_receipt;

  update public.stock_movements
  set archived_at = null
  where warehouse_receipt_id = p_warehouse_receipt_id;

  insert into public.warehouse_receipt_history (warehouse_receipt_id, organization_id, action_type, changes, reason, is_demo, created_by)
  values (v_receipt.id, v_receipt.organization_id, 'Restored', to_jsonb(v_receipt), p_reason, v_receipt.is_demo, auth.uid());

  update public.purchase_records
  set warehouse_received_kg = v_receipt.received_kg,
      updated_at = now(),
      updated_by = auth.uid()
  where id = v_receipt.purchase_record_id;

  perform public.recalculate_purchase_record(v_receipt.purchase_record_id);
  return v_receipt;
end;
$$;

alter table public.warehouse_receipts enable row level security;
alter table public.warehouse_receipt_history enable row level security;
alter table public.stock_movements enable row level security;

create policy warehouse_receipts_select_member on public.warehouse_receipts for select using (public.is_member(organization_id));
create policy warehouse_receipts_write_member on public.warehouse_receipts for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy warehouse_history_select_member on public.warehouse_receipt_history for select using (public.is_member(organization_id));
create policy stock_movements_select_member on public.stock_movements for select using (public.is_member(organization_id));
