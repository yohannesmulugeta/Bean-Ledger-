-- The application authenticates its public showcase locally, so Supabase sees
-- those requests as anon. Expose only synthetic rows from the fixed demo tenant.
do $$
declare
  v_table text;
  v_policy text;
begin
  foreach v_table in array array[
    'warehouse_receipts',
    'warehouse_receipt_history',
    'stock_movements',
    'sample_logs',
    'processing_logs',
    'output_reports',
    'export_contracts',
    'export_contract_costs',
    'export_contract_materials',
    'export_contract_payments',
    'buyer_inspections',
    'bag_receipts',
    'reject_bag_usages',
    'supplier_bag_returns',
    'supplier_bag_payments',
    'supplier_bag_settlements',
    'material_register_entries',
    'material_movements',
    'attachments',
    'notification_preferences'
  ]
  loop
    v_policy := v_table || '_demo_anon_select';

    execute format('alter table public.%I enable row level security', v_table);
    execute format('grant select on table public.%I to anon', v_table);
    execute format('drop policy if exists %I on public.%I', v_policy, v_table);
    execute format(
      'create policy %I on public.%I for select to anon using (is_demo = true and organization_id = %L::uuid)',
      v_policy,
      v_table,
      '11111111-1111-4111-8111-111111111111'
    );
  end loop;
end $$;
