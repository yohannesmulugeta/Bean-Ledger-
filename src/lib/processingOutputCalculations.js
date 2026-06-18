export const FERESULA_KG = 17;
export const STANDARD_BAG_KG = 85;
export const EXPORT_BAG_KG = 60;
export const KG_TO_LB = 2.2046;

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function calculateProcessingInputKg({ entry_mode = 'By Bags', bags_sent = 0, actual_weighed_kg = null, kg_sent = null } = {}) {
  const actual = toNumber(actual_weighed_kg, NaN);
  if (Number.isFinite(actual) && actual > 0) return actual;
  if (entry_mode === 'By KG') return toNumber(kg_sent);
  return toNumber(bags_sent) * STANDARD_BAG_KG;
}

export function calculateBatchVarianceKg({ bags_sent = 0, actual_weighed_kg = 0 } = {}) {
  const assumedKg = toNumber(bags_sent) * STANDARD_BAG_KG;
  const actualKg = toNumber(actual_weighed_kg);
  if (assumedKg <= 0 || actualKg <= 0) return null;
  return actualKg - assumedKg;
}

export function calculateOutputTotals({ total_kg_processed = 0, export_bags = 0, reject_bags = 0 } = {}) {
  const totalKg = toNumber(total_kg_processed);
  const exportBags = toNumber(export_bags);
  const rejectBags = toNumber(reject_bags);

  if (totalKg <= 0) throw new Error('Total processed KG must be greater than zero');
  if (exportBags < 0 || rejectBags < 0) throw new Error('Bag counts cannot be negative');

  const exportKg = exportBags * EXPORT_BAG_KG;
  const rejectKg = rejectBags * STANDARD_BAG_KG;
  const wasteKg = totalKg - exportKg - rejectKg;
  if (wasteKg < -0.01) throw new Error('Export KG plus reject KG cannot exceed total processed KG');

  return {
    export_kg: exportKg,
    reject_kg: rejectKg,
    waste_kg: wasteKg,
    reject_pct: totalKg > 0 ? (rejectKg / totalKg) * 100 : 0,
    waste_pct: totalKg > 0 ? (wasteKg / totalKg) * 100 : 0,
    total_lb: exportKg * KG_TO_LB,
  };
}

export function calculateSupplierAvailableKgFromMovements(stockMovements = [], supplierId = null) {
  return stockMovements
    .filter((movement) => !movement.archived_at)
    .filter((movement) => !supplierId || movement.supplier_id === supplierId)
    .reduce((sum, movement) => {
      const qty = toNumber(movement.quantity_kg);
      if (movement.movement_type === 'warehouse_received' || movement.movement_type === 'stock_adjustment') return sum + qty;
      if (movement.movement_type === 'sample_deduction' || movement.movement_type === 'processing_deduction') return sum - qty;
      return sum;
    }, 0);
}
