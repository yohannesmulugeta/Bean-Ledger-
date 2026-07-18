import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { readDemoStore } from './demoStore';

const TABLE_LABELS = {
  suppliers: 'Suppliers',
  purchase_records: 'Purchase Records',
  warehouse_receipts: 'Warehouse Receipts',
  sample_logs: 'Sample Logs',
  processing_logs: 'Processing Logs',
  output_reports: 'Output Reports',
  export_contracts: 'Export Contracts',
  buyer_inspections: 'Buyer Inspections',
  bag_receipts: 'Bag Receipts',
  material_register_entries: 'Material Register',
};

function normalizeLog(log) {
  const table = log.entity_table || log.entity_type || 'demo_records';
  return {
    ...log,
    user_email: log.user_email || 'admin@demo.local',
    entity_type: table,
    screen_name: log.screen_name || TABLE_LABELS[table] || table,
    created_date: log.created_date || log.created_at,
    changes: typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes || {}),
  };
}

function archivedRecordLogs(store) {
  const sources = [
    ['warehouse_receipts', store.warehouseReceipts, (row) => row.receipt_number || row.coffee_code],
    ['sample_logs', store.sampleLogs, (row) => row.supplier_name || row.coffee_code],
    ['processing_logs', store.processingLogs, (row) => row.batch_no || row.supplier_name],
    ['output_reports', store.outputReports, (row) => row.coffee_type || row.id],
    ['export_contracts', store.exportContracts, (row) => row.contract_no],
    ['bag_receipts', store.bagReceipts, (row) => `${row.bags_received} bags`],
    ['material_register_entries', store.materialRegisterEntries, (row) => row.item_name || row.item_type],
  ];

  return sources.flatMap(([table, rows, describe]) => (rows || [])
    .filter((row) => row.archived_at)
    .map((row) => normalizeLog({
      id: `audit-${table}-${row.id}`,
      organization_id: row.organization_id || DEMO_META.organizationId,
      action_type: 'Archived',
      entity_table: table,
      entity_id: row.id,
      record_description: describe(row),
      reason: row.archive_reason || row.notes || row.note || 'Archived during an approved record replacement',
      changes: { archived_at: row.archived_at, demo: true },
      is_demo: true,
      created_at: row.archived_at,
    })));
}

function seedLogs(store) {
  const manual = (store.auditLogs || []).map(normalizeLog);

  return [...manual, ...archivedRecordLogs(store)]
    .sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || '')));
}

export const auditService = {
  async list() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('get_demo_audit_log_feed', {
        p_organization_id: DEMO_META.organizationId,
      });
      if (error) throw error;
      return (data || []).map(normalizeLog);
    }
    return seedLogs(readDemoStore());
  },
};

