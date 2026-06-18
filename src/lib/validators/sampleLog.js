// Sample Log Validator
import {
  required, positiveNumber, nonNegative, dateNotFuture,
  exceedsLimit,
} from './common';

export default function validateSampleLog(form, options = {}) {
  const { allSamples = [], isEdit = false, currentId = null, availableKg = null } = options;
  const issues = [];

  // 1. Sample date required
  issues.push(required(form.sample_date, 'sample_date', 'Sample date'));

  // 2. Supplier name required (for Warehouse type)
  if (form.sample_type === 'Warehouse') {
    issues.push(required(form.supplier_name, 'supplier_name', 'Supplier name'));
  }

  // 3. Coffee code / coffee type required (for Export/Export Inspection)
  if ((form.sample_type === 'Export Inspection' || form.sample_type === 'Export') && !form.coffee_type) {
    issues.push({ field: 'coffee_type', severity: 'warning', message: 'Coffee type is recommended for this sample type.' });
  }

  // 4. Sample KG > 0
  issues.push(positiveNumber(form.sample_kg, 'sample_kg', 'Sample weight'));

  // 5. Sample KG not negative
  issues.push(nonNegative(form.sample_kg, 'sample_kg', 'Sample weight'));

  // 6. Sample KG must not exceed available KG
  const sampleKg = parseFloat(form.sample_kg) || 0;
  if (sampleKg > 0 && availableKg != null) {
    const check = exceedsLimit(sampleKg, availableKg, 'sample_kg', `Sample weight exceeds available stock (${availableKg} KG)`, 'critical');
    if (check) issues.push(check);
  }

  // 7. Duplicate sample entry
  if (!isEdit && form.supplier_name && form.coffee_code && form.sample_date && sampleKg > 0) {
    const dups = allSamples.filter(s =>
      s.id !== currentId &&
      s.supplier_name === form.supplier_name &&
      s.coffee_code === form.coffee_code &&
      s.sample_date === form.sample_date &&
      Math.abs((s.sample_kg || 0) - sampleKg) < 0.01
    );
    if (dups.length > 0) {
      issues.push({ field: 'sample_kg', severity: 'warning', message: `Possible duplicate sample: same supplier, code, date, and KG.` });
    }
  }

  // 8. Future date
  issues.push(dateNotFuture(form.sample_date, 'sample_date', 'Sample date'));

  return issues.filter(Boolean);
}