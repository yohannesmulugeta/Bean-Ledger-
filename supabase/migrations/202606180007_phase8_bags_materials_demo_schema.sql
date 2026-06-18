create table if not exists public.bag_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  purchase_record_id uuid references public.purchase_records(id) on delete restrict,
  warehouse_receipt_id uuid references public.warehouse_receipts(id) on delete restrict,
  base44_id text unique,
  receipt_mode text not null default 'agent' check (receipt_mode in ('agent', 'supplier')),
  agent_name text,
  supplier_name text,
  date date not null,
  warehouse_received_kg numeric(14, 3) check (warehouse_received_kg is null or warehouse_received_kg >= 0),
  bags_received numeric(14, 3) not null check (bags_received > 0),
  source text not null default 'manual' check (source in ('warehouse', 'manual')),
  note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  constraint bag_receipts_holder_check check (
    (receipt_mode = 'agent' and agent_name is not null)
    or (receipt_mode = 'supplier' and supplier_name is not null)
  )
);

create table if not exists public.reject_bag_usages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  base44_id text unique,
  reject_mode text not null default 'agent' check (reject_mode in ('agent', 'supplier')),
  agent_name text,
  supplier_name text,
  date date not null,
  bags_used numeric(14, 3) not null check (bags_used > 0),
  amount_etb numeric(14, 2) not null check (amount_etb >= 0),
  note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  constraint reject_bag_usages_holder_check check (
    (reject_mode = 'agent' and agent_name is not null)
    or (reject_mode = 'supplier' and supplier_name is not null)
  )
);

create table if not exists public.supplier_bag_returns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  base44_id text unique,
  agent_name text,
  supplier_name text,
  return_date date not null,
  bags_returned numeric(14, 3) not null check (bags_returned > 0),
  note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  constraint supplier_bag_returns_holder_check check (agent_name is not null or supplier_name is not null)
);

create table if not exists public.supplier_bag_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  base44_id text unique,
  agent_name text,
  supplier_name text,
  payment_date date not null,
  bank_name text,
  branch_account text,
  reference_no text,
  payment_type text check (payment_type is null or payment_type in ('Advance', 'Final Payment')),
  amount_etb numeric(14, 2) not null check (amount_etb > 0),
  note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  constraint supplier_bag_payments_holder_check check (agent_name is not null or supplier_name is not null)
);

create table if not exists public.supplier_bag_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  base44_id text unique,
  agent_name text,
  supplier_name text,
  settlement_date date not null default current_date,
  bags_received_adjustment numeric(14, 3) not null default 0,
  bags_used_adjustment numeric(14, 3) not null default 0,
  loss_percent_override numeric(9, 4) check (loss_percent_override is null or loss_percent_override >= 0),
  bags_returned boolean not null default false,
  bags_returned_date date,
  bags_returned_count numeric(14, 3) check (bags_returned_count is null or bags_returned_count >= 0),
  bags_returned_note text,
  cash_paid boolean not null default false,
  cash_paid_date date,
  note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  constraint supplier_bag_settlements_holder_check check (agent_name is not null or supplier_name is not null)
);

create table if not exists public.material_register_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  export_contract_id uuid references public.export_contracts(id) on delete restrict,
  base44_id text unique,
  category text not null default 'general' check (category in ('export', 'general')),
  date date not null,
  item_type text,
  bag_size text,
  entry_type text check (entry_type is null or entry_type in ('Purchase', 'Usage')),
  item_name text,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_cost_etb numeric(14, 2) check (unit_cost_etb is null or unit_cost_etb >= 0),
  total_cost_etb numeric(14, 2) check (total_cost_etb is null or total_cost_etb >= 0),
  purpose text,
  note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  archived_at timestamptz,
  constraint material_export_entry_check check (
    category = 'general'
    or (category = 'export' and item_type is not null and entry_type is not null)
  ),
  constraint material_general_entry_check check (
    category = 'export'
    or (category = 'general' and item_name is not null and unit_cost_etb is not null)
  )
);

create table if not exists public.material_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  material_register_entry_id uuid not null references public.material_register_entries(id) on delete cascade,
  export_contract_id uuid references public.export_contracts(id) on delete restrict,
  item_key text not null,
  movement_type text not null check (movement_type in ('material_purchase', 'material_usage', 'material_adjustment')),
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_cost_etb numeric(14, 2) check (unit_cost_etb is null or unit_cost_etb >= 0),
  total_cost_etb numeric(14, 2) check (total_cost_etb is null or total_cost_etb >= 0),
  occurred_at timestamptz not null default now(),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  archived_at timestamptz
);

create index if not exists idx_bag_receipts_org_holder on public.bag_receipts(organization_id, receipt_mode, agent_name, supplier_name, archived_at);
create index if not exists idx_reject_bag_usages_org_holder on public.reject_bag_usages(organization_id, reject_mode, agent_name, supplier_name, archived_at);
create index if not exists idx_supplier_bag_returns_org_holder on public.supplier_bag_returns(organization_id, agent_name, supplier_name, archived_at);
create index if not exists idx_supplier_bag_payments_org_holder on public.supplier_bag_payments(organization_id, agent_name, supplier_name, archived_at);
create index if not exists idx_supplier_bag_settlements_org_holder on public.supplier_bag_settlements(organization_id, agent_name, supplier_name, archived_at);
create index if not exists idx_material_entries_org_category on public.material_register_entries(organization_id, category, archived_at);
create index if not exists idx_material_movements_org_item on public.material_movements(organization_id, item_key, archived_at);

alter table public.bag_receipts enable row level security;
alter table public.reject_bag_usages enable row level security;
alter table public.supplier_bag_returns enable row level security;
alter table public.supplier_bag_payments enable row level security;
alter table public.supplier_bag_settlements enable row level security;
alter table public.material_register_entries enable row level security;
alter table public.material_movements enable row level security;

create policy bag_receipts_member_all on public.bag_receipts for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy reject_bag_usages_member_all on public.reject_bag_usages for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy supplier_bag_returns_member_all on public.supplier_bag_returns for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy supplier_bag_payments_member_all on public.supplier_bag_payments for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy supplier_bag_settlements_member_all on public.supplier_bag_settlements for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy material_register_entries_member_all on public.material_register_entries for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy material_movements_member_all on public.material_movements for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));

create or replace function public.bag_holder_mode(p_agent_name text, p_supplier_name text)
returns text language sql immutable as $$
  select case when p_agent_name is not null then 'agent' else 'supplier' end;
$$;

create or replace function public.bag_holder_name(p_agent_name text, p_supplier_name text)
returns text language sql immutable as $$
  select coalesce(nullif(p_agent_name, ''), nullif(p_supplier_name, ''));
$$;

create or replace function public.calculate_supplier_bag_balance(p_organization_id uuid)
returns table (
  holder_mode text,
  holder_name text,
  received numeric,
  loss_allowance numeric,
  used numeric,
  net_to_return numeric,
  returned numeric,
  bags_remaining_to_return numeric,
  cash_earned_etb numeric,
  paid_etb numeric,
  cash_remaining_etb numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with holders as (
    select receipt_mode as holder_mode, case when receipt_mode = 'agent' then agent_name else supplier_name end as holder_name from public.bag_receipts where organization_id = p_organization_id and archived_at is null
    union
    select reject_mode, case when reject_mode = 'agent' then agent_name else supplier_name end from public.reject_bag_usages where organization_id = p_organization_id and archived_at is null
    union
    select public.bag_holder_mode(agent_name, supplier_name), public.bag_holder_name(agent_name, supplier_name) from public.supplier_bag_returns where organization_id = p_organization_id and archived_at is null
    union
    select public.bag_holder_mode(agent_name, supplier_name), public.bag_holder_name(agent_name, supplier_name) from public.supplier_bag_payments where organization_id = p_organization_id and archived_at is null
    union
    select public.bag_holder_mode(agent_name, supplier_name), public.bag_holder_name(agent_name, supplier_name) from public.supplier_bag_settlements where organization_id = p_organization_id and archived_at is null
  ),
  receipt_totals as (
    select receipt_mode holder_mode, case when receipt_mode = 'agent' then agent_name else supplier_name end holder_name, sum(bags_received) received
    from public.bag_receipts where organization_id = p_organization_id and archived_at is null group by 1,2
  ),
  usage_totals as (
    select reject_mode holder_mode, case when reject_mode = 'agent' then agent_name else supplier_name end holder_name, sum(bags_used) used
    from public.reject_bag_usages where organization_id = p_organization_id and archived_at is null group by 1,2
  ),
  return_totals as (
    select public.bag_holder_mode(agent_name, supplier_name) holder_mode, public.bag_holder_name(agent_name, supplier_name) holder_name, sum(bags_returned) returned
    from public.supplier_bag_returns where organization_id = p_organization_id and archived_at is null group by 1,2
  ),
  payment_totals as (
    select public.bag_holder_mode(agent_name, supplier_name) holder_mode, public.bag_holder_name(agent_name, supplier_name) holder_name, sum(amount_etb) paid
    from public.supplier_bag_payments where organization_id = p_organization_id and archived_at is null group by 1,2
  ),
  settlement_totals as (
    select
      public.bag_holder_mode(agent_name, supplier_name) holder_mode,
      public.bag_holder_name(agent_name, supplier_name) holder_name,
      sum(bags_received_adjustment) received_adjustment,
      sum(bags_used_adjustment) used_adjustment,
      sum(coalesce(bags_returned_count, 0)) returned_adjustment
    from public.supplier_bag_settlements where organization_id = p_organization_id and archived_at is null group by 1,2
  )
  select
    h.holder_mode,
    h.holder_name,
    greatest(0, coalesce(r.received, 0) + coalesce(s.received_adjustment, 0))::numeric as received,
    ceil(greatest(0, coalesce(r.received, 0) + coalesce(s.received_adjustment, 0)) * 0.01)::numeric as loss_allowance,
    greatest(0, coalesce(u.used, 0) + coalesce(s.used_adjustment, 0))::numeric as used,
    (
      greatest(0, coalesce(r.received, 0) + coalesce(s.received_adjustment, 0))
      - ceil(greatest(0, coalesce(r.received, 0) + coalesce(s.received_adjustment, 0)) * 0.01)
      - greatest(0, coalesce(u.used, 0) + coalesce(s.used_adjustment, 0))
    )::numeric as net_to_return,
    (coalesce(rt.returned, 0) + coalesce(s.returned_adjustment, 0))::numeric as returned,
    greatest(0,
      greatest(0, coalesce(r.received, 0) + coalesce(s.received_adjustment, 0))
      - ceil(greatest(0, coalesce(r.received, 0) + coalesce(s.received_adjustment, 0)) * 0.01)
      - greatest(0, coalesce(u.used, 0) + coalesce(s.used_adjustment, 0))
      - coalesce(rt.returned, 0) - coalesce(s.returned_adjustment, 0)
    )::numeric as bags_remaining_to_return,
    (greatest(0, coalesce(u.used, 0) + coalesce(s.used_adjustment, 0)) * 153)::numeric as cash_earned_etb,
    coalesce(p.paid, 0)::numeric as paid_etb,
    greatest(0, (greatest(0, coalesce(u.used, 0) + coalesce(s.used_adjustment, 0)) * 153) - coalesce(p.paid, 0))::numeric as cash_remaining_etb
  from holders h
  left join receipt_totals r using (holder_mode, holder_name)
  left join usage_totals u using (holder_mode, holder_name)
  left join return_totals rt using (holder_mode, holder_name)
  left join payment_totals p using (holder_mode, holder_name)
  left join settlement_totals s using (holder_mode, holder_name)
  where h.holder_name is not null
  order by h.holder_mode, h.holder_name;
$$;

create or replace function public.material_item_key(p_item_type text, p_bag_size text, p_item_name text)
returns text language sql immutable as $$
  select case
    when p_item_type = 'Bag' then trim('Bag ' || coalesce(p_bag_size, ''))
    else coalesce(nullif(p_item_type, ''), nullif(p_item_name, ''))
  end;
$$;

create or replace function public.calculate_material_balance(p_organization_id uuid)
returns table (item_key text, purchased numeric, used numeric, balance numeric, total_cost_etb numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    mm.item_key,
    coalesce(sum(case when mm.movement_type = 'material_purchase' then mm.quantity else 0 end), 0)::numeric as purchased,
    coalesce(sum(case when mm.movement_type = 'material_usage' then mm.quantity else 0 end), 0)::numeric as used,
    coalesce(sum(case when mm.movement_type = 'material_purchase' then mm.quantity when mm.movement_type = 'material_usage' then -mm.quantity else 0 end), 0)::numeric as balance,
    coalesce(sum(case when mm.movement_type = 'material_purchase' then mm.total_cost_etb else 0 end), 0)::numeric as total_cost_etb
  from public.material_movements mm
  where mm.organization_id = p_organization_id and mm.archived_at is null
  group by mm.item_key
  order by mm.item_key;
$$;

create or replace function public.validate_material_usage(p_organization_id uuid, p_item_key text, p_quantity numeric, p_excluding_entry_id uuid default null)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_available numeric;
begin
  select coalesce(sum(case when movement_type = 'material_purchase' then quantity when movement_type = 'material_usage' then -quantity else 0 end), 0)
    into v_available
  from public.material_movements
  where organization_id = p_organization_id
    and item_key = p_item_key
    and archived_at is null
    and (p_excluding_entry_id is null or material_register_entry_id <> p_excluding_entry_id);

  if p_quantity > coalesce(v_available, 0) then
    raise exception 'Requested material usage exceeds available balance';
  end if;
end;
$$;

create or replace function public.log_demo_action(p_org uuid, p_action text, p_table text, p_id uuid, p_description text, p_reason text default null, p_changes jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (p_org, auth.uid(), true, p_action, p_table, p_id, p_description, p_reason, p_changes);
$$;

create or replace function public.create_bag_receipt(p_payload jsonb)
returns public.bag_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.bag_receipts;
begin
  if coalesce((p_payload->>'bags_received')::numeric, 0) <= 0 then
    raise exception 'Bags received must be greater than zero';
  end if;

  insert into public.bag_receipts (
    organization_id, supplier_id, purchase_record_id, warehouse_receipt_id, base44_id, receipt_mode,
    agent_name, supplier_name, date, warehouse_received_kg, bags_received, source, note, is_demo
  ) values (
    (p_payload->>'organization_id')::uuid, nullif(p_payload->>'supplier_id', '')::uuid,
    nullif(p_payload->>'purchase_record_id', '')::uuid, nullif(p_payload->>'warehouse_receipt_id', '')::uuid,
    p_payload->>'base44_id', coalesce(p_payload->>'receipt_mode', 'agent'),
    nullif(p_payload->>'agent_name', ''), nullif(p_payload->>'supplier_name', ''),
    (p_payload->>'date')::date, nullif(p_payload->>'warehouse_received_kg', '')::numeric,
    (p_payload->>'bags_received')::numeric, coalesce(p_payload->>'source', 'manual'), p_payload->>'note', coalesce((p_payload->>'is_demo')::boolean, true)
  ) returning * into v_record;

  perform public.log_demo_action(v_record.organization_id, 'Created', 'bag_receipts', v_record.id, 'Bag receipt ' || v_record.bags_received || ' bags');
  return v_record;
end;
$$;

create or replace function public.update_bag_receipt(p_bag_receipt_id uuid, p_payload jsonb)
returns public.bag_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.bag_receipts;
begin
  if coalesce((p_payload->>'bags_received')::numeric, 0) <= 0 then
    raise exception 'Bags received must be greater than zero';
  end if;

  update public.bag_receipts
  set receipt_mode = coalesce(p_payload->>'receipt_mode', receipt_mode),
      agent_name = case when p_payload ? 'agent_name' then nullif(p_payload->>'agent_name', '') else agent_name end,
      supplier_name = case when p_payload ? 'supplier_name' then nullif(p_payload->>'supplier_name', '') else supplier_name end,
      date = coalesce(nullif(p_payload->>'date', '')::date, date),
      warehouse_received_kg = case when p_payload ? 'warehouse_received_kg' then nullif(p_payload->>'warehouse_received_kg', '')::numeric else warehouse_received_kg end,
      bags_received = (p_payload->>'bags_received')::numeric,
      source = coalesce(p_payload->>'source', source),
      note = case when p_payload ? 'note' then p_payload->>'note' else note end,
      updated_at = now()
  where id = p_bag_receipt_id and archived_at is null
  returning * into v_record;

  if v_record.id is null then raise exception 'Bag receipt not found'; end if;
  perform public.log_demo_action(v_record.organization_id, 'Edited', 'bag_receipts', v_record.id, 'Bag receipt updated');
  return v_record;
end;
$$;

create or replace function public.archive_bag_receipt(p_bag_receipt_id uuid, p_reason text default null)
returns public.bag_receipts
language plpgsql
security definer
set search_path = public
as $$
declare v_record public.bag_receipts;
begin
  update public.bag_receipts set archived_at = now(), updated_at = now() where id = p_bag_receipt_id and archived_at is null returning * into v_record;
  if v_record.id is null then raise exception 'Bag receipt not found'; end if;
  perform public.log_demo_action(v_record.organization_id, 'Archived', 'bag_receipts', v_record.id, 'Bag receipt archived', p_reason);
  return v_record;
end;
$$;

create or replace function public.restore_bag_receipt(p_bag_receipt_id uuid, p_reason text default null)
returns public.bag_receipts
language plpgsql
security definer
set search_path = public
as $$
declare v_record public.bag_receipts;
begin
  update public.bag_receipts set archived_at = null, updated_at = now() where id = p_bag_receipt_id returning * into v_record;
  if v_record.id is null then raise exception 'Bag receipt not found'; end if;
  perform public.log_demo_action(v_record.organization_id, 'Restored', 'bag_receipts', v_record.id, 'Bag receipt restored', p_reason);
  return v_record;
end;
$$;

create or replace function public.create_reject_bag_usage(p_payload jsonb)
returns public.reject_bag_usages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.reject_bag_usages;
  v_org uuid := (p_payload->>'organization_id')::uuid;
  v_mode text := coalesce(p_payload->>'reject_mode', 'agent');
  v_holder text := coalesce(nullif(p_payload->>'agent_name', ''), nullif(p_payload->>'supplier_name', ''));
  v_bags numeric := (p_payload->>'bags_used')::numeric;
  v_available numeric;
begin
  if coalesce(v_bags, 0) <= 0 then raise exception 'Bags used must be greater than zero'; end if;

  select coalesce(max(net_to_return), 0) into v_available
  from public.calculate_supplier_bag_balance(v_org)
  where holder_mode = v_mode and holder_name = v_holder;
  if v_bags > v_available then raise exception 'Reject bag usage exceeds available bags'; end if;

  insert into public.reject_bag_usages (organization_id, supplier_id, base44_id, reject_mode, agent_name, supplier_name, date, bags_used, amount_etb, note, is_demo)
  values (v_org, nullif(p_payload->>'supplier_id', '')::uuid, p_payload->>'base44_id', v_mode, nullif(p_payload->>'agent_name', ''), nullif(p_payload->>'supplier_name', ''), (p_payload->>'date')::date, v_bags, coalesce(nullif(p_payload->>'amount_etb', '')::numeric, v_bags * 153), p_payload->>'note', coalesce((p_payload->>'is_demo')::boolean, true))
  returning * into v_record;

  perform public.log_demo_action(v_record.organization_id, 'Created', 'reject_bag_usages', v_record.id, 'Reject bag usage ' || v_record.bags_used || ' bags');
  return v_record;
end;
$$;

create or replace function public.update_reject_bag_usage(p_reject_bag_usage_id uuid, p_payload jsonb)
returns public.reject_bag_usages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.reject_bag_usages;
  v_record public.reject_bag_usages;
  v_org uuid;
  v_mode text;
  v_holder text;
  v_bags numeric;
  v_available numeric;
begin
  select * into v_existing from public.reject_bag_usages where id = p_reject_bag_usage_id and archived_at is null;
  if v_existing.id is null then raise exception 'Reject bag usage not found'; end if;
  v_org := v_existing.organization_id;
  v_mode := coalesce(p_payload->>'reject_mode', v_existing.reject_mode);
  v_holder := coalesce(nullif(p_payload->>'agent_name', ''), nullif(p_payload->>'supplier_name', ''), public.bag_holder_name(v_existing.agent_name, v_existing.supplier_name));
  v_bags := coalesce(nullif(p_payload->>'bags_used', '')::numeric, v_existing.bags_used);
  if v_bags <= 0 then raise exception 'Bags used must be greater than zero'; end if;

  select coalesce(max(net_to_return), 0) + v_existing.bags_used into v_available
  from public.calculate_supplier_bag_balance(v_org)
  where holder_mode = v_mode and holder_name = v_holder;
  if v_bags > v_available then raise exception 'Reject bag usage exceeds available bags'; end if;

  update public.reject_bag_usages
  set reject_mode = v_mode, agent_name = case when v_mode = 'agent' then v_holder else null end,
      supplier_name = case when v_mode = 'supplier' then v_holder else null end,
      date = coalesce(nullif(p_payload->>'date', '')::date, date),
      bags_used = v_bags,
      amount_etb = coalesce(nullif(p_payload->>'amount_etb', '')::numeric, v_bags * 153),
      note = case when p_payload ? 'note' then p_payload->>'note' else note end,
      updated_at = now()
  where id = p_reject_bag_usage_id
  returning * into v_record;
  perform public.log_demo_action(v_record.organization_id, 'Edited', 'reject_bag_usages', v_record.id, 'Reject bag usage updated');
  return v_record;
end;
$$;

create or replace function public.archive_reject_bag_usage(p_reject_bag_usage_id uuid, p_reason text default null)
returns public.reject_bag_usages
language plpgsql security definer set search_path = public as $$
declare v_record public.reject_bag_usages;
begin
  update public.reject_bag_usages set archived_at = now(), updated_at = now() where id = p_reject_bag_usage_id and archived_at is null returning * into v_record;
  if v_record.id is null then raise exception 'Reject bag usage not found'; end if;
  perform public.log_demo_action(v_record.organization_id, 'Archived', 'reject_bag_usages', v_record.id, 'Reject bag usage archived', p_reason);
  return v_record;
end; $$;

create or replace function public.restore_reject_bag_usage(p_reject_bag_usage_id uuid, p_reason text default null)
returns public.reject_bag_usages
language plpgsql security definer set search_path = public as $$
declare v_record public.reject_bag_usages;
begin
  select * into v_record from public.reject_bag_usages where id = p_reject_bag_usage_id;
  if v_record.id is null then raise exception 'Reject bag usage not found'; end if;
  perform public.create_reject_bag_usage(to_jsonb(v_record) - 'id' - 'created_at' - 'updated_at' - 'archived_at');
  update public.reject_bag_usages set archived_at = null, updated_at = now() where id = p_reject_bag_usage_id returning * into v_record;
  delete from public.reject_bag_usages where id <> p_reject_bag_usage_id and created_at = (select max(created_at) from public.reject_bag_usages);
  perform public.log_demo_action(v_record.organization_id, 'Restored', 'reject_bag_usages', v_record.id, 'Reject bag usage restored', p_reason);
  return v_record;
end; $$;

create or replace function public.create_supplier_bag_return(p_payload jsonb)
returns public.supplier_bag_returns
language plpgsql security definer set search_path = public as $$
declare
  v_record public.supplier_bag_returns;
  v_org uuid := (p_payload->>'organization_id')::uuid;
  v_mode text := public.bag_holder_mode(nullif(p_payload->>'agent_name', ''), nullif(p_payload->>'supplier_name', ''));
  v_holder text := public.bag_holder_name(p_payload->>'agent_name', p_payload->>'supplier_name');
  v_bags numeric := (p_payload->>'bags_returned')::numeric;
  v_remaining numeric;
begin
  if coalesce(v_bags, 0) <= 0 then raise exception 'Bags returned must be greater than zero'; end if;
  select coalesce(max(bags_remaining_to_return), 0) into v_remaining from public.calculate_supplier_bag_balance(v_org) where holder_mode = v_mode and holder_name = v_holder;
  if v_bags > v_remaining then raise exception 'Supplier bag return exceeds remaining bags'; end if;
  insert into public.supplier_bag_returns (organization_id, supplier_id, base44_id, agent_name, supplier_name, return_date, bags_returned, note, is_demo)
  values (v_org, nullif(p_payload->>'supplier_id', '')::uuid, p_payload->>'base44_id', nullif(p_payload->>'agent_name', ''), nullif(p_payload->>'supplier_name', ''), (p_payload->>'return_date')::date, v_bags, p_payload->>'note', coalesce((p_payload->>'is_demo')::boolean, true))
  returning * into v_record;
  perform public.log_demo_action(v_record.organization_id, 'Created', 'supplier_bag_returns', v_record.id, 'Supplier bag return ' || v_record.bags_returned || ' bags');
  return v_record;
end; $$;

create or replace function public.record_supplier_bag_payment(p_payload jsonb)
returns public.supplier_bag_payments
language plpgsql security definer set search_path = public as $$
declare
  v_record public.supplier_bag_payments;
  v_org uuid := (p_payload->>'organization_id')::uuid;
  v_mode text := public.bag_holder_mode(nullif(p_payload->>'agent_name', ''), nullif(p_payload->>'supplier_name', ''));
  v_holder text := public.bag_holder_name(p_payload->>'agent_name', p_payload->>'supplier_name');
  v_amount numeric := (p_payload->>'amount_etb')::numeric;
  v_remaining numeric;
begin
  if coalesce(v_amount, 0) <= 0 then raise exception 'Bag payment amount must be greater than zero'; end if;
  select coalesce(max(cash_remaining_etb), 0) into v_remaining from public.calculate_supplier_bag_balance(v_org) where holder_mode = v_mode and holder_name = v_holder;
  if v_amount > v_remaining + 0.001 then raise exception 'Supplier bag payment exceeds remaining cash balance'; end if;
  insert into public.supplier_bag_payments (organization_id, supplier_id, base44_id, agent_name, supplier_name, payment_date, bank_name, branch_account, reference_no, payment_type, amount_etb, note, is_demo)
  values (v_org, nullif(p_payload->>'supplier_id', '')::uuid, p_payload->>'base44_id', nullif(p_payload->>'agent_name', ''), nullif(p_payload->>'supplier_name', ''), (p_payload->>'payment_date')::date, p_payload->>'bank_name', p_payload->>'branch_account', p_payload->>'reference_no', p_payload->>'payment_type', v_amount, p_payload->>'note', coalesce((p_payload->>'is_demo')::boolean, true))
  returning * into v_record;
  perform public.log_demo_action(v_record.organization_id, 'Created', 'supplier_bag_payments', v_record.id, 'Supplier bag payment ' || v_record.amount_etb || ' ETB');
  return v_record;
end; $$;

create or replace function public.create_supplier_bag_settlement(p_payload jsonb)
returns public.supplier_bag_settlements
language plpgsql security definer set search_path = public as $$
declare v_record public.supplier_bag_settlements;
begin
  insert into public.supplier_bag_settlements (
    organization_id, supplier_id, base44_id, agent_name, supplier_name, settlement_date,
    bags_received_adjustment, bags_used_adjustment, loss_percent_override,
    bags_returned, bags_returned_date, bags_returned_count, bags_returned_note,
    cash_paid, cash_paid_date, note, is_demo
  ) values (
    (p_payload->>'organization_id')::uuid, nullif(p_payload->>'supplier_id', '')::uuid, p_payload->>'base44_id',
    nullif(p_payload->>'agent_name', ''), nullif(p_payload->>'supplier_name', ''),
    coalesce(nullif(p_payload->>'settlement_date', '')::date, current_date),
    coalesce(nullif(p_payload->>'bags_received_adjustment', '')::numeric, 0),
    coalesce(nullif(p_payload->>'bags_used_adjustment', '')::numeric, 0),
    nullif(p_payload->>'loss_percent_override', '')::numeric,
    coalesce((p_payload->>'bags_returned')::boolean, false),
    nullif(p_payload->>'bags_returned_date', '')::date,
    nullif(p_payload->>'bags_returned_count', '')::numeric,
    p_payload->>'bags_returned_note',
    coalesce((p_payload->>'cash_paid')::boolean, false),
    nullif(p_payload->>'cash_paid_date', '')::date,
    p_payload->>'note',
    coalesce((p_payload->>'is_demo')::boolean, true)
  ) returning * into v_record;
  perform public.log_demo_action(v_record.organization_id, 'Created', 'supplier_bag_settlements', v_record.id, 'Supplier bag settlement');
  return v_record;
end; $$;

create or replace function public.create_material_register_entry(p_payload jsonb)
returns public.material_register_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.material_register_entries;
  v_item_key text;
  v_quantity numeric := (p_payload->>'quantity')::numeric;
  v_entry_type text := p_payload->>'entry_type';
  v_total numeric;
begin
  if coalesce(v_quantity, 0) <= 0 then raise exception 'Material quantity must be greater than zero'; end if;
  v_item_key := public.material_item_key(p_payload->>'item_type', p_payload->>'bag_size', p_payload->>'item_name');
  if v_item_key is null then raise exception 'Material item is required'; end if;
  v_total := coalesce(nullif(p_payload->>'total_cost_etb', '')::numeric, v_quantity * coalesce(nullif(p_payload->>'unit_cost_etb', '')::numeric, 0));

  if coalesce(p_payload->>'category', 'general') = 'export' and v_entry_type = 'Usage' then
    perform public.validate_material_usage((p_payload->>'organization_id')::uuid, v_item_key, v_quantity);
  end if;

  insert into public.material_register_entries (
    organization_id, export_contract_id, base44_id, category, date, item_type, bag_size, entry_type,
    item_name, quantity, unit_cost_etb, total_cost_etb, purpose, note, is_demo
  ) values (
    (p_payload->>'organization_id')::uuid, nullif(p_payload->>'export_contract_id', '')::uuid, p_payload->>'base44_id',
    coalesce(p_payload->>'category', 'general'), (p_payload->>'date')::date, p_payload->>'item_type',
    p_payload->>'bag_size', v_entry_type, p_payload->>'item_name', v_quantity,
    nullif(p_payload->>'unit_cost_etb', '')::numeric, v_total, p_payload->>'purpose', p_payload->>'note',
    coalesce((p_payload->>'is_demo')::boolean, true)
  ) returning * into v_record;

  if v_record.category = 'export' then
    insert into public.material_movements (
      organization_id, material_register_entry_id, export_contract_id, item_key, movement_type,
      quantity, unit_cost_etb, total_cost_etb, occurred_at, notes, is_demo
    ) values (
      v_record.organization_id, v_record.id, v_record.export_contract_id, v_item_key,
      case when v_record.entry_type = 'Purchase' then 'material_purchase' else 'material_usage' end,
      v_record.quantity, v_record.unit_cost_etb, v_record.total_cost_etb, v_record.date::timestamptz, v_record.note, v_record.is_demo
    );
  end if;

  perform public.log_demo_action(v_record.organization_id, 'Created', 'material_register_entries', v_record.id, 'Material register entry ' || v_item_key);
  return v_record;
end;
$$;

create or replace function public.update_material_register_entry(p_material_register_entry_id uuid, p_payload jsonb)
returns public.material_register_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.material_register_entries;
  v_record public.material_register_entries;
  v_item_key text;
  v_quantity numeric;
  v_entry_type text;
  v_total numeric;
begin
  select * into v_existing from public.material_register_entries where id = p_material_register_entry_id and archived_at is null;
  if v_existing.id is null then raise exception 'Material register entry not found'; end if;
  v_quantity := coalesce(nullif(p_payload->>'quantity', '')::numeric, v_existing.quantity);
  if v_quantity <= 0 then raise exception 'Material quantity must be greater than zero'; end if;
  v_entry_type := coalesce(p_payload->>'entry_type', v_existing.entry_type);
  v_item_key := public.material_item_key(coalesce(p_payload->>'item_type', v_existing.item_type), coalesce(p_payload->>'bag_size', v_existing.bag_size), coalesce(p_payload->>'item_name', v_existing.item_name));
  v_total := coalesce(nullif(p_payload->>'total_cost_etb', '')::numeric, v_quantity * coalesce(nullif(p_payload->>'unit_cost_etb', '')::numeric, v_existing.unit_cost_etb, 0));

  if coalesce(p_payload->>'category', v_existing.category) = 'export' and v_entry_type = 'Usage' then
    perform public.validate_material_usage(v_existing.organization_id, v_item_key, v_quantity, p_material_register_entry_id);
  end if;

  update public.material_register_entries
  set export_contract_id = case when p_payload ? 'export_contract_id' then nullif(p_payload->>'export_contract_id', '')::uuid else export_contract_id end,
      category = coalesce(p_payload->>'category', category),
      date = coalesce(nullif(p_payload->>'date', '')::date, date),
      item_type = case when p_payload ? 'item_type' then p_payload->>'item_type' else item_type end,
      bag_size = case when p_payload ? 'bag_size' then p_payload->>'bag_size' else bag_size end,
      entry_type = v_entry_type,
      item_name = case when p_payload ? 'item_name' then p_payload->>'item_name' else item_name end,
      quantity = v_quantity,
      unit_cost_etb = case when p_payload ? 'unit_cost_etb' then nullif(p_payload->>'unit_cost_etb', '')::numeric else unit_cost_etb end,
      total_cost_etb = v_total,
      purpose = case when p_payload ? 'purpose' then p_payload->>'purpose' else purpose end,
      note = case when p_payload ? 'note' then p_payload->>'note' else note end,
      updated_at = now()
  where id = p_material_register_entry_id returning * into v_record;

  update public.material_movements
  set archived_at = now()
  where material_register_entry_id = v_record.id and archived_at is null;

  if v_record.category = 'export' then
    insert into public.material_movements (organization_id, material_register_entry_id, export_contract_id, item_key, movement_type, quantity, unit_cost_etb, total_cost_etb, occurred_at, notes, is_demo)
    values (v_record.organization_id, v_record.id, v_record.export_contract_id, v_item_key, case when v_record.entry_type = 'Purchase' then 'material_purchase' else 'material_usage' end, v_record.quantity, v_record.unit_cost_etb, v_record.total_cost_etb, v_record.date::timestamptz, v_record.note, v_record.is_demo);
  end if;

  perform public.log_demo_action(v_record.organization_id, 'Edited', 'material_register_entries', v_record.id, 'Material register entry updated');
  return v_record;
end;
$$;

create or replace function public.archive_material_register_entry(p_material_register_entry_id uuid, p_reason text default null)
returns public.material_register_entries
language plpgsql security definer set search_path = public as $$
declare v_record public.material_register_entries;
begin
  update public.material_register_entries set archived_at = now(), updated_at = now() where id = p_material_register_entry_id and archived_at is null returning * into v_record;
  if v_record.id is null then raise exception 'Material register entry not found'; end if;
  update public.material_movements set archived_at = v_record.archived_at where material_register_entry_id = v_record.id and archived_at is null;
  perform public.log_demo_action(v_record.organization_id, 'Archived', 'material_register_entries', v_record.id, 'Material register entry archived', p_reason);
  return v_record;
end; $$;

create or replace function public.restore_material_register_entry(p_material_register_entry_id uuid, p_reason text default null)
returns public.material_register_entries
language plpgsql security definer set search_path = public as $$
declare
  v_record public.material_register_entries;
  v_item_key text;
begin
  select * into v_record from public.material_register_entries where id = p_material_register_entry_id;
  if v_record.id is null then raise exception 'Material register entry not found'; end if;
  v_item_key := public.material_item_key(v_record.item_type, v_record.bag_size, v_record.item_name);
  if v_record.category = 'export' and v_record.entry_type = 'Usage' then
    perform public.validate_material_usage(v_record.organization_id, v_item_key, v_record.quantity, v_record.id);
  end if;
  update public.material_register_entries set archived_at = null, updated_at = now() where id = p_material_register_entry_id returning * into v_record;
  update public.material_movements set archived_at = null where material_register_entry_id = v_record.id;
  perform public.log_demo_action(v_record.organization_id, 'Restored', 'material_register_entries', v_record.id, 'Material register entry restored', p_reason);
  return v_record;
end; $$;
