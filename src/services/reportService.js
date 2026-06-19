import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { readDemoStore } from './demoStore';
import { purchaseService } from './purchaseService';
import { warehouseService } from './warehouseService';
import { sampleService } from './sampleService';
import { processingService } from './processingService';
import { outputService } from './outputService';
import { supplierService } from './supplierService';
import { exportService } from './exportService';
import { buyerInspectionService } from './buyerInspectionService';
import { bagService } from './bagService';
import { materialService } from './materialService';

export const REPORT_CACHE_KEYS = Object.freeze({
  snapshot: 'phase9-report-snapshot',
  activeSnapshot: 'phase9-active-report-snapshot',
  dataAuditSnapshot: 'phase9-data-audit-snapshot',
});

export const REPORT_QUERY_KEYS = Object.freeze({
  snapshot: ['phase9-report-snapshot'],
  activeSnapshot: ['phase9-active-report-snapshot'],
  dataAuditSnapshot: ['phase9-data-audit-snapshot'],
});

const byNewest = (field) => (a, b) => String(b[field] || b.created_at || '').localeCompare(String(a[field] || a.created_at || ''));
const active = (item) => !item.archived_at && item.archived !== true;

function withArchiveFlag(record) {
  return { ...record, archived: Boolean(record.archived_at) };
}

function decoratePurchase(record) {
  return {
    ...withArchiveFlag(record),
    created_date: record.created_date || record.created_at,
  };
}

function decorateReceipt(record) {
  return {
    ...withArchiveFlag(record),
    created_date: record.created_date || record.created_at,
    warehouse_received_net_kg: record.warehouse_received_net_kg ?? record.received_kg,
    net_dispatch_weight_kg: record.net_dispatch_weight_kg ?? record.dispatch_kg,
    grn_code: record.grn_code || record.receipt_number,
    remark: record.remark ?? record.notes,
  };
}

function decorateSample(record) {
  return {
    ...withArchiveFlag(record),
    created_date: record.created_date || record.created_at,
    sample_datetime: record.sample_datetime ? String(record.sample_datetime).slice(0, 16) : record.sample_datetime,
  };
}

function decorateProcessing(record) {
  return {
    ...withArchiveFlag(record),
    created_date: record.created_date || record.created_at,
    date: record.date || record.processing_date,
  };
}

function decorateOutput(record) {
  return {
    ...withArchiveFlag(record),
    created_date: record.created_date || record.created_at,
    date: record.date || record.start_date,
  };
}

function decorateExport(record) {
  return {
    ...withArchiveFlag(record),
    created_date: record.created_date || record.created_at,
    commodity: record.commodity || record.coffee_type,
    export_date: record.export_date || record.contract_date,
    usd_rate_etb: record.usd_rate_etb ?? record.contract_rate_etb,
    total_profit_etb: record.total_profit_etb ?? record.profit_etb,
  };
}

function decorateInspection(record) {
  return {
    ...withArchiveFlag(record),
    created_date: record.created_date || record.created_at,
    linked_contract_id: record.linked_contract_id || record.export_contract_id,
  };
}

function decorateSnapshot(raw = {}) {
  return {
    suppliers: (raw.suppliers || []).map(withArchiveFlag).sort((a, b) => String(a.supplier_name || '').localeCompare(String(b.supplier_name || ''))),
    purchases: (raw.purchases || raw.purchaseRecords || []).map(decoratePurchase).sort(byNewest('purchase_date')),
    receipts: (raw.warehouseReceipts || raw.receipts || []).map(decorateReceipt).sort(byNewest('received_date')),
    sampleLogs: (raw.sampleLogs || []).map(decorateSample).sort(byNewest('sample_date')),
    processingLogs: (raw.processingLogs || []).map(decorateProcessing).sort(byNewest('date')),
    outputReports: (raw.outputReports || []).map(decorateOutput).sort(byNewest('date')),
    exportContracts: (raw.exportContracts || []).map(decorateExport).sort(byNewest('export_date')),
    buyerInspections: (raw.buyerInspections || []).map(decorateInspection).sort(byNewest('inspection_date')),
    bagBalances: raw.bagBalances || [],
    materialBalances: raw.materialBalances || [],
  };
}

async function supabaseSnapshot() {
  const { data, error } = await supabase.rpc('get_demo_report_snapshot', {
    p_organization_id: DEMO_META.organizationId,
  });
  if (error) throw error;
  return decorateSnapshot(data || {});
}

async function serviceSnapshot({ includeArchived = true } = {}) {
  const [
    suppliers,
    purchases,
    receipts,
    sampleLogs,
    processingLogs,
    outputReports,
    exportContracts,
    buyerInspections,
    bagBalances,
    materialBalances,
  ] = await Promise.all([
    supplierService.list(),
    purchaseService.list(),
    warehouseService.listReceipts({ includeArchived }),
    sampleService.list({ includeArchived }),
    processingService.list({ includeArchived }),
    outputService.list({ includeArchived }),
    exportService.list({ includeArchived }),
    buyerInspectionService.list({ includeArchived }),
    bagService.summary(),
    materialService.balance(),
  ]);

  return decorateSnapshot({
    suppliers,
    purchases,
    warehouseReceipts: receipts,
    sampleLogs,
    processingLogs,
    outputReports,
    exportContracts,
    buyerInspections,
    bagBalances,
    materialBalances,
  });
}

export const reportService = {
  async snapshot() {
    if (isSupabaseConfigured) return supabaseSnapshot();
    return serviceSnapshot();
  },

  async activeSnapshot() {
    const snapshot = await reportService.snapshot();
    return {
      ...snapshot,
      suppliers: snapshot.suppliers.filter(active),
      purchases: snapshot.purchases.filter(active),
      receipts: snapshot.receipts.filter(active),
      sampleLogs: snapshot.sampleLogs.filter(active),
      processingLogs: snapshot.processingLogs.filter(active),
      outputReports: snapshot.outputReports.filter(active),
      exportContracts: snapshot.exportContracts.filter(active),
      buyerInspections: snapshot.buyerInspections.filter(active),
    };
  },

  async dataAuditSnapshot() {
    const snapshot = await reportService.snapshot();
    const store = readDemoStore();
    return {
      suppliers: snapshot.suppliers,
      purchases: snapshot.purchases,
      warehouseReceipts: snapshot.receipts,
      sampleLogs: snapshot.sampleLogs,
      processingLogs: snapshot.processingLogs,
      outputReports: snapshot.outputReports,
      exportContracts: snapshot.exportContracts,
      buyerInspections: snapshot.buyerInspections,
      bagReceipts: (store.bagReceipts || []).map(withArchiveFlag),
      rejectBagUsages: (store.rejectBagUsages || []).map(withArchiveFlag),
      supplierBagPayments: (store.supplierBagPayments || []).map(withArchiveFlag),
      supplierBagReturns: (store.supplierBagReturns || []).map(withArchiveFlag),
      materialEntries: (store.materialRegisterEntries || []).map(withArchiveFlag),
    };
  },
};

