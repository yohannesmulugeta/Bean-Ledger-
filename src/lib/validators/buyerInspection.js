// Buyer Inspection Validator
import {
  required, positiveNumber, nonNegative, dateNotFuture,
} from './common';

export default function validateBuyerInspection(form, options = {}) {
  const { allInspections = [], isEdit = false, currentId = null } = options;
  const issues = [];

  // 1. Buyer name required
  issues.push(required(form.buyer_name, 'buyer_name', 'Buyer name'));

  // 2. Inspection date required
  issues.push(required(form.inspection_date, 'inspection_date', 'Inspection date'));

  // 3. Coffee type required
  issues.push(required(form.coffee_type, 'coffee_type', 'Coffee type'));

  // 4. KG to inspect > 0
  issues.push(positiveNumber(form.kg_to_inspect, 'kg_to_inspect', 'KG to inspect'));

  // 5. KG not negative
  issues.push(nonNegative(form.kg_to_inspect, 'kg_to_inspect', 'KG to inspect'));

  // 6. Sample KG not negative
  issues.push(nonNegative(form.sample_kg_taken, 'sample_kg_taken', 'Sample KG taken'));

  // 7. Sample KG > 0
  if (form.sample_kg_taken != null && parseFloat(form.sample_kg_taken) === 0) {
    issues.push({ field: 'sample_kg_taken', severity: 'warning', message: 'Sample KG taken is zero. Samples are usually taken during inspections.' });
  }

  // 8. Result required if inspection happened
  if (!form.result || form.result === 'Pending') {
    issues.push({ field: 'result', severity: 'info', message: 'Inspection result is still pending. Update once available.' });
  }

  // 9. Failed inspection — check reason
  if (form.result === 'Failed') {
    if (!form.rejection_reason || form.rejection_reason === 'Other') {
      issues.push({ field: 'rejection_reason', severity: 'warning', message: 'Rejection reason should be specified.' });
    }
    if (!form.action_taken) {
      issues.push({ field: 'action_taken', severity: 'warning', message: 'Action for rejected coffee should be specified (Reprocess/Sell Locally/Hold).' });
    }
  }

  // 10. Passed — check approved KG
  if (form.result === 'Passed' && form.kg_approved != null) {
    const approved = parseFloat(form.kg_approved);
    const toInspect = parseFloat(form.kg_to_inspect);
    if (approved > toInspect + 0.1) {
      issues.push({ field: 'kg_approved', severity: 'warning', message: `Approved KG (${approved}) exceeds inspected KG (${toInspect}).` });
    }
  }

  // 11. Duplicate inspection
  if (!isEdit && form.buyer_name && form.inspection_date && form.coffee_type) {
    const dups = allInspections.filter(i =>
      i.id !== currentId &&
      i.buyer_name === form.buyer_name &&
      i.coffee_type === form.coffee_type &&
      i.inspection_date === form.inspection_date
    );
    if (dups.length > 0) {
      issues.push({ field: 'buyer_name', severity: 'warning', message: `Duplicate inspection for "${form.buyer_name}" / "${form.coffee_type}" on ${form.inspection_date}.` });
    }
  }

  // 12. Future date
  issues.push(dateNotFuture(form.inspection_date, 'inspection_date', 'Inspection date'));

  return issues.filter(Boolean);
}