import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { readDemoStore, writeDemoStore } from './demoStore';

const ENTITY_MAP = {
  Supplier: { table: 'suppliers', store: 'suppliers', restoreRpc: null },
  PurchaseRecord: { table: 'purchase_records', store: 'purchases', restoreRpc: null },
  WarehouseReceipt: { table: 'warehouse_receipts', store: 'warehouseReceipts', restoreRpc: 'restore_warehouse_receipt', arg: 'p_warehouse_receipt_id' },
  SampleLog: { table: 'sample_logs', store: 'sampleLogs', restoreRpc: 'restore_sample_log', arg: 'p_sample_log_id' },
  ProcessingLog: { table: 'processing_logs', store: 'processingLogs', restoreRpc: 'restore_processing_log', arg: 'p_processing_log_id' },
  OutputReport: { table: 'output_reports', store: 'outputReports', restoreRpc: 'restore_output_report', arg: 'p_output_report_id' },
  ExportContract: { table: 'export_contracts', store: 'exportContracts', restoreRpc: 'restore_export_contract', arg: 'p_export_contract_id' },
  BuyerInspection: { table: 'buyer_inspections', store: 'buyerInspections', restoreRpc: 'restore_buyer_inspection', arg: 'p_buyer_inspection_id' },
  BagReceipt: { table: 'bag_receipts', store: 'bagReceipts', restoreRpc: 'restore_bag_receipt', arg: 'p_bag_receipt_id' },
  MaterialRegisterEntry: { table: 'material_register_entries', store: 'materialRegisterEntries', restoreRpc: 'restore_material_register_entry', arg: 'p_material_register_entry_id' },
};

function decorate(record) {
  return { ...record, archived: Boolean(record.archived_at) };
}

function mapFor(entityName) {
  const mapping = ENTITY_MAP[entityName];
  if (!mapping) throw new Error(`Archived demo records are not wired for ${entityName}`);
  return mapping;
}

export const archiveService = {
  entityMap: ENTITY_MAP,

  async list(entityName) {
    const mapping = mapFor(entityName);
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('get_demo_archived_records_feed', {
        p_organization_id: DEMO_META.organizationId,
      });
      if (error) throw error;
      return (data?.[mapping.table] || []).map(decorate);
    }

    const store = readDemoStore();
    return (store[mapping.store] || [])
      .filter((record) => record.archived_at)
      .map(decorate)
      .sort((a, b) => String(b.archived_at || '').localeCompare(String(a.archived_at || '')));
  },

  async restore(entityName, record, reason = 'Demo restore') {
    const mapping = mapFor(entityName);
    if (isSupabaseConfigured && mapping.restoreRpc) {
      const args = { [mapping.arg]: record.id, p_reason: reason };
      const { data, error } = await supabase.rpc(mapping.restoreRpc, args);
      if (error) throw error;
      return decorate(data || record);
    }

    if (isSupabaseConfigured && !mapping.restoreRpc) {
      const { data, error } = await supabase
        .from(mapping.table)
        .update({ archived_at: null, updated_at: new Date().toISOString() })
        .eq('id', record.id)
        .select()
        .single();
      if (error) throw error;
      return decorate(data);
    }

    const store = readDemoStore();
    const rows = store[mapping.store] || [];
    const index = rows.findIndex((item) => item.id === record.id);
    if (index < 0) throw new Error('Archived record not found');
    rows[index] = {
      ...rows[index],
      archived_at: null,
      archived: false,
      archive_reason: null,
      updated_at: new Date().toISOString(),
    };
    store.auditLogs.push({
      id: `audit-restore-${record.id}-${Date.now()}`,
      organization_id: rows[index].organization_id || DEMO_META.organizationId,
      action_type: 'Restored',
      entity_table: mapping.table,
      entity_id: record.id,
      record_description: record.coffee_code || record.receipt_number || record.contract_no || record.id,
      reason,
      changes: { restored: true, demo: true },
      is_demo: true,
      created_at: new Date().toISOString(),
    });
    writeDemoStore(store);
    return decorate(rows[index]);
  },
};
