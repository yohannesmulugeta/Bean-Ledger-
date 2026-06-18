import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { calculateBatchVarianceKg } from '@/lib/processingOutputCalculations';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

function decorate(record) {
  return {
    ...record,
    archived: Boolean(record.archived_at),
    date: record.processing_date || record.date,
  };
}

function payload(data) {
  return {
    supplier_id: data.supplier_id,
    purchase_record_id: data.purchase_record_id || null,
    warehouse_receipt_id: data.warehouse_receipt_id || null,
    entry_type: data.entry_type || 'Standard',
    entry_mode: data.entry_mode || 'By KG',
    date: data.date || data.processing_date,
    coffee_type: data.coffee_type || null,
    coffee_code: data.coffee_code || null,
    bags_sent: data.bags_sent ?? null,
    kg_sent: data.kg_sent ?? null,
    actual_weighed_kg: Number(data.actual_weighed_kg || 0),
    batch_no: data.batch_no || null,
    remark: data.remark || null,
    reason: data.reason,
    is_demo: data.is_demo ?? true,
    base44_id: data.base44_id ?? null,
  };
}

function findSupplier(store, data) {
  return store.suppliers.find((supplier) => supplier.id === data.supplier_id || supplier.supplier_name === data.supplier_name);
}

export const processingService = {
  async list({ includeArchived = false } = {}) {
    if (isSupabaseConfigured) {
      let query = supabase.from('processing_logs').select('*').order('processing_date', { ascending: false });
      if (!includeArchived) query = query.is('archived_at', null);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(decorate);
    }
    return readDemoStore().processingLogs
      .filter((item) => includeArchived || !item.archived_at)
      .map(decorate)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  },

  async get(id) {
    const records = await processingService.list({ includeArchived: true });
    return records.find((item) => item.id === id) || null;
  },

  async create(data) {
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_processing_log', { p_payload: payload(data) });
      if (error) throw error;
      return decorate(created);
    }
    const store = readDemoStore();
    const supplier = findSupplier(store, data);
    if (!supplier) throw new Error('Supplier not found');
    const actualKg = Number(data.actual_weighed_kg || 0);
    if (actualKg <= 0) throw new Error('KG must be greater than zero');
    const timestamp = nowIso();
    const created = {
      id: createDemoId(),
      organization_id: supplier.organization_id || DEMO_META.organizationId,
      supplier_id: supplier.id,
      purchase_record_id: data.purchase_record_id || null,
      warehouse_receipt_id: data.warehouse_receipt_id || null,
      base44_id: data.base44_id ?? null,
      is_demo: true,
      entry_type: data.entry_type || 'Standard',
      entry_mode: data.entry_mode || 'By KG',
      date: data.date || timestamp.slice(0, 10),
      processing_date: data.date || timestamp.slice(0, 10),
      supplier_name: supplier.supplier_name,
      coffee_type: data.coffee_type || supplier.coffee_type,
      coffee_code: data.coffee_code || null,
      bags_sent: data.bags_sent ?? null,
      kg_sent: data.kg_sent ?? (data.bags_sent ? Number(data.bags_sent) * 85 : null),
      actual_weighed_kg: actualKg,
      batch_variance_kg: calculateBatchVarianceKg({ bags_sent: data.bags_sent, actual_weighed_kg: actualKg }),
      batch_no: data.batch_no || '',
      remark: data.remark || '',
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };
    store.processingLogs.push(created);
    store.stockMovements.push({
      id: createDemoId(),
      organization_id: created.organization_id,
      supplier_id: created.supplier_id,
      purchase_record_id: created.purchase_record_id,
      warehouse_receipt_id: created.warehouse_receipt_id,
      source_type: 'processing_log',
      source_id: created.id,
      movement_type: 'processing_deduction',
      stock_pool: 'supplier_available',
      quantity_kg: actualKg,
      occurred_at: `${created.date}T08:00:00Z`,
      notes: 'Processing deduction',
      is_demo: true,
      created_at: timestamp,
      archived_at: null,
    });
    writeDemoStore(store);
    return decorate(created);
  },

  async update(id, data) {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.rpc('update_processing_log', { p_processing_log_id: id, p_payload: payload(data) });
      if (error) throw error;
      return decorate(updated);
    }
    const store = readDemoStore();
    const index = store.processingLogs.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Processing log not found');
    const actualKg = Number(data.actual_weighed_kg ?? store.processingLogs[index].actual_weighed_kg);
    if (actualKg <= 0) throw new Error('KG must be greater than zero');
    store.processingLogs[index] = { ...store.processingLogs[index], ...data, actual_weighed_kg: actualKg, updated_at: nowIso() };
    const movement = store.stockMovements.find((item) => item.source_type === 'processing_log' && item.source_id === id);
    if (movement) movement.quantity_kg = actualKg;
    writeDemoStore(store);
    return decorate(store.processingLogs[index]);
  },

  async archive(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('archive_processing_log', { p_processing_log_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const archivedAt = nowIso();
    const index = store.processingLogs.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Processing log not found');
    store.processingLogs[index] = { ...store.processingLogs[index], archived_at: archivedAt, archived: true, updated_at: archivedAt, archive_reason: reason };
    store.stockMovements = store.stockMovements.map((item) => item.source_type === 'processing_log' && item.source_id === id ? { ...item, archived_at: archivedAt } : item);
    writeDemoStore(store);
    return decorate(store.processingLogs[index]);
  },

  async restore(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('restore_processing_log', { p_processing_log_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const index = store.processingLogs.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Processing log not found');
    store.processingLogs[index] = { ...store.processingLogs[index], archived_at: null, archived: false, updated_at: nowIso(), restore_reason: reason };
    store.stockMovements = store.stockMovements.map((item) => item.source_type === 'processing_log' && item.source_id === id ? { ...item, archived_at: null } : item);
    writeDemoStore(store);
    return decorate(store.processingLogs[index]);
  },
};
