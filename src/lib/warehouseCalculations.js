export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function calculateShortageKg(dispatchKg, receivedKg) {
  const dispatch = toNumber(dispatchKg);
  const received = toNumber(receivedKg);
  if (dispatch < 0) throw new Error('Dispatch KG cannot be negative');
  if (received <= 0) throw new Error('Received KG must be greater than zero');
  if (received > dispatch) throw new Error('Received KG cannot exceed dispatch KG in the demo workflow');
  return dispatch - received;
}

export function validateWarehouseReceiptInput({ purchase, supplier_id, received_kg }) {
  if (!purchase) throw new Error('Purchase record not found');
  if (supplier_id && purchase.supplier_id && supplier_id !== purchase.supplier_id) {
    throw new Error('Supplier does not match the selected purchase');
  }
  calculateShortageKg(purchase.net_dispatch_weight_kg, received_kg);
  return true;
}

export function calculateSupplierAvailableKg(stockMovements = [], supplierId = null) {
  return stockMovements
    .filter((movement) => !movement.archived_at)
    .filter((movement) => !supplierId || movement.supplier_id === supplierId)
    .filter((movement) => movement.movement_type === 'warehouse_received')
    .reduce((sum, movement) => sum + toNumber(movement.quantity_kg), 0);
}

export function archiveWarehouseRecord(record, archivedAt = new Date().toISOString()) {
  return {
    ...record,
    archived: true,
    archived_at: archivedAt,
    updated_at: archivedAt,
  };
}
