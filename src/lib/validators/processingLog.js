// Processing Log Validator
import {
  required, positiveNumber, nonNegative, dateNotFuture,
  exceedsLimit, suspiciousVariance,
} from './common';

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function validateProcessingLog(form, options = {}) {
  const { availableKg = null, linkedReceipts = [] } = options;
  const issues = [];

  // 1. Date required
  const dateVal = form.date || form.processing_date;
  issues.push(required(dateVal, 'date', 'Processing date'));

  // 2. Supplier name required
  issues.push(required(form.supplier_name, 'supplier_name', 'Supplier name'));

  // 3. Coffee type (warn if missing)
  if (!form.coffee_type) {
    issues.push({ field: 'coffee_type', severity: 'warning', message: 'Coffee type is not set. May affect stock tracking.' });
  }

  // 4. Sent/processed KG > 0
  const kgSent = parseFloat(form.kg_sent) || parseFloat(form.bags_sent * 85) || 0;
  if (kgSent <= 0) {
    issues.push({ field: 'kg_sent', severity: 'error', message: 'Processing quantity must be greater than zero.' });
  }

  // 5. KG not negative
  issues.push(nonNegative(form.kg_sent, 'kg_sent', 'Sent KG'));
  issues.push(nonNegative(form.bags_sent, 'bags_sent', 'Sent bags'));

  // 6. Actual weighed KG not negative
  if (form.actual_weighed_kg != null) {
    issues.push(nonNegative(form.actual_weighed_kg, 'actual_weighed_kg', 'Actual weighed KG'));
  }

  // 7. Variance between actual and sent
  if (form.actual_weighed_kg != null && kgSent > 0) {
    const check = suspiciousVariance(form.actual_weighed_kg, kgSent, 'actual_weighed_kg', 'Actual vs sent weight', 15);
    if (check) issues.push(check);
  }

  // 8. Processed KG must not exceed available KG
  if (availableKg != null && kgSent > 0) {
    const check = exceedsLimit(kgSent, availableKg, 'kg_sent', `Processing KG exceeds available stock (${fmt(availableKg)} KG)`, 'critical');
    if (check) issues.push(check);
  }

  // 9. No available stock
  if (availableKg === 0 && kgSent > 0) {
    issues.push({ field: 'supplier_name', severity: 'critical', message: `No warehouse stock available for "${form.supplier_name}". Create warehouse receipt first.` });
  }

  // 10. Linked receipt is archived
  const archivedReceipts = linkedReceipts.filter(r => r.archived);
  if (archivedReceipts.length > 0 && linkedReceipts.every(r => r.archived)) {
    issues.push({ field: 'supplier_name', severity: 'warning', message: `All warehouse receipts for "${form.supplier_name}" are archived.` });
  }

  // 11. Future date
  issues.push(dateNotFuture(dateVal, 'date', 'Processing date'));

  return issues.filter(Boolean);
}