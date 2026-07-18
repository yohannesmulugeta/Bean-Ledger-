import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();
const byNewest = (field) => (a, b) => String(b[field] || b.created_at || '').localeCompare(String(a[field] || a.created_at || ''));
const phase13Missing = (error) => ['42P01', 'PGRST202', 'PGRST204', 'PGRST205'].includes(error?.code);

function adjustmentPayload(data) {
  const quantityKg = Number(data.quantity_kg);
  if (!quantityKg) throw new Error('Adjustment KG cannot be zero');
  if (String(data.reason || '').trim().length < 3) throw new Error('Adjustment reason is required');
  if (data.target_type === 'supplier' && !data.supplier_id) throw new Error('Supplier is required');
  if (data.target_type !== 'supplier' && !data.coffee_type) throw new Error('Coffee type is required');
  return {
    organization_id: DEMO_META.organizationId,
    adjustment_no: data.adjustment_no,
    adjustment_date: data.adjustment_date,
    target_type: data.target_type,
    supplier_id: data.target_type === 'supplier' ? data.supplier_id : null,
    supplier_name: data.target_type === 'supplier' ? data.supplier_name : null,
    coffee_type: data.coffee_type || null,
    quantity_kg: quantityKg,
    reason: String(data.reason).trim(),
    notes: String(data.notes || '').trim() || null,
    is_demo: true,
  };
}

export const stockAdjustmentService = {
  async list() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('stock_adjustments').select('*').eq('organization_id', DEMO_META.organizationId).order('adjustment_date', { ascending: false });
      if (phase13Missing(error)) return [];
      if (error) throw error;
      return data || [];
    }
    return readDemoStore().stockAdjustments.sort(byNewest('adjustment_date'));
  },

  async create(data) {
    const payload = adjustmentPayload(data);
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_demo_stock_adjustment', { p_payload: payload });
      if (phase13Missing(error)) throw new Error('Run the Phase 13 Supabase migration before creating adjustments');
      if (error) throw error;
      return created;
    }
    const store = readDemoStore();
    if (store.stockAdjustments.some((row) => row.adjustment_no === payload.adjustment_no)) throw new Error('Adjustment number already exists');
    const timestamp = nowIso();
    const created = { id: createDemoId(), ...payload, status: 'approved', created_at: timestamp, updated_at: timestamp, archived_at: null };
    store.stockAdjustments.push(created);
    store.stockMovements.push({
      id: createDemoId(),
      organization_id: created.organization_id,
      supplier_id: created.supplier_id,
      source_type: 'stock_adjustment',
      source_id: created.id,
      movement_type: created.quantity_kg > 0 ? 'stock_adjustment' : 'stock_adjustment_deduction',
      stock_pool: created.target_type === 'supplier' ? 'supplier_available' : created.target_type === 'Reject' ? 'reject_available' : 'export_available',
      coffee_type: created.coffee_type,
      quantity_kg: Math.abs(created.quantity_kg),
      occurred_at: `${created.adjustment_date}T12:00:00Z`,
      notes: created.reason,
      is_demo: true,
      created_at: timestamp,
      archived_at: null,
    });
    writeDemoStore(store);
    return created;
  },

  async reverse(id, reason) {
    if (String(reason || '').trim().length < 3) throw new Error('Reversal reason is required');
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('reverse_demo_stock_adjustment', { p_adjustment_id: id, p_reason: reason });
      if (phase13Missing(error)) throw new Error('Run the Phase 13 Supabase migration before reversing adjustments');
      if (error) throw error;
      return data;
    }
    const store = readDemoStore();
    const index = store.stockAdjustments.findIndex((row) => row.id === id && row.status === 'approved');
    if (index < 0) throw new Error('Approved adjustment not found');
    const timestamp = nowIso();
    store.stockAdjustments[index] = { ...store.stockAdjustments[index], status: 'reversed', reversal_reason: reason, reversed_at: timestamp, updated_at: timestamp };
    store.stockMovements = store.stockMovements.map((row) => row.source_type === 'stock_adjustment' && row.source_id === id ? { ...row, archived_at: timestamp } : row);
    writeDemoStore(store);
    return store.stockAdjustments[index];
  },
};

export const yearCloseService = {
  async list() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('annual_reporting_periods').select('*').eq('organization_id', DEMO_META.organizationId).order('end_date', { ascending: false });
      if (phase13Missing(error)) return [];
      if (error) throw error;
      return data || [];
    }
    return readDemoStore().annualReportingPeriods.sort(byNewest('end_date'));
  },

  async close({ periodLabel, startDate, endDate, report }) {
    if (!periodLabel?.trim()) throw new Error('Period label is required');
    if (!startDate || !endDate || endDate < startDate) throw new Error('Enter a valid reporting period');
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('close_demo_reporting_period', {
        p_organization_id: DEMO_META.organizationId,
        p_period_label: periodLabel.trim(),
        p_start_date: startDate,
        p_end_date: endDate,
        p_snapshot: report,
        p_warnings: report.warnings,
        p_adjustment_ids: report.adjustmentIds,
      });
      if (phase13Missing(error)) throw new Error('Run the Phase 13 Supabase migration before closing a year');
      if (error) throw error;
      return data;
    }
    const store = readDemoStore();
    if (store.annualReportingPeriods.some((row) => row.start_date === startDate && row.end_date === endDate)) throw new Error('This reporting period is already closed');
    const timestamp = nowIso();
    const period = {
      id: createDemoId(), organization_id: DEMO_META.organizationId, period_label: periodLabel.trim(),
      start_date: startDate, end_date: endDate, status: 'closed', snapshot: report,
      warnings: report.warnings, closed_at: timestamp, is_demo: true, created_at: timestamp, updated_at: timestamp,
    };
    store.annualReportingPeriods.push(period);
    store.stockAdjustments.filter((row) => report.adjustmentIds.includes(row.id) && row.status === 'approved').forEach((row) => {
      store.yearEndStockAdjustments.push({
        id: createDemoId(), organization_id: DEMO_META.organizationId, annual_reporting_period_id: period.id,
        stock_adjustment_id: row.id, target_type: row.target_type, supplier_name: row.supplier_name,
        coffee_type: row.coffee_type, quantity_kg: row.quantity_kg, is_demo: true, created_at: timestamp,
      });
    });
    writeDemoStore(store);
    return period;
  },

  async reopen(id, reason) {
    if (String(reason || '').trim().length < 3) throw new Error('Reopen reason is required');
    const timestamp = nowIso();
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('annual_reporting_periods').update({ status: 'reopened', reopen_reason: reason, reopened_at: timestamp, updated_at: timestamp }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const store = readDemoStore();
    const index = store.annualReportingPeriods.findIndex((row) => row.id === id && row.status === 'closed');
    if (index < 0) throw new Error('Closed reporting period not found');
    store.annualReportingPeriods[index] = { ...store.annualReportingPeriods[index], status: 'reopened', reopen_reason: reason, reopened_at: timestamp, updated_at: timestamp };
    writeDemoStore(store);
    return store.annualReportingPeriods[index];
  },
};

export const backupExportService = {
  async list() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('backup_exports').select('*').eq('organization_id', DEMO_META.organizationId).order('created_at', { ascending: false }).limit(25);
      if (phase13Missing(error)) return [];
      if (error) throw error;
      return data || [];
    }
    return readDemoStore().backupExports.sort(byNewest('created_at')).slice(0, 25);
  },

  async log(record) {
    const payload = { organization_id: DEMO_META.organizationId, is_demo: true, ...record };
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('backup_exports').insert(payload).select().single();
      if (phase13Missing(error)) throw new Error('Backup downloaded, but run the Phase 13 migration to record export history');
      if (error) throw error;
      return data;
    }
    const store = readDemoStore();
    const created = { id: createDemoId(), ...payload, created_at: nowIso() };
    store.backupExports.push(created);
    writeDemoStore(store);
    return created;
  },
};
