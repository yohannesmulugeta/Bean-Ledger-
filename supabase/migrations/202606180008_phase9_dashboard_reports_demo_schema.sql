create or replace view public.demo_dashboard_summary_v as
select
  o.id as organization_id,
  coalesce((select count(*) from public.suppliers s where s.organization_id = o.id and s.archived_at is null), 0)::numeric as active_supplier_count,
  coalesce((select count(*) from public.purchase_records p where p.organization_id = o.id and p.archived_at is null), 0)::numeric as active_purchase_count,
  coalesce((select sum(p.grand_total_etb) from public.purchase_records p where p.organization_id = o.id and p.archived_at is null), 0)::numeric as purchase_grand_total_etb,
  coalesce((select sum(p.total_paid_etb) from public.purchase_records p where p.organization_id = o.id and p.archived_at is null), 0)::numeric as purchase_paid_etb,
  coalesce((select sum(greatest(p.balance_etb, 0)) from public.purchase_records p where p.organization_id = o.id and p.archived_at is null), 0)::numeric as purchase_balance_etb,
  coalesce((select sum(wr.received_kg) from public.warehouse_receipts wr where wr.organization_id = o.id and wr.archived_at is null), 0)::numeric as warehouse_received_kg,
  coalesce((select sum(sl.sample_kg) from public.sample_logs sl where sl.organization_id = o.id and sl.archived_at is null), 0)::numeric as sample_kg,
  coalesce((select sum(pl.actual_weighed_kg) from public.processing_logs pl where pl.organization_id = o.id and pl.archived_at is null), 0)::numeric as processing_kg,
  coalesce((select sum(orpt.export_kg) from public.output_reports orpt where orpt.organization_id = o.id and orpt.archived_at is null), 0)::numeric as output_export_kg,
  coalesce((select sum(orpt.reject_kg) from public.output_reports orpt where orpt.organization_id = o.id and orpt.archived_at is null), 0)::numeric as output_reject_kg,
  coalesce((select count(*) from public.export_contracts ec where ec.organization_id = o.id and ec.archived_at is null), 0)::numeric as active_export_contract_count,
  coalesce((select sum(ec.total_export_value_etb) from public.export_contracts ec where ec.organization_id = o.id and ec.archived_at is null), 0)::numeric as export_value_etb,
  coalesce((select sum(ec.profit_etb) from public.export_contracts ec where ec.organization_id = o.id and ec.archived_at is null), 0)::numeric as export_profit_etb
from public.organizations o
where o.archived_at is null;

create or replace function public.get_demo_dashboard_summary(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(to_jsonb(s), '{}'::jsonb)
  from public.demo_dashboard_summary_v s
  where s.organization_id = p_organization_id;
$$;

create or replace function public.get_demo_report_snapshot(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'suppliers', coalesce((select jsonb_agg(to_jsonb(s) order by s.supplier_name) from public.suppliers s where s.organization_id = p_organization_id), '[]'::jsonb),
    'purchases', coalesce((select jsonb_agg(to_jsonb(p) order by p.purchase_date desc) from public.purchase_records p where p.organization_id = p_organization_id), '[]'::jsonb),
    'warehouseReceipts', coalesce((select jsonb_agg(to_jsonb(wr) order by wr.received_date desc) from public.warehouse_receipts wr where wr.organization_id = p_organization_id), '[]'::jsonb),
    'sampleLogs', coalesce((select jsonb_agg(to_jsonb(sl) order by sl.sample_date desc) from public.sample_logs sl where sl.organization_id = p_organization_id), '[]'::jsonb),
    'processingLogs', coalesce((select jsonb_agg(to_jsonb(pl) order by pl.processing_date desc) from public.processing_logs pl where pl.organization_id = p_organization_id), '[]'::jsonb),
    'outputReports', coalesce((select jsonb_agg(to_jsonb(orpt) order by orpt.start_date desc) from public.output_reports orpt where orpt.organization_id = p_organization_id), '[]'::jsonb),
    'exportContracts', coalesce((select jsonb_agg(to_jsonb(ec) order by ec.contract_date desc) from public.export_contracts ec where ec.organization_id = p_organization_id), '[]'::jsonb),
    'buyerInspections', coalesce((select jsonb_agg(to_jsonb(bi) order by bi.inspection_date desc) from public.buyer_inspections bi where bi.organization_id = p_organization_id), '[]'::jsonb),
    'bagBalances', coalesce((select jsonb_agg(to_jsonb(bb)) from public.calculate_supplier_bag_balance(p_organization_id) bb), '[]'::jsonb),
    'materialBalances', coalesce((select jsonb_agg(to_jsonb(mb)) from public.calculate_material_balance(p_organization_id) mb), '[]'::jsonb)
  );
$$;

create or replace function public.get_demo_audit_log_feed(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', al.id,
      'organization_id', al.organization_id,
      'profile_id', al.profile_id,
      'user_email', coalesce(p.email, 'demo@kkgt.local'),
      'action_type', al.action_type,
      'entity_table', al.entity_table,
      'entity_type', al.entity_table,
      'entity_id', al.entity_id,
      'screen_name', replace(initcap(replace(al.entity_table, '_', ' ')), ' ', ' '),
      'record_description', al.record_description,
      'reason', al.reason,
      'changes', al.changes,
      'is_demo', al.is_demo,
      'created_date', al.created_at,
      'created_at', al.created_at
    )
    order by al.created_at desc
  ), '[]'::jsonb)
  from public.audit_logs al
  left join public.profiles p on p.id = al.profile_id
  where al.organization_id = p_organization_id
    and al.archived_at is null;
$$;

create or replace function public.get_demo_archived_records_feed(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'suppliers', coalesce((select jsonb_agg(to_jsonb(s) order by s.archived_at desc) from public.suppliers s where s.organization_id = p_organization_id and s.archived_at is not null), '[]'::jsonb),
    'purchase_records', coalesce((select jsonb_agg(to_jsonb(p) order by p.archived_at desc) from public.purchase_records p where p.organization_id = p_organization_id and p.archived_at is not null), '[]'::jsonb),
    'warehouse_receipts', coalesce((select jsonb_agg(to_jsonb(wr) order by wr.archived_at desc) from public.warehouse_receipts wr where wr.organization_id = p_organization_id and wr.archived_at is not null), '[]'::jsonb),
    'sample_logs', coalesce((select jsonb_agg(to_jsonb(sl) order by sl.archived_at desc) from public.sample_logs sl where sl.organization_id = p_organization_id and sl.archived_at is not null), '[]'::jsonb),
    'processing_logs', coalesce((select jsonb_agg(to_jsonb(pl) order by pl.archived_at desc) from public.processing_logs pl where pl.organization_id = p_organization_id and pl.archived_at is not null), '[]'::jsonb),
    'output_reports', coalesce((select jsonb_agg(to_jsonb(orpt) order by orpt.archived_at desc) from public.output_reports orpt where orpt.organization_id = p_organization_id and orpt.archived_at is not null), '[]'::jsonb),
    'export_contracts', coalesce((select jsonb_agg(to_jsonb(ec) order by ec.archived_at desc) from public.export_contracts ec where ec.organization_id = p_organization_id and ec.archived_at is not null), '[]'::jsonb),
    'buyer_inspections', coalesce((select jsonb_agg(to_jsonb(bi) order by bi.archived_at desc) from public.buyer_inspections bi where bi.organization_id = p_organization_id and bi.archived_at is not null), '[]'::jsonb),
    'bag_receipts', coalesce((select jsonb_agg(to_jsonb(br) order by br.archived_at desc) from public.bag_receipts br where br.organization_id = p_organization_id and br.archived_at is not null), '[]'::jsonb),
    'material_register_entries', coalesce((select jsonb_agg(to_jsonb(mre) order by mre.archived_at desc) from public.material_register_entries mre where mre.organization_id = p_organization_id and mre.archived_at is not null), '[]'::jsonb)
  );
$$;
