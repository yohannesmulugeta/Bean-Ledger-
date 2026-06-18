import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

function decorate(record) {
  return {
    ...record,
    archived: Boolean(record.archived_at),
    sample_datetime: record.sample_datetime ? String(record.sample_datetime).slice(0, 16) : record.sample_datetime,
  };
}

function payload(data) {
  return {
    supplier_id: data.supplier_id,
    purchase_record_id: data.purchase_record_id || null,
    warehouse_receipt_id: data.warehouse_receipt_id || null,
    sample_type: data.sample_type || 'Warehouse',
    coffee_type: data.coffee_type || null,
    coffee_code: data.coffee_code || null,
    sample_date: data.sample_date || data.sample_datetime?.slice(0, 10),
    sample_datetime: data.sample_datetime,
    sample_kg: Number(data.sample_kg || 0),
    company_recipient: data.company_recipient || null,
    keeper_name: data.keeper_name || null,
    remark: data.remark || null,
    reason: data.reason,
    is_demo: data.is_demo ?? true,
    base44_id: data.base44_id ?? null,
  };
}

function findSupplier(store, data) {
  return store.suppliers.find((supplier) => supplier.id === data.supplier_id || supplier.supplier_name === data.supplier_name);
}

export const sampleService = {
  async list({ includeArchived = false } = {}) {
    if (isSupabaseConfigured) {
      let query = supabase.from('sample_logs').select('*').order('sample_date', { ascending: false });
      if (!includeArchived) query = query.is('archived_at', null);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(decorate);
    }
    return readDemoStore().sampleLogs
      .filter((item) => includeArchived || !item.archived_at)
      .map(decorate)
      .sort((a, b) => String(b.sample_date).localeCompare(String(a.sample_date)));
  },

  async get(id) {
    const records = await sampleService.list({ includeArchived: true });
    return records.find((item) => item.id === id) || null;
  },

  async create(data) {
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_sample_log', { p_payload: payload(data) });
      if (error) throw error;
      return decorate(created);
    }

    const store = readDemoStore();
    const supplier = findSupplier(store, data);
    if (!supplier) throw new Error('Supplier not found');
    const kg = Number(data.sample_kg || 0);
    if (kg <= 0) throw new Error('KG must be greater than zero');
    const timestamp = nowIso();
    const created = {
      id: createDemoId(),
      organization_id: supplier.organization_id || DEMO_META.organizationId,
      supplier_id: supplier.id,
      purchase_record_id: data.purchase_record_id || null,
      warehouse_receipt_id: data.warehouse_receipt_id || null,
      base44_id: data.base44_id ?? null,
      is_demo: true,
      sample_type: data.sample_type || 'Warehouse',
      supplier_name: supplier.supplier_name,
      coffee_type: data.coffee_type || supplier.coffee_type,
      coffee_code: data.coffee_code || null,
      sample_date: data.sample_date || data.sample_datetime?.slice(0, 10) || timestamp.slice(0, 10),
      sample_datetime: data.sample_datetime || timestamp,
      sample_kg: kg,
      company_recipient: data.company_recipient || '',
      keeper_name: data.keeper_name || '',
      remark: data.remark || '',
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };
    store.sampleLogs.push(created);
    store.stockMovements.push({
      id: createDemoId(),
      organization_id: created.organization_id,
      supplier_id: created.supplier_id,
      purchase_record_id: created.purchase_record_id,
      warehouse_receipt_id: created.warehouse_receipt_id,
      source_type: 'sample_log',
      source_id: created.id,
      movement_type: 'sample_deduction',
      stock_pool: 'supplier_available',
      quantity_kg: kg,
      occurred_at: created.sample_datetime,
      notes: 'Sample deduction',
      is_demo: true,
      created_at: timestamp,
      archived_at: null,
    });
    writeDemoStore(store);
    return decorate(created);
  },

  async update(id, data) {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.rpc('update_sample_log', { p_sample_log_id: id, p_payload: payload(data) });
      if (error) throw error;
      return decorate(updated);
    }
    const store = readDemoStore();
    const index = store.sampleLogs.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Sample log not found');
    const kg = Number(data.sample_kg ?? store.sampleLogs[index].sample_kg);
    if (kg <= 0) throw new Error('KG must be greater than zero');
    store.sampleLogs[index] = { ...store.sampleLogs[index], ...data, sample_kg: kg, updated_at: nowIso() };
    const movement = store.stockMovements.find((item) => item.source_type === 'sample_log' && item.source_id === id);
    if (movement) movement.quantity_kg = kg;
    writeDemoStore(store);
    return decorate(store.sampleLogs[index]);
  },

  async archive(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('archive_sample_log', { p_sample_log_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const archivedAt = nowIso();
    const index = store.sampleLogs.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Sample log not found');
    store.sampleLogs[index] = { ...store.sampleLogs[index], archived_at: archivedAt, archived: true, updated_at: archivedAt, archive_reason: reason };
    store.stockMovements = store.stockMovements.map((item) => item.source_type === 'sample_log' && item.source_id === id ? { ...item, archived_at: archivedAt } : item);
    writeDemoStore(store);
    return decorate(store.sampleLogs[index]);
  },

  async restore(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('restore_sample_log', { p_sample_log_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const index = store.sampleLogs.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Sample log not found');
    store.sampleLogs[index] = { ...store.sampleLogs[index], archived_at: null, archived: false, updated_at: nowIso(), restore_reason: reason };
    store.stockMovements = store.stockMovements.map((item) => item.source_type === 'sample_log' && item.source_id === id ? { ...item, archived_at: null } : item);
    writeDemoStore(store);
    return decorate(store.sampleLogs[index]);
  },
};
