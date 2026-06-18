import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { calculateBagSummary, REJECT_BAG_PRICE_ETB } from '@/lib/bagMaterialCalculations';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

function cleanPayload(data) {
  return {
    organization_id: data.organization_id || DEMO_META.organizationId,
    supplier_id: data.supplier_id || null,
    purchase_record_id: data.purchase_record_id || null,
    warehouse_receipt_id: data.warehouse_receipt_id || null,
    base44_id: data.base44_id ?? null,
    receipt_mode: data.receipt_mode,
    reject_mode: data.reject_mode,
    agent_name: data.agent_name || null,
    supplier_name: data.supplier_name || null,
    date: data.date || data.return_date || data.payment_date || data.settlement_date,
    return_date: data.return_date,
    payment_date: data.payment_date,
    settlement_date: data.settlement_date,
    warehouse_received_kg: data.warehouse_received_kg ?? null,
    bags_received: data.bags_received !== undefined ? Number(data.bags_received) : undefined,
    bags_used: data.bags_used !== undefined ? Number(data.bags_used) : undefined,
    bags_returned: data.bags_returned !== undefined ? Number(data.bags_returned) : undefined,
    amount_etb: data.amount_etb !== undefined ? Number(data.amount_etb) : undefined,
    bank_name: data.bank_name || null,
    branch_account: data.branch_account || null,
    reference_no: data.reference_no || null,
    payment_type: data.payment_type || null,
    bags_received_adjustment: data.bags_received_adjustment ?? 0,
    bags_used_adjustment: data.bags_used_adjustment ?? 0,
    loss_percent_override: data.loss_percent_override ?? null,
    bags_returned_count: data.bags_returned_count ?? null,
    bags_returned_note: data.bags_returned_note || null,
    bags_returned_flag: data.bags_returned === true,
    cash_paid: data.cash_paid ?? false,
    cash_paid_date: data.cash_paid_date ?? null,
    source: data.source || 'manual',
    note: data.note || null,
    is_demo: data.is_demo ?? true,
  };
}

function active(items) {
  return (items || []).filter((item) => !item.archived_at && !item.archived);
}

function findBalance(store, mode, name) {
  return calculateBagSummary({
    receipts: store.bagReceipts,
    usages: store.rejectBagUsages,
    returns: store.supplierBagReturns,
    payments: store.supplierBagPayments,
    settlements: store.supplierBagSettlements,
  }).find((row) => row.holder_mode === mode && row.holder_name === name);
}

function holder(data, modeKey) {
  const mode = data[modeKey] || (data.agent_name ? 'agent' : 'supplier');
  const name = mode === 'agent' ? data.agent_name : data.supplier_name;
  return { mode, name };
}

function createLocalRecord(store, collection, payload) {
  const timestamp = nowIso();
  const record = { id: createDemoId(), ...payload, created_at: timestamp, updated_at: timestamp, archived_at: null };
  store[collection].push(record);
  store.auditLogs.push({ id: createDemoId(), organization_id: payload.organization_id, entity_table: collection, entity_id: record.id, action_type: 'Created', is_demo: true, created_at: timestamp });
  writeDemoStore(store);
  return record;
}

export const bagService = {
  async listReceipts() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('bag_receipts').select('*').is('archived_at', null).order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return active(readDemoStore().bagReceipts).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  },

  async listRejectUsages() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('reject_bag_usages').select('*').is('archived_at', null).order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return active(readDemoStore().rejectBagUsages).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  },

  async listReturns() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('supplier_bag_returns').select('*').is('archived_at', null).order('return_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return active(readDemoStore().supplierBagReturns).sort((a, b) => String(b.return_date).localeCompare(String(a.return_date)));
  },

  async listPayments() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('supplier_bag_payments').select('*').is('archived_at', null).order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return active(readDemoStore().supplierBagPayments).sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date)));
  },

  async listSettlements() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('supplier_bag_settlements').select('*').is('archived_at', null).order('settlement_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return active(readDemoStore().supplierBagSettlements);
  },

  async summary() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('calculate_supplier_bag_balance', { p_organization_id: DEMO_META.organizationId });
      if (error) throw error;
      return data || [];
    }
    const store = readDemoStore();
    return calculateBagSummary({
      receipts: store.bagReceipts,
      usages: store.rejectBagUsages,
      returns: store.supplierBagReturns,
      payments: store.supplierBagPayments,
      settlements: store.supplierBagSettlements,
    });
  },

  async createReceipt(data) {
    const payload = cleanPayload(data);
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_bag_receipt', { p_payload: payload });
      if (error) throw error;
      return created;
    }
    if (Number(payload.bags_received) <= 0) throw new Error('Bags received must be greater than zero');
    return createLocalRecord(readDemoStore(), 'bagReceipts', payload);
  },

  async updateReceipt(id, data) {
    const payload = cleanPayload(data);
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.rpc('update_bag_receipt', { p_bag_receipt_id: id, p_payload: payload });
      if (error) throw error;
      return updated;
    }
    const store = readDemoStore();
    const index = store.bagReceipts.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Bag receipt not found');
    store.bagReceipts[index] = { ...store.bagReceipts[index], ...payload, updated_at: nowIso() };
    writeDemoStore(store);
    return store.bagReceipts[index];
  },

  async archiveReceipt(id, reason = null) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('archive_bag_receipt', { p_bag_receipt_id: id, p_reason: reason });
      if (error) throw error;
      return data;
    }
    const store = readDemoStore();
    const index = store.bagReceipts.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Bag receipt not found');
    store.bagReceipts[index] = { ...store.bagReceipts[index], archived_at: nowIso(), archive_reason: reason };
    writeDemoStore(store);
    return store.bagReceipts[index];
  },

  async createRejectUsage(data) {
    const payload = cleanPayload({ ...data, amount_etb: data.amount_etb ?? Number(data.bags_used || 0) * REJECT_BAG_PRICE_ETB });
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_reject_bag_usage', { p_payload: payload });
      if (error) throw error;
      return created;
    }
    const store = readDemoStore();
    const { mode, name } = holder(payload, 'reject_mode');
    const balance = findBalance(store, mode, name);
    if (Number(payload.bags_used) <= 0) throw new Error('Bags used must be greater than zero');
    if (Number(payload.bags_used) > Number(balance?.net_to_return || 0)) throw new Error('Reject bag usage exceeds available bags');
    return createLocalRecord(store, 'rejectBagUsages', payload);
  },

  async updateRejectUsage(id, data) {
    const payload = cleanPayload(data);
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.rpc('update_reject_bag_usage', { p_reject_bag_usage_id: id, p_payload: payload });
      if (error) throw error;
      return updated;
    }
    const store = readDemoStore();
    const index = store.rejectBagUsages.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Reject bag usage not found');
    store.rejectBagUsages[index] = { ...store.rejectBagUsages[index], ...payload, updated_at: nowIso() };
    writeDemoStore(store);
    return store.rejectBagUsages[index];
  },

  async archiveRejectUsage(id, reason = null) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('archive_reject_bag_usage', { p_reject_bag_usage_id: id, p_reason: reason });
      if (error) throw error;
      return data;
    }
    const store = readDemoStore();
    const index = store.rejectBagUsages.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Reject bag usage not found');
    store.rejectBagUsages[index] = { ...store.rejectBagUsages[index], archived_at: nowIso(), archive_reason: reason };
    writeDemoStore(store);
    return store.rejectBagUsages[index];
  },

  async createReturn(data) {
    const payload = cleanPayload(data);
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_supplier_bag_return', { p_payload: payload });
      if (error) throw error;
      return created;
    }
    return createLocalRecord(readDemoStore(), 'supplierBagReturns', payload);
  },

  async createPayment(data) {
    const payload = cleanPayload(data);
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('record_supplier_bag_payment', { p_payload: payload });
      if (error) throw error;
      return created;
    }
    return createLocalRecord(readDemoStore(), 'supplierBagPayments', payload);
  },

  async createSettlement(data) {
    const payload = cleanPayload(data);
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_supplier_bag_settlement', { p_payload: payload });
      if (error) throw error;
      return created;
    }
    return createLocalRecord(readDemoStore(), 'supplierBagSettlements', payload);
  },
};
