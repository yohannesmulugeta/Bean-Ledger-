import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { calculatePurchaseTotals, ensureUniqueCoffeeCode, archiveRecord } from '@/lib/purchaseCalculations';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';
import { attachmentService } from './attachmentService';

const nowIso = () => new Date().toISOString();

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function childRows(store, purchaseId) {
  return {
    additionalCosts: store.additionalCosts.filter((item) => item.purchase_record_id === purchaseId && !item.archived_at),
    payments: store.payments.filter((item) => item.purchase_record_id === purchaseId && !item.archived_at),
  };
}

function decoratePurchase(record, store) {
  const { additionalCosts, payments } = childRows(store, record.id);
  const totals = calculatePurchaseTotals({
    net_dispatch_weight_kg: record.net_dispatch_weight_kg,
    warehouse_received_kg: record.warehouse_received_kg,
    unit_price_etb_per_feresula: record.unit_price_etb_per_feresula,
    commission_percent: record.commission_percent,
    additional_costs: additionalCosts,
    payments,
  });

  return {
    ...record,
    archived: Boolean(record.archived_at),
    net_feresula: totals.net_feresula,
    warehouse_feresula: totals.warehouse_feresula,
    total_purchase_price: totals.total_purchase_price_etb,
    total_purchase_price_etb: totals.total_purchase_price_etb,
    commission_etb: totals.commission_etb,
    other_cost_etb: totals.additional_costs_total_etb,
    grand_total_etb: totals.grand_total_etb,
    total_paid_etb: totals.total_paid_etb,
    balance_etb: totals.balance_etb,
    payment_status: totals.payment_status,
    additional_costs: JSON.stringify(additionalCosts.map((cost) => ({ name: cost.name, amount: cost.amount_etb }))),
    payment_history: JSON.stringify(payments.map((payment) => ({
      payment_no: payment.payment_no,
      payment_date: payment.payment_date,
      amount_etb: payment.amount_etb,
      bank_name: payment.bank_name,
      cpv_reference: payment.cpv_reference,
    }))),
  };
}

function normalizePurchase(data, suppliers, existing = {}) {
  const supplier = suppliers.find((item) => item.supplier_name === data.supplier_name || item.id === data.supplier_id);
  return {
    ...existing,
    organization_id: data.organization_id || existing.organization_id || DEMO_META.organizationId,
    supplier_id: data.supplier_id || supplier?.id || existing.supplier_id || null,
    base44_id: data.base44_id ?? existing.base44_id ?? null,
    is_demo: data.is_demo ?? existing.is_demo ?? true,
    coffee_code: String(data.coffee_code || existing.coffee_code || '').trim(),
    purchase_date: data.purchase_date || existing.purchase_date || null,
    supplier_name: String(data.supplier_name || supplier?.supplier_name || existing.supplier_name || '').trim(),
    agent: data.agent || supplier?.agent || existing.agent || '',
    region: data.region || supplier?.region || existing.region || '',
    coffee_type: data.coffee_type || supplier?.coffee_type || existing.coffee_type || '',
    net_dispatch_weight_kg: Number(data.net_dispatch_weight_kg ?? existing.net_dispatch_weight_kg ?? 0),
    warehouse_received_kg: Number(data.warehouse_received_kg ?? existing.warehouse_received_kg ?? data.net_dispatch_weight_kg ?? 0),
    unit_price_etb_per_feresula: Number(data.unit_price_etb_per_feresula ?? existing.unit_price_etb_per_feresula ?? 0),
    commission_percent: Number(data.commission_percent ?? existing.commission_percent ?? 0),
    remark: data.remark || existing.remark || '',
  };
}

function replaceChildren(store, purchaseId, data) {
  const timestamp = nowIso();
  const costs = parseJsonArray(data.additional_costs, [{ name: 'Transport', amount: data.other_cost_etb || 0 }])
    .map((cost) => ({
      id: createDemoId(),
      purchase_record_id: purchaseId,
      name: cost.name || 'Cost',
      amount_etb: Number(cost.amount_etb ?? cost.amount ?? 0),
      is_demo: true,
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    }));

  const payments = parseJsonArray(data.payment_history, [])
    .map((payment, index) => ({
      id: createDemoId(),
      purchase_record_id: purchaseId,
      payment_no: Number(payment.payment_no ?? index + 1),
      payment_date: payment.payment_date || timestamp.slice(0, 10),
      amount_etb: Number(payment.amount_etb ?? payment.amount ?? 0),
      bank_name: payment.bank_name || '',
      cpv_reference: payment.cpv_reference || '',
      is_demo: true,
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    }));

  store.additionalCosts = store.additionalCosts.filter((item) => item.purchase_record_id !== purchaseId);
  store.payments = store.payments.filter((item) => item.purchase_record_id !== purchaseId);
  store.additionalCosts.push(...costs);
  store.payments.push(...payments);
}

export const purchaseService = {
  async list() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('purchase_records')
        .select('*, purchase_additional_costs(*), purchase_payments(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((record) => {
        const storeLike = {
          additionalCosts: record.purchase_additional_costs || [],
          payments: record.purchase_payments || [],
        };
        return decoratePurchase(record, storeLike);
      });
    }

    const store = readDemoStore();
    return store.purchases
      .map((purchase) => decoratePurchase(purchase, store))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  },

  async create(data) {
    if (isSupabaseConfigured) {
      const costs = parseJsonArray(data.additional_costs, []);
      const payments = parseJsonArray(data.payment_history, []);
      const { data: created, error } = await supabase
        .from('purchase_records')
        .insert(normalizePurchase(data, []))
        .select()
        .single();
      if (error) throw error;
      if (costs.length > 0) {
        const { error: costError } = await supabase.from('purchase_additional_costs').insert(costs.map((cost) => ({
          purchase_record_id: created.id,
          name: cost.name || 'Cost',
          amount_etb: Number(cost.amount_etb ?? cost.amount ?? 0),
          is_demo: true,
        })));
        if (costError) throw costError;
      }
      if (payments.length > 0) {
        const { error: paymentError } = await supabase.from('purchase_payments').insert(payments.map((payment, index) => ({
          purchase_record_id: created.id,
          payment_no: Number(payment.payment_no ?? index + 1),
          payment_date: payment.payment_date,
          amount_etb: Number(payment.amount_etb ?? payment.amount ?? 0),
          bank_name: payment.bank_name || '',
          cpv_reference: payment.cpv_reference || '',
          is_demo: true,
        })));
        if (paymentError) throw paymentError;
      }
      const { data: recalculated, error: recalcError } = await supabase.rpc('recalculate_purchase_record', { p_purchase_record_id: created.id });
      if (recalcError) throw recalcError;
      return recalculated;
    }

    const store = readDemoStore();
    ensureUniqueCoffeeCode(store.purchases, data.coffee_code);
    const timestamp = nowIso();
    const purchase = {
      id: createDemoId(),
      ...normalizePurchase(data, store.suppliers),
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };
    store.purchases.push(purchase);
    replaceChildren(store, purchase.id, data);
    writeDemoStore(store);
    return decoratePurchase(purchase, store);
  },

  async update(id, data) {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase
        .from('purchase_records')
        .update(normalizePurchase(data, []))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      const { data: recalculated, error: recalcError } = await supabase.rpc('recalculate_purchase_record', { p_purchase_record_id: updated.id });
      if (recalcError) throw recalcError;
      return recalculated;
    }

    const store = readDemoStore();
    const index = store.purchases.findIndex((purchase) => purchase.id === id);
    if (index < 0) throw new Error('Purchase not found');
    ensureUniqueCoffeeCode(store.purchases, data.coffee_code, id);
    const updated = {
      ...normalizePurchase(data, store.suppliers, store.purchases[index]),
      id,
      updated_at: nowIso(),
    };
    store.purchases[index] = updated;
    replaceChildren(store, id, data);
    writeDemoStore(store);
    return decoratePurchase(updated, store);
  },

  async archive(id, reason = '') {
    const archivedAt = nowIso();
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('purchase_records')
        .update({ archived_at: archivedAt, archive_reason: reason, updated_at: archivedAt })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const store = readDemoStore();
    const index = store.purchases.findIndex((purchase) => purchase.id === id);
    if (index < 0) throw new Error('Purchase not found');
    store.purchases[index] = { ...archiveRecord(store.purchases[index], archivedAt), archive_reason: reason };
    writeDemoStore(store);
    return decoratePurchase(store.purchases[index], store);
  },

  async countCascade(purchase) {
    const store = readDemoStore();
    const { payments } = childRows(store, purchase.id);
    return {
      warehouseReceipts: 0,
      payments: payments.length,
      processingEntries: 0,
      sampleEntries: 0,
      bagReceiptEntries: 0,
      totalReceiptKg: 0,
      totalPaidEtb: payments.reduce((sum, payment) => sum + Number(payment.amount_etb || 0), 0),
    };
  },

  async listWarehouseReceipts() {
    if (!isSupabaseConfigured) {
      const store = readDemoStore();
      return store.purchases
        .filter((purchase) => !purchase.archived_at && purchase.warehouse_received_kg != null)
        .map((purchase) => ({
          id: `demo-receipt-${purchase.id}`,
          purchase_record_id: purchase.id,
          coffee_code: purchase.coffee_code,
          supplier_name: purchase.supplier_name,
          warehouse_received_net_kg: purchase.warehouse_received_kg,
          is_demo: true,
        }));
    }
    return [];
  },

  async listPurchaseAttachments() {
    return attachmentService.listForEntity('purchase_record', null);
  },
};
