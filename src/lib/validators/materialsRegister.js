// Materials Register Validator
import {
  required, positiveNumber, nonNegative, dateNotFuture,
  toleranceCompare, TOLERANCE,
} from './common';

export default function validateMaterialEntry(form, options = {}) {
  const { allEntries = [], isEdit = false, currentId = null } = options;
  const issues = [];

  // 1. Date required
  issues.push(required(form.date, 'date', 'Material date'));

  // 2. Name/type required
  if (form.category === 'general' && !form.item_name) {
    issues.push(required(form.item_name, 'item_name', 'Item name'));
  }
  if (form.category === 'export' && !form.item_type) {
    issues.push(required(form.item_type, 'item_type', 'Item type'));
  }

  // 3. Quantity > 0
  issues.push(positiveNumber(form.quantity, 'quantity', 'Quantity'));

  // 4. Quantity not negative
  issues.push(nonNegative(form.quantity, 'quantity', 'Quantity'));

  // 5. Unit cost not negative
  issues.push(nonNegative(form.unit_cost_etb, 'unit_cost_etb', 'Unit cost'));

  // 6. Total cost = quantity × unit cost
  const qty = parseFloat(form.quantity) || 0;
  const unit = parseFloat(form.unit_cost_etb) || 0;
  const expectedTotal = qty * unit;
  const savedTotal = parseFloat(form.total_cost_etb);
  if (savedTotal != null && unit > 0) {
    const check = toleranceCompare(expectedTotal, savedTotal, 'total_cost_etb', 'Total cost', TOLERANCE.money);
    if (check) issues.push(check);
  }

  // 7. Duplicate entry (same date, material, category)
  if (!isEdit) {
    const nameKey = form.category === 'export' ? form.item_type : form.item_name;
    const dups = allEntries.filter(e =>
      e.id !== currentId &&
      e.date === form.date &&
      (e.item_type === nameKey || e.item_name === nameKey) &&
      e.category === form.category &&
      Math.abs((e.quantity || 0) - qty) < 0.01
    );
    if (dups.length > 0) {
      issues.push({ field: 'item_name', severity: 'warning', message: `Possible duplicate material entry for same date and item.` });
    }
  }

  // 8. Future date
  issues.push(dateNotFuture(form.date, 'date', 'Material date'));

  return issues.filter(Boolean);
}