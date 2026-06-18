// Output Report Validator
import {
  required, nonNegative, dateNotFuture,
  toleranceCompare, checkBagCalc,
} from './common';

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const KG_TOLERANCE = 0.1;
const HIGH_REJECT_RATE = 25;

export default function validateOutputReport(form, options = {}) {
  const { isRecleaned = false, pool1Available = null, additionalPool1Kg = 0 } = options;
  const issues = [];

  // 1. Date required
  const startDate = form.start_date || form.date;
  issues.push(required(startDate, 'start_date', 'Start date'));
  issues.push(required(form.end_date || form.date, 'end_date', 'End date'));

  // 2. Supplier / source required
  if (!isRecleaned) {
    if (!form.supplier_name) {
      issues.push({ field: 'supplier_name', severity: 'info', message: 'Supplier name is not set. This may be intentional for coffee-type-based reports.' });
    }
  } else {
    issues.push(required(form.buyer_name, 'buyer_name', 'Buyer name'));
    issues.push(required(form.inspection_ref, 'inspection_ref', 'Inspection reference'));
  }

  // 3. Total processed KG required
  issues.push(required(form.total_kg_processed, 'total_kg_processed', 'Total processed KG'));

  // 4. Total processed KG > 0
  const totalKg = parseFloat(form.total_kg_processed) || 0;
  if (totalKg <= 0) {
    issues.push({ field: 'total_kg_processed', severity: 'error', message: 'Total processed KG must be greater than zero.' });
  }

  // 5. Export bags not negative
  issues.push(nonNegative(form.export_bags, 'export_bags', 'Export bags'));

  // 6. Reject bags not negative
  issues.push(nonNegative(form.reject_bags, 'reject_bags', 'Reject bags'));

  // 7. Export KG = export_bags × 60
  if (form.export_bags != null && form.export_kg != null) {
    const check = checkBagCalc(form.export_bags, form.export_kg, 60, 'export_kg', 'bags', 'Export KG');
    if (check) issues.push(check);
  }

  // 8. Reject KG = reject_bags × 85
  if (form.reject_bags != null && form.reject_kg != null) {
    const check = checkBagCalc(form.reject_bags, form.reject_kg, 85, 'reject_kg', 'reject bags', 'Reject KG');
    if (check) issues.push(check);
  }

  // 9. Total output must not exceed processed
  const exportKg = parseFloat(form.export_kg) || 0;
  const rejectKg = parseFloat(form.reject_kg) || 0;
  const totalOut = exportKg + rejectKg;
  if (totalKg > 0 && totalOut > totalKg + KG_TOLERANCE) {
    issues.push({ field: 'export_bags', severity: 'critical', message: `Export (${fmt(exportKg)}) + Reject (${fmt(rejectKg)}) = ${fmt(totalOut)} KG exceeds total processed (${fmt(totalKg)} KG). Reduce bag counts.`, expected_value: `≤ ${fmt(totalKg)}`, actual_value: fmt(totalOut) });
  }

  // 10. Waste KG not negative
  const wasteKg = totalKg - totalOut;
  if (wasteKg < -KG_TOLERANCE) {
    issues.push({ field: 'export_bags', severity: 'error', message: `Waste is negative (${fmt(wasteKg)} KG). Output exceeds input.` });
  }

  // 11. Reject rate > 25%
  if (totalKg > 0) {
    const rejectPct = (rejectKg / totalKg) * 100;
    if (rejectPct > HIGH_REJECT_RATE) {
      issues.push({ field: 'reject_bags', severity: 'warning', message: `Reject rate is ${rejectPct.toFixed(1)}% (above ${HIGH_REJECT_RATE}% threshold). Review processing quality.` });
    }
  }

  // 12. Export KG zero warning when processed KG exists
  if (totalKg > 0 && exportKg === 0) {
    issues.push({ field: 'export_bags', severity: 'warning', message: 'Export bags are zero but processed KG exists. Is this intentional?' });
  }

  // 13. Pool 1 additional KG must not exceed available
  if (isRecleaned && additionalPool1Kg > 0 && pool1Available != null && additionalPool1Kg > pool1Available) {
    issues.push({ field: 'additional_pool1_kg', severity: 'error', message: `Additional Pool 1 KG (${fmt(additionalPool1Kg)}) exceeds available fresh stock (${fmt(pool1Available)} KG).` });
  }

  // 14. Future date
  issues.push(dateNotFuture(startDate, 'start_date', 'Start date'));
  issues.push(dateNotFuture(form.end_date || form.date, 'end_date', 'End date'));

  return issues.filter(Boolean);
}