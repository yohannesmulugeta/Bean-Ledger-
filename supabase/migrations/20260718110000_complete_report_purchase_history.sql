create or replace function public.get_demo_report_snapshot(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'suppliers', coalesce((select jsonb_agg(to_jsonb(s) order by s.supplier_name) from public.suppliers s where s.organization_id = p_organization_id), '[]'::jsonb),
    'purchases', coalesce((
      select jsonb_agg(
        to_jsonb(p)
        || jsonb_build_object(
          'additional_costs', coalesce((
            select jsonb_agg(jsonb_build_object('name', c.name, 'amount', c.amount_etb) order by c.created_at)
            from public.purchase_additional_costs c
            where c.purchase_record_id = p.id and c.archived_at is null
          ), '[]'::jsonb),
          'payment_history', coalesce((
            select jsonb_agg(jsonb_build_object(
              'payment_no', pay.payment_no,
              'payment_date', pay.payment_date,
              'amount_etb', pay.amount_etb,
              'bank_name', pay.bank_name,
              'cpv_reference', pay.cpv_reference
            ) order by pay.payment_no)
            from public.purchase_payments pay
            where pay.purchase_record_id = p.id and pay.archived_at is null
          ), '[]'::jsonb)
        )
        order by p.purchase_date desc
      )
      from public.purchase_records p
      where p.organization_id = p_organization_id
    ), '[]'::jsonb),
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

grant execute on function public.get_demo_report_snapshot(uuid) to anon, authenticated;
