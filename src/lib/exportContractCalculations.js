export const EXPORT_BAG_KG = 60;
export const REJECT_BAG_KG = 85;
export const KG_TO_LB = 2.2046;

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function calculateExportContractTotals({
  export_bags = null,
  export_kg = null,
  export_sample_kg = 0,
  price_per_lb_usd = 0,
  price_per_kg_usd = 0,
  pricing_method = 'per_lb',
  exchange_rate_etb = null,
  contract_rate_etb = null,
  costs = [],
  materials = [],
  payments = [],
  reject_sales_etb = 0,
} = {}) {
  const bags = export_bags === null || export_bags === undefined || export_bags === ''
    ? null
    : toNumber(export_bags);
  const grossKg = bags !== null ? bags * EXPORT_BAG_KG : toNumber(export_kg);
  const sampleKg = toNumber(export_sample_kg);
  const shippedKg = Math.max(0, grossKg - sampleKg);
  const shippedLb = shippedKg * KG_TO_LB;
  const priceLb = toNumber(price_per_lb_usd);
  const priceKg = toNumber(price_per_kg_usd);
  const rate = toNumber(exchange_rate_etb ?? contract_rate_etb);

  if (grossKg <= 0) throw new Error('Export KG must be greater than zero');
  if (sampleKg < 0 || sampleKg > grossKg) throw new Error('Export sample KG is invalid');
  if (priceLb < 0 || priceKg < 0) throw new Error('Export price cannot be negative');
  if (rate < 0) throw new Error('Exchange rate cannot be negative');

  const exportValueUsd = pricing_method === 'per_kg' ? shippedKg * priceKg : shippedLb * priceLb;
  const exportValueEtb = exportValueUsd * rate;
  const costRows = parseJsonArray(costs);
  const materialRows = parseJsonArray(materials);
  const paymentRows = parseJsonArray(payments);
  const totalCostsEtb = costRows.reduce((sum, row) => sum + toNumber(row.amount_etb), 0);
  const totalMaterialsEtb = materialRows.reduce((sum, row) => sum + (toNumber(row.quantity) * toNumber(row.unit_cost_etb)), 0);
  const totalPaymentsEtb = paymentRows.reduce((sum, row) => {
    if (row.amount_etb !== undefined && row.amount_etb !== null && row.amount_etb !== '') return sum + toNumber(row.amount_etb);
    return sum + (toNumber(row.amount_usd) * toNumber(row.actual_rate_etb ?? rate));
  }, 0);
  const rejectSales = toNumber(reject_sales_etb);
  if (rejectSales < 0) throw new Error('Reject sales cannot be negative');

  const totalCostEtb = totalCostsEtb + totalMaterialsEtb;
  const profitEtb = exportValueEtb + rejectSales - totalCostEtb;
  const profitUsd = rate > 0 ? profitEtb / rate : 0;
  const balanceEtb = exportValueEtb - totalPaymentsEtb;

  return {
    export_kg: grossKg,
    actual_shipped_kg: shippedKg,
    export_bags: bags !== null ? bags : Math.floor(grossKg / EXPORT_BAG_KG),
    total_lb: shippedLb,
    total_export_value_usd: exportValueUsd,
    total_export_value_etb: exportValueEtb,
    total_costs_etb: totalCostEtb,
    total_materials_etb: totalMaterialsEtb,
    total_received_etb: totalPaymentsEtb,
    balance_etb: balanceEtb,
    profit_etb: profitEtb,
    profit_usd: profitUsd,
    profit_margin_pct: exportValueEtb + rejectSales > 0 ? (profitEtb / (exportValueEtb + rejectSales)) * 100 : 0,
  };
}

export function calculateAvailableStockFromMovements(stockMovements = [], stockPool = 'export_available', coffeeType = null) {
  return stockMovements
    .filter((movement) => !movement.archived_at)
    .filter((movement) => movement.stock_pool === stockPool)
    .filter((movement) => !coffeeType || movement.coffee_type === coffeeType)
    .reduce((sum, movement) => {
      if (movement.movement_type === 'output_export' || movement.movement_type === 'output_reject') return sum + toNumber(movement.quantity_kg);
      if (movement.movement_type === 'export_contract_deduction' || movement.movement_type === 'buyer_inspection_sample') return sum - toNumber(movement.quantity_kg);
      return sum;
    }, 0);
}
