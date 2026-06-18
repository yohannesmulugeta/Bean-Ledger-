export const FERESULA_KG = 17;
export const PAYMENT_TOLERANCE_ETB = 1;

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function assertNonNegative(value, fieldName) {
  const n = toNumber(value);
  if (n < 0) throw new Error(`${fieldName} cannot be negative`);
  return n;
}

export function calculatePurchaseTotals({
  net_dispatch_weight_kg = 0,
  warehouse_received_kg = null,
  unit_price_etb_per_feresula = 0,
  commission_percent = 0,
  additional_costs = [],
  payments = [],
}) {
  const dispatchKg = assertNonNegative(net_dispatch_weight_kg, 'Dispatch KG');
  const warehouseKg = warehouse_received_kg === null || warehouse_received_kg === undefined || warehouse_received_kg === ''
    ? dispatchKg
    : assertNonNegative(warehouse_received_kg, 'Warehouse received KG');
  const unitPrice = assertNonNegative(unit_price_etb_per_feresula, 'Unit price');
  const commissionPercent = assertNonNegative(commission_percent, 'Commission percent');

  const additionalCostsTotal = additional_costs.reduce((sum, cost) => sum + assertNonNegative(cost.amount_etb ?? cost.amount ?? 0, 'Additional cost'), 0);
  const paymentsTotal = payments.reduce((sum, payment) => sum + assertNonNegative(payment.amount_etb ?? payment.amount ?? 0, 'Payment amount'), 0);
  const netFeresula = dispatchKg / FERESULA_KG;
  const warehouseFeresula = warehouseKg / FERESULA_KG;
  const purchasePrice = unitPrice * netFeresula;
  const commission = warehouseFeresula * unitPrice * (commissionPercent / 100);
  const grandTotal = purchasePrice + commission + additionalCostsTotal;
  const rawBalance = grandTotal - paymentsTotal;
  const balance = Math.abs(rawBalance) <= PAYMENT_TOLERANCE_ETB ? 0 : rawBalance;

  return {
    net_feresula: netFeresula,
    warehouse_feresula: warehouseFeresula,
    total_purchase_price_etb: purchasePrice,
    commission_etb: commission,
    additional_costs_total_etb: additionalCostsTotal,
    grand_total_etb: grandTotal,
    total_paid_etb: paymentsTotal,
    balance_etb: balance,
    payment_status: balance < 0 ? 'Overpaid' : balance === 0 ? 'Paid' : paymentsTotal > 0 ? 'Partial' : 'Unpaid',
  };
}

export function ensureUniqueCoffeeCode(records, coffeeCode, currentId = null) {
  const normalized = String(coffeeCode || '').trim().toLowerCase();
  if (!normalized) return true;

  const duplicate = records.find((record) => (
    !record.archived_at &&
    record.id !== currentId &&
    String(record.coffee_code || '').trim().toLowerCase() === normalized
  ));

  if (duplicate) throw new Error(`Coffee code already exists: ${coffeeCode}`);
  return true;
}

export function archiveRecord(record, archivedAt = new Date().toISOString()) {
  return {
    ...record,
    archived: true,
    archived_at: archivedAt,
    updated_at: archivedAt,
  };
}
