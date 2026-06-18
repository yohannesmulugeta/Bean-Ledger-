import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { calculateExportContractTotals, parseJsonArray } from '@/lib/exportContractCalculations';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

function decorate(contract, children = {}) {
  const costs = children.costs || [];
  const materials = children.materials || [];
  const payments = children.payments || [];
  return {
    ...contract,
    archived: Boolean(contract.archived_at),
    usd_rate_etb: contract.contract_rate_etb ?? contract.usd_rate_etb,
    commodity: contract.coffee_type,
    export_date: contract.contract_date,
    cost_rows: contract.cost_rows ?? JSON.stringify(costs.map((row) => ({ name: row.name, amount_etb: row.amount_etb }))),
    material_rows: contract.material_rows ?? JSON.stringify(materials.map((row) => ({ name: row.name, quantity: row.quantity, unit_cost_etb: row.unit_cost_etb }))),
    payment_history: contract.payment_history ?? JSON.stringify(payments.map((row) => ({
      payment_date: row.payment_date,
      amount_usd: row.amount_usd,
      actual_rate_etb: row.actual_rate_etb,
      amount_etb: row.amount_etb,
      bank_name: row.bank_name,
      reference_no: row.reference_no,
      note: row.note,
    }))),
  };
}

function normalizePayload(data) {
  const exportBags = Number(data.export_bags ?? (data.export_kg ? Math.floor(Number(data.export_kg) / 60) : 0));
  return {
    organization_id: data.organization_id || DEMO_META.organizationId,
    output_report_id: data.output_report_id || null,
    supplier_id: data.supplier_id || null,
    contract_no: data.contract_no,
    contract_pi_number: data.contract_pi_number || null,
    certificate_no: data.certificate_no || null,
    contract_date: data.contract_date || data.export_date,
    stock_pool: data.stock_pool || 'Fresh',
    coffee_type: data.coffee_type || data.commodity,
    coffee_grade: data.coffee_grade || null,
    destination_country: data.destination_country || null,
    buyer_name: data.buyer_name || null,
    payment_terms: data.payment_terms || null,
    custom_payment_terms: data.custom_payment_terms || null,
    expected_payment_date: data.expected_payment_date || null,
    export_bags: exportBags,
    export_sample_kg: Number(data.export_sample_kg || 0),
    pricing_method: data.pricing_method || 'per_lb',
    price_per_lb_usd: data.price_per_lb_usd ?? null,
    price_per_kg_usd: data.price_per_kg_usd ?? null,
    contract_rate_etb: Number(data.contract_rate_etb ?? data.usd_rate_etb ?? 0),
    rate_status: data.rate_status || 'Rate Confirmed',
    rate_confirmed_date: data.rate_confirmed_date || null,
    reject_sales_etb: Number(data.reject_sales_etb ?? data.total_reject_sales_etb ?? 0),
    status: data.status || 'Pending',
    remark: data.remark || null,
    cost_rows: parseJsonArray(data.cost_rows),
    material_rows: parseJsonArray(data.material_rows),
    payment_history: parseJsonArray(data.payment_history),
    reason: data.reason,
    is_demo: data.is_demo ?? true,
    base44_id: data.base44_id ?? null,
  };
}

function calculateLocal(data) {
  return calculateExportContractTotals({
    export_bags: data.export_bags,
    export_sample_kg: data.export_sample_kg,
    pricing_method: data.pricing_method,
    price_per_lb_usd: data.price_per_lb_usd,
    price_per_kg_usd: data.price_per_kg_usd,
    contract_rate_etb: data.contract_rate_etb,
    costs: data.cost_rows,
    materials: data.material_rows,
    payments: data.payment_history,
    reject_sales_etb: data.reject_sales_etb,
  });
}

export const exportService = {
  async list({ includeArchived = false } = {}) {
    if (isSupabaseConfigured) {
      let query = supabase
        .from('export_contracts')
        .select('*, export_contract_costs(*), export_contract_materials(*), export_contract_payments(*)')
        .order('contract_date', { ascending: false });
      if (!includeArchived) query = query.is('archived_at', null);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row) => decorate(row, {
        costs: row.export_contract_costs || [],
        materials: row.export_contract_materials || [],
        payments: row.export_contract_payments || [],
      }));
    }
    return readDemoStore().exportContracts
      .filter((item) => includeArchived || !item.archived_at)
      .map((item) => decorate(item))
      .sort((a, b) => String(b.contract_date).localeCompare(String(a.contract_date)));
  },

  async get(id) {
    const contracts = await exportService.list({ includeArchived: true });
    return contracts.find((item) => item.id === id) || null;
  },

  async create(data) {
    const payload = normalizePayload(data);
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_export_contract', { p_payload: payload });
      if (error) throw error;
      return decorate(created);
    }
    const store = readDemoStore();
    if (store.exportContracts.some((item) => !item.archived_at && item.contract_no === payload.contract_no)) {
      throw new Error('Contract number already exists');
    }
    const totals = calculateLocal(payload);
    const timestamp = nowIso();
    const created = {
      id: createDemoId(),
      ...payload,
      ...totals,
      total_materials_etb: totals.total_materials_etb,
      grand_total_revenue_etb: totals.total_export_value_etb + payload.reject_sales_etb,
      total_received_usd: payload.payment_history.reduce((sum, row) => sum + Number(row.amount_usd || 0), 0),
      payment_status: totals.total_received_etb <= 0 ? 'Unpaid' : totals.total_received_etb + 1 >= totals.total_export_value_etb ? 'Fully Received' : 'Partial',
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
      cost_rows: JSON.stringify(payload.cost_rows),
      material_rows: JSON.stringify(payload.material_rows),
      payment_history: JSON.stringify(payload.payment_history),
    };
    store.exportContracts.push(created);
    store.stockMovements.push({
      id: createDemoId(),
      organization_id: created.organization_id,
      supplier_id: created.supplier_id,
      source_type: 'export_contract',
      source_id: created.id,
      movement_type: 'export_contract_deduction',
      stock_pool: created.stock_pool === 'Reject' ? 'reject_available' : 'export_available',
      coffee_type: created.coffee_type,
      quantity_kg: created.export_kg,
      occurred_at: `${created.contract_date}T08:00:00Z`,
      notes: 'Export contract stock deduction',
      is_demo: true,
      created_at: timestamp,
      archived_at: null,
    });
    writeDemoStore(store);
    return decorate(created);
  },

  async update(id, data) {
    const payload = normalizePayload(data);
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.rpc('update_export_contract', { p_export_contract_id: id, p_payload: payload });
      if (error) throw error;
      return decorate(updated);
    }
    const store = readDemoStore();
    const index = store.exportContracts.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Export contract not found');
    const totals = calculateLocal(payload);
    const updated = { ...store.exportContracts[index], ...payload, ...totals, updated_at: nowIso(), cost_rows: JSON.stringify(payload.cost_rows), material_rows: JSON.stringify(payload.material_rows), payment_history: JSON.stringify(payload.payment_history) };
    store.exportContracts[index] = updated;
    const movement = store.stockMovements.find((item) => item.source_type === 'export_contract' && item.source_id === id);
    if (movement) {
      movement.quantity_kg = updated.export_kg;
      movement.coffee_type = updated.coffee_type;
      movement.stock_pool = updated.stock_pool === 'Reject' ? 'reject_available' : 'export_available';
    }
    writeDemoStore(store);
    return decorate(updated);
  },

  async archive(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('archive_export_contract', { p_export_contract_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const archivedAt = nowIso();
    const index = store.exportContracts.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Export contract not found');
    store.exportContracts[index] = { ...store.exportContracts[index], archived_at: archivedAt, archived: true, archive_reason: reason };
    store.stockMovements = store.stockMovements.map((item) => item.source_type === 'export_contract' && item.source_id === id ? { ...item, archived_at: archivedAt } : item);
    writeDemoStore(store);
    return decorate(store.exportContracts[index]);
  },

  async recordPayments(id, rows = []) {
    const existing = await exportService.get(id);
    return exportService.update(id, { ...existing, payment_history: JSON.stringify(rows) });
  },
};
