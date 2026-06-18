// Warehouse Receipt Validator
import {
  required, positiveNumber, nonNegative, dateNotFuture,
  suspiciousVariance, exceedsLimit,
} from './common';

export default function validateWarehouseReceipt(form, options = {}) {
  const { allReceipts = [], isEdit = false, currentId = null, linkedPurchase = null } = options;
  const issues = [];

  // 1. Date required
  issues.push(required(form.received_date, 'received_date', 'Received date'));

  // 2. GRN code required (warning only — warehouse often creates receipts before GRN arrives)
  if (!form.grn_code || form.grn_code.trim() === '') {
    issues.push({ field: 'grn_code', severity: 'warning', message: 'GRN code is missing. Receipt is not yet confirmed.' });
  }

  // 3. GRN code must be unique
  if (form.grn_code && form.grn_code.trim()) {
    const dup = allReceipts.filter(r => r.gr_code === form.grn_code && (!isEdit || r.id !== currentId));
    if (dup.length > 0) {
      issues.push({ field: 'grn_code', severity: 'error', message: `GRN code "${form.grn_code}" already exists. Must be unique.` });
    }
  }

  // 4. Supplier required
  issues.push(required(form.supplier_name, 'supplier_name', 'Supplier name'));

  // 5. Coffee code / purchase link required
  if (!form.coffee_code && !form.purchase_record_id) {
    issues.push({ field: 'coffee_code', severity: 'warning', message: 'No coffee code or purchase link. This receipt may not be traceable to a purchase.' });
  }

  // 6. Linked purchase exists
  if (form.coffee_code && !linkedPurchase) {
    issues.push({ field: 'coffee_code', severity: 'critical', message: `No purchase found for coffee code "${form.coffee_code}".` });
  }

  // 7. Linked purchase is archived
  if (linkedPurchase && linkedPurchase.archived) {
    issues.push({ field: 'coffee_code', severity: 'warning', message: `Linked purchase "${form.coffee_code}" is archived. Restore the purchase first.` });
  }

  // 8. Received KG > 0
  issues.push(positiveNumber(form.warehouse_received_net_kg, 'warehouse_received_net_kg', 'Received weight'));

  // 9. Received KG not negative
  issues.push(nonNegative(form.warehouse_received_net_kg, 'warehouse_received_net_kg', 'Received weight'));

  // 10. Bags not negative
  issues.push(nonNegative(form.bags_received, 'bags_received', 'Bags received'));

  // 11. Received KG vs dispatched — suspicious variance
  if (linkedPurchase && linkedPurchase.net_dispatch_weight_kg) {
    const dispatched = parseFloat(linkedPurchase.net_dispatch_weight_kg);
    const received = parseFloat(form.warehouse_received_net_kg);
    if (dispatched > 0 && received > 0) {
      const check = suspiciousVariance(received, dispatched, 'warehouse_received_net_kg', 'Received vs dispatched weight', 20);
      if (check) issues.push(check);
    }
  }

  // 12. Shrinkage check (negative = gain, too large loss = warning)
  if (linkedPurchase && linkedPurchase.net_dispatch_weight_kg) {
    const dispatched = parseFloat(linkedPurchase.net_dispatch_weight_kg);
    const received = parseFloat(form.warehouse_received_net_kg) || 0;
    const shrinkage = received - dispatched;
    if (dispatched > 0 && shrinkage < -(dispatched * 0.5)) {
      issues.push({ field: 'warehouse_received_net_kg', severity: 'warning', message: `Received KG is less than 50% of dispatched KG. Large loss detected.` });
    }
  }

  // 13. Future date
  issues.push(dateNotFuture(form.received_date, 'received_date', 'Received date'));

  return issues.filter(Boolean);
}