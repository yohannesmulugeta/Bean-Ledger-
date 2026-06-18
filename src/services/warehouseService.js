import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { archiveWarehouseRecord, calculateShortageKg, calculateSupplierAvailableKg, validateWarehouseReceiptInput } from '@/lib/warehouseCalculations';
import { calculatePurchaseTotals } from '@/lib/purchaseCalculations';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

function decorateReceipt(receipt) {
  return {
    ...receipt,
    archived: Boolean(receipt.archived_at),
    warehouse_received_net_kg: receipt.received_kg,
    net_dispatch_weight_kg: receipt.dispatch_kg,
    grn_code: receipt.receipt_number,
    remark: receipt.notes,
  };
}

function recalculateLocalPurchase(store, purchaseId) {
  const purchase = store.purchases.find((item) => item.id === purchaseId);
  if (!purchase) return null;
  const additionalCosts = store.additionalCosts.filter((item) => item.purchase_record_id === purchaseId && !item.archived_at);
  const payments = store.payments.filter((item) => item.purchase_record_id === purchaseId && !item.archived_at);
  const totals = calculatePurchaseTotals({
    net_dispatch_weight_kg: purchase.net_dispatch_weight_kg,
    warehouse_received_kg: purchase.warehouse_received_kg,
    unit_price_etb_per_feresula: purchase.unit_price_etb_per_feresula,
    commission_percent: purchase.commission_percent,
    additional_costs: additionalCosts,
    payments,
  });
  Object.assign(purchase, totals, { updated_at: nowIso() });
  return purchase;
}

function normalizePayload(data, purchase, existing = {}) {
  const supplierId = data.supplier_id || purchase.supplier_id || existing.supplier_id;
  const receivedKg = Number(data.received_kg ?? data.warehouse_received_net_kg ?? existing.received_kg ?? 0);
  const shortageKg = calculateShortageKg(purchase.net_dispatch_weight_kg, receivedKg);
  return {
    ...existing,
    organization_id: purchase.organization_id || DEMO_META.organizationId,
    purchase_record_id: purchase.id,
    supplier_id: supplierId,
    base44_id: data.base44_id ?? existing.base44_id ?? null,
    is_demo: data.is_demo ?? existing.is_demo ?? true,
    receipt_number: data.receipt_number || data.grn_code || existing.receipt_number || '',
    coffee_code: purchase.coffee_code,
    supplier_name: purchase.supplier_name,
    received_date: data.received_date || existing.received_date || nowIso().slice(0, 10),
    dispatch_kg: Number(purchase.net_dispatch_weight_kg || 0),
    received_kg: receivedKg,
    shortage_kg: shortageKg,
    warehouse_name: data.warehouse_name || existing.warehouse_name || 'Demo Warehouse',
    status: existing.status || 'received',
    notes: data.notes ?? data.remark ?? existing.notes ?? '',
  };
}

function payloadForRpc(data) {
  return {
    purchase_record_id: data.purchase_record_id,
    supplier_id: data.supplier_id,
    receipt_number: data.receipt_number || data.grn_code,
    received_date: data.received_date,
    received_kg: Number(data.received_kg ?? data.warehouse_received_net_kg ?? 0),
    warehouse_name: data.warehouse_name,
    notes: data.notes ?? data.remark,
    reason: data.reason,
    is_demo: data.is_demo ?? true,
    base44_id: data.base44_id ?? null,
  };
}

export const warehouseService = {
  async listReceipts({ includeArchived = false } = {}) {
    if (isSupabaseConfigured) {
      let query = supabase
        .from('warehouse_receipts')
        .select('*')
        .order('received_date', { ascending: false });
      if (!includeArchived) query = query.is('archived_at', null);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(decorateReceipt);
    }

    return readDemoStore().warehouseReceipts
      .filter((receipt) => includeArchived || !receipt.archived_at)
      .map(decorateReceipt)
      .sort((a, b) => String(b.received_date).localeCompare(String(a.received_date)));
  },

  async listEligiblePurchases() {
    const store = readDemoStore();
    return store.purchases
      .filter((purchase) => !purchase.archived_at)
      .sort((a, b) => String(b.purchase_date).localeCompare(String(a.purchase_date)));
  },

  async getReceipt(id) {
    const receipts = await warehouseService.listReceipts({ includeArchived: true });
    return receipts.find((receipt) => receipt.id === id) || null;
  },

  async createReceipt(data) {
    if (isSupabaseConfigured) {
      const { data: receipt, error } = await supabase.rpc('create_warehouse_receipt', { p_payload: payloadForRpc(data) });
      if (error) throw error;
      return decorateReceipt(receipt);
    }

    const store = readDemoStore();
    const purchase = store.purchases.find((item) => item.id === data.purchase_record_id);
    validateWarehouseReceiptInput({ purchase, supplier_id: data.supplier_id, received_kg: data.received_kg ?? data.warehouse_received_net_kg });
    if (store.warehouseReceipts.some((receipt) => receipt.purchase_record_id === purchase.id && !receipt.archived_at)) {
      throw new Error('This purchase already has an active warehouse receipt');
    }
    const timestamp = nowIso();
    const receipt = {
      id: createDemoId(),
      ...normalizePayload(data, purchase),
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };
    store.warehouseReceipts.push(receipt);
    store.stockMovements.push({
      id: createDemoId(),
      organization_id: receipt.organization_id,
      supplier_id: receipt.supplier_id,
      purchase_record_id: receipt.purchase_record_id,
      warehouse_receipt_id: receipt.id,
      source_type: 'warehouse_receipt',
      source_id: receipt.id,
      movement_type: 'warehouse_received',
      stock_pool: 'supplier_available',
      quantity_kg: receipt.received_kg,
      occurred_at: `${receipt.received_date}T08:00:00Z`,
      notes: 'Created from warehouse receipt',
      is_demo: true,
      created_at: timestamp,
      archived_at: null,
    });
    store.warehouseHistory.push({
      id: createDemoId(),
      warehouse_receipt_id: receipt.id,
      organization_id: receipt.organization_id,
      action_type: 'Created',
      changes: { receipt_number: receipt.receipt_number, demo: true },
      reason: data.reason || 'Demo receipt created',
      is_demo: true,
      created_at: timestamp,
    });
    purchase.warehouse_received_kg = receipt.received_kg;
    recalculateLocalPurchase(store, purchase.id);
    writeDemoStore(store);
    return decorateReceipt(receipt);
  },

  async updateReceipt(id, data) {
    if (isSupabaseConfigured) {
      const { data: receipt, error } = await supabase.rpc('update_warehouse_receipt', { p_warehouse_receipt_id: id, p_payload: payloadForRpc(data) });
      if (error) throw error;
      return decorateReceipt(receipt);
    }

    const store = readDemoStore();
    const index = store.warehouseReceipts.findIndex((receipt) => receipt.id === id);
    if (index < 0) throw new Error('Warehouse receipt not found');
    const existing = store.warehouseReceipts[index];
    const purchase = store.purchases.find((item) => item.id === existing.purchase_record_id);
    validateWarehouseReceiptInput({ purchase, supplier_id: existing.supplier_id, received_kg: data.received_kg ?? data.warehouse_received_net_kg ?? existing.received_kg });
    const updated = {
      ...normalizePayload(data, purchase, existing),
      id,
      updated_at: nowIso(),
    };
    store.warehouseReceipts[index] = updated;
    const movement = store.stockMovements.find((item) => item.warehouse_receipt_id === id && item.movement_type === 'warehouse_received');
    if (movement) movement.quantity_kg = updated.received_kg;
    store.warehouseHistory.push({
      id: createDemoId(),
      warehouse_receipt_id: id,
      organization_id: updated.organization_id,
      action_type: 'Edited',
      changes: { old: existing, new: updated },
      reason: data.reason || 'Demo receipt updated',
      is_demo: true,
      created_at: nowIso(),
    });
    purchase.warehouse_received_kg = updated.received_kg;
    recalculateLocalPurchase(store, purchase.id);
    writeDemoStore(store);
    return decorateReceipt(updated);
  },

  async archiveReceipt(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data: receipt, error } = await supabase.rpc('archive_warehouse_receipt', { p_warehouse_receipt_id: id, p_reason: reason });
      if (error) throw error;
      return decorateReceipt(receipt);
    }

    const store = readDemoStore();
    const index = store.warehouseReceipts.findIndex((receipt) => receipt.id === id);
    if (index < 0) throw new Error('Warehouse receipt not found');
    const archivedAt = nowIso();
    const archived = { ...archiveWarehouseRecord(store.warehouseReceipts[index], archivedAt), status: 'archived' };
    store.warehouseReceipts[index] = archived;
    store.stockMovements = store.stockMovements.map((movement) => (
      movement.warehouse_receipt_id === id ? { ...movement, archived_at: archivedAt } : movement
    ));
    const purchase = store.purchases.find((item) => item.id === archived.purchase_record_id);
    if (purchase) {
      purchase.warehouse_received_kg = null;
      recalculateLocalPurchase(store, purchase.id);
    }
    store.warehouseHistory.push({
      id: createDemoId(),
      warehouse_receipt_id: id,
      organization_id: archived.organization_id,
      action_type: 'Archived',
      changes: { receipt_number: archived.receipt_number, demo: true },
      reason,
      is_demo: true,
      created_at: archivedAt,
    });
    writeDemoStore(store);
    return decorateReceipt(archived);
  },

  async restoreReceipt(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data: receipt, error } = await supabase.rpc('restore_warehouse_receipt', { p_warehouse_receipt_id: id, p_reason: reason });
      if (error) throw error;
      return decorateReceipt(receipt);
    }

    const store = readDemoStore();
    const index = store.warehouseReceipts.findIndex((receipt) => receipt.id === id);
    if (index < 0) throw new Error('Warehouse receipt not found');
    const receipt = { ...store.warehouseReceipts[index], archived_at: null, archived: false, status: 'received', updated_at: nowIso() };
    const purchase = store.purchases.find((item) => item.id === receipt.purchase_record_id);
    validateWarehouseReceiptInput({ purchase, supplier_id: receipt.supplier_id, received_kg: receipt.received_kg });
    store.warehouseReceipts[index] = receipt;
    store.stockMovements = store.stockMovements.map((movement) => (
      movement.warehouse_receipt_id === id ? { ...movement, archived_at: null } : movement
    ));
    purchase.warehouse_received_kg = receipt.received_kg;
    recalculateLocalPurchase(store, purchase.id);
    store.warehouseHistory.push({
      id: createDemoId(),
      warehouse_receipt_id: id,
      organization_id: receipt.organization_id,
      action_type: 'Restored',
      changes: { receipt_number: receipt.receipt_number, demo: true },
      reason,
      is_demo: true,
      created_at: nowIso(),
    });
    writeDemoStore(store);
    return decorateReceipt(receipt);
  },

  async listHistory(receiptId = null) {
    if (isSupabaseConfigured) {
      let query = supabase.from('warehouse_receipt_history').select('*').order('created_at', { ascending: false });
      if (receiptId) query = query.eq('warehouse_receipt_id', receiptId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    return readDemoStore().warehouseHistory
      .filter((item) => !receiptId || item.warehouse_receipt_id === receiptId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  },

  async supplierAvailability() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('calculate_supplier_available_kg', { p_organization_id: DEMO_META.organizationId, p_supplier_id: null });
      if (error) throw error;
      return data || [];
    }

    const store = readDemoStore();
    return store.suppliers.map((supplier) => ({
      supplier_id: supplier.id,
      supplier_name: supplier.supplier_name,
      available_kg: calculateSupplierAvailableKg(store.stockMovements, supplier.id),
    }));
  },
};
