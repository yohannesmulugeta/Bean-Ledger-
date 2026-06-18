import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { reportService } from './reportService';

const sum = (rows, pick) => rows.reduce((total, row) => total + Number(pick(row) || 0), 0);
const active = (row) => !row.archived_at && row.archived !== true;

function calculateLocalSummary(snapshot) {
  const purchases = snapshot.purchases.filter(active);
  const receipts = snapshot.receipts.filter(active);
  const samples = snapshot.sampleLogs.filter(active);
  const processing = snapshot.processingLogs.filter(active);
  const outputs = snapshot.outputReports.filter(active);
  const contracts = snapshot.exportContracts.filter(active);

  return {
    organization_id: DEMO_META.organizationId,
    active_supplier_count: snapshot.suppliers.filter(active).length,
    active_purchase_count: purchases.length,
    purchase_grand_total_etb: sum(purchases, (row) => row.grand_total_etb),
    purchase_paid_etb: sum(purchases, (row) => row.total_paid_etb),
    purchase_balance_etb: sum(purchases, (row) => Math.max(0, Number(row.balance_etb || 0))),
    warehouse_received_kg: sum(receipts, (row) => row.warehouse_received_net_kg ?? row.received_kg),
    sample_kg: sum(samples, (row) => row.sample_kg),
    processing_kg: sum(processing, (row) => row.actual_weighed_kg ?? row.kg_sent),
    output_export_kg: sum(outputs, (row) => row.export_kg),
    output_reject_kg: sum(outputs, (row) => row.reject_kg),
    active_export_contract_count: contracts.length,
    export_value_etb: sum(contracts, (row) => row.total_export_value_etb),
    export_profit_etb: sum(contracts, (row) => row.profit_etb ?? row.total_profit_etb),
    bag_balances: snapshot.bagBalances,
    material_balances: snapshot.materialBalances,
  };
}

export const dashboardService = {
  async summary() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('get_demo_dashboard_summary', {
        p_organization_id: DEMO_META.organizationId,
      });
      if (error) throw error;
      return data || {};
    }
    return calculateLocalSummary(await reportService.snapshot());
  },
};

