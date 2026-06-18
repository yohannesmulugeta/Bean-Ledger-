import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { calculateOutputTotals } from '@/lib/processingOutputCalculations';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

function decorate(record) {
  return {
    ...record,
    archived: Boolean(record.archived_at),
    date: record.start_date || record.date,
  };
}

function payload(data) {
  return {
    organization_id: data.organization_id || DEMO_META.organizationId,
    processing_log_id: data.processing_log_id || null,
    entry_type: data.entry_type || 'Standard',
    start_date: data.start_date || data.date,
    end_date: data.end_date || data.start_date || data.date,
    supplier_name: data.supplier_name || null,
    coffee_type: data.coffee_type || null,
    total_kg_processed: Number(data.total_kg_processed || 0),
    export_bags: Number(data.export_bags || 0),
    reject_bags: Number(data.reject_bags || 0),
    export_status: data.export_status || 'Available for Export',
    registrar_name: data.registrar_name || null,
    remark: data.remark || null,
    reason: data.reason,
    is_demo: data.is_demo ?? true,
    base44_id: data.base44_id ?? null,
  };
}

export const outputService = {
  async list({ includeArchived = false } = {}) {
    if (isSupabaseConfigured) {
      let query = supabase.from('output_reports').select('*').order('start_date', { ascending: false });
      if (!includeArchived) query = query.is('archived_at', null);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(decorate);
    }
    return readDemoStore().outputReports
      .filter((item) => includeArchived || !item.archived_at)
      .map(decorate)
      .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
  },

  async get(id) {
    const records = await outputService.list({ includeArchived: true });
    return records.find((item) => item.id === id) || null;
  },

  async create(data) {
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_output_report', { p_payload: payload(data) });
      if (error) throw error;
      return decorate(created);
    }
    const store = readDemoStore();
    const processing = store.processingLogs.find((item) => item.id === data.processing_log_id);
    const totals = calculateOutputTotals(data);
    const timestamp = nowIso();
    const created = {
      id: createDemoId(),
      organization_id: processing?.organization_id || data.organization_id || DEMO_META.organizationId,
      processing_log_id: data.processing_log_id || null,
      supplier_id: processing?.supplier_id || data.supplier_id || null,
      base44_id: data.base44_id ?? null,
      is_demo: true,
      entry_type: data.entry_type || 'Standard',
      start_date: data.start_date || data.date || timestamp.slice(0, 10),
      end_date: data.end_date || data.start_date || data.date || timestamp.slice(0, 10),
      date: data.start_date || data.date || timestamp.slice(0, 10),
      supplier_name: processing?.supplier_name || data.supplier_name || '',
      coffee_type: processing?.coffee_type || data.coffee_type || '',
      total_kg_processed: Number(data.total_kg_processed || 0),
      export_bags: Number(data.export_bags || 0),
      reject_bags: Number(data.reject_bags || 0),
      ...totals,
      export_status: data.export_status || 'Available for Export',
      registrar_name: data.registrar_name || '',
      remark: data.remark || '',
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };
    store.outputReports.push(created);
    if (created.export_kg > 0) {
      store.stockMovements.push({ id: createDemoId(), organization_id: created.organization_id, supplier_id: created.supplier_id, source_type: 'output_report', source_id: created.id, movement_type: 'output_export', stock_pool: 'export_available', quantity_kg: created.export_kg, occurred_at: `${created.end_date}T18:00:00Z`, notes: 'Output export stock', is_demo: true, created_at: timestamp, archived_at: null });
    }
    if (created.reject_kg > 0) {
      store.stockMovements.push({ id: createDemoId(), organization_id: created.organization_id, supplier_id: created.supplier_id, source_type: 'output_report', source_id: created.id, movement_type: 'output_reject', stock_pool: 'reject_available', quantity_kg: created.reject_kg, occurred_at: `${created.end_date}T18:00:00Z`, notes: 'Output reject stock', is_demo: true, created_at: timestamp, archived_at: null });
    }
    writeDemoStore(store);
    return decorate(created);
  },

  async update(id, data) {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.rpc('update_output_report', { p_output_report_id: id, p_payload: payload(data) });
      if (error) throw error;
      return decorate(updated);
    }
    const store = readDemoStore();
    const index = store.outputReports.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Output report not found');
    const totals = calculateOutputTotals({
      total_kg_processed: data.total_kg_processed ?? store.outputReports[index].total_kg_processed,
      export_bags: data.export_bags ?? store.outputReports[index].export_bags,
      reject_bags: data.reject_bags ?? store.outputReports[index].reject_bags,
    });
    store.outputReports[index] = { ...store.outputReports[index], ...data, ...totals, updated_at: nowIso() };
    store.stockMovements = store.stockMovements.filter((item) => !(item.source_type === 'output_report' && item.source_id === id));
    const updated = store.outputReports[index];
    if (updated.export_kg > 0) store.stockMovements.push({ id: createDemoId(), organization_id: updated.organization_id, supplier_id: updated.supplier_id, source_type: 'output_report', source_id: updated.id, movement_type: 'output_export', stock_pool: 'export_available', quantity_kg: updated.export_kg, occurred_at: `${updated.end_date}T18:00:00Z`, notes: 'Updated output export stock', is_demo: true, created_at: nowIso(), archived_at: null });
    if (updated.reject_kg > 0) store.stockMovements.push({ id: createDemoId(), organization_id: updated.organization_id, supplier_id: updated.supplier_id, source_type: 'output_report', source_id: updated.id, movement_type: 'output_reject', stock_pool: 'reject_available', quantity_kg: updated.reject_kg, occurred_at: `${updated.end_date}T18:00:00Z`, notes: 'Updated output reject stock', is_demo: true, created_at: nowIso(), archived_at: null });
    writeDemoStore(store);
    return decorate(updated);
  },

  async archive(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('archive_output_report', { p_output_report_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const archivedAt = nowIso();
    const index = store.outputReports.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Output report not found');
    store.outputReports[index] = { ...store.outputReports[index], archived_at: archivedAt, archived: true, updated_at: archivedAt, archive_reason: reason };
    store.stockMovements = store.stockMovements.map((item) => item.source_type === 'output_report' && item.source_id === id ? { ...item, archived_at: archivedAt } : item);
    writeDemoStore(store);
    return decorate(store.outputReports[index]);
  },

  async restore(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('restore_output_report', { p_output_report_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const index = store.outputReports.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Output report not found');
    store.outputReports[index] = { ...store.outputReports[index], archived_at: null, archived: false, updated_at: nowIso(), restore_reason: reason };
    store.stockMovements = store.stockMovements.map((item) => item.source_type === 'output_report' && item.source_id === id ? { ...item, archived_at: null } : item);
    writeDemoStore(store);
    return decorate(store.outputReports[index]);
  },
};
