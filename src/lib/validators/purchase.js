// Purchase Registration Validator
// Returns: Array<{ field, severity, message, expected_value, actual_value }>

import {
  required, positiveNumber, nonNegative, toleranceCompare,
  dateNotFuture, lowValue, zeroValue, TOLERANCE,
} from './common';

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const FERESULA = 17;

function calcGrandTotal(warehouseKg, unitPrice, commPct, otherCost, additionalCosts) {
  if (!warehouseKg || warehouseKg <= 0) return null;
  const feresula = warehouseKg / FERESULA;
  const purchasePrice = unitPrice * feresula;
  const commission = unitPrice * feresula * commPct / 100;
  const totalAdditional = (additionalCosts || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  return purchasePrice + commission + (otherCost || 0) + totalAdditional;
}

function parseCostsJson(str) {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}

export default function validatePurchase(form, options = {}) {
  const { allPurchases = [], isEdit = false, currentId = null, supplierMap = new Set() } = options;
  const issues = [];

  // 1. Supplier required
  issues.push(required(form.supplier_name, 'supplier_name', 'Supplier name'));

  // 2. Purchase date required
  issues.push(required(form.purchase_date, 'purchase_date', 'Purchase date'));

  // 3. Coffee type/grade (warn if empty)
  if (!form.coffee_type || form.coffee_type.trim() === '') {
    issues.push({ field: 'coffee_type', severity: 'warning', message: 'Coffee type is not selected. This may affect stock tracking.' });
  }

  // 4. Dispatch KG must not be negative
  issues.push(nonNegative(form.net_dispatch_weight_kg, 'net_dispatch_weight_kg', 'Dispatch weight'));

  // 5. Unit price must not be negative
  issues.push(nonNegative(form.unit_price_etb_per_feresula, 'unit_price_etb_per_feresula', 'Unit price'));

  // 6. Unit price zero warning
  issues.push(zeroValue(form.unit_price_etb_per_feresula, 'unit_price_etb_per_feresula', 'Unit price'));

  // 7. Low/high unit price warning
  const unitPrice = parseFloat(form.unit_price_etb_per_feresula) || 0;
  if (unitPrice > 0 && unitPrice < 1000) {
    issues.push({ field: 'unit_price_etb_per_feresula', severity: 'warning', message: `Unit price is low (${unitPrice} ETB/Feresula). Verify this is correct.` });
  }
  if (unitPrice > 100000) {
    issues.push({ field: 'unit_price_etb_per_feresula', severity: 'warning', message: `Unit price is very high (${unitPrice} ETB/Feresula). Verify this is correct.` });
  }

  // 8. Commission non-negative
  issues.push(nonNegative(form.commission_percent, 'commission_percent', 'Commission percent'));

  // 9. Commission warning with agent
  const commVal = parseFloat(form.commission_percent);
  const hasAgent = !!form.agent;
  if (hasAgent && (isNaN(commVal) || commVal === 0)) {
    issues.push({ field: 'commission_percent', severity: 'warning', message: 'Agent is assigned but commission is 0%. Verify commission is correct.' });
  }

  // 10. Additional costs check
  const costsStr = form.additional_costs || '[]';
  const costs = parseCostsJson(costsStr);
  costs.forEach((c, i) => {
    if (!c.name && i > 0) {
      issues.push({ field: `additional_costs[${i}].name`, severity: 'warning', message: 'Additional cost row has no name.' });
    }
    if (c.amount != null && parseFloat(c.amount) < 0) {
      issues.push({ field: `additional_costs[${i}].amount`, severity: 'error', message: 'Additional cost amount must not be negative.' });
    }
  });

  // 11. Grand total match
  const warehouseKg = (options.warehouseKg && options.warehouseKg > 0) ? options.warehouseKg : null;
  if (unitPrice > 0 && warehouseKg) {
    const expectedGrand = calcGrandTotal(warehouseKg, unitPrice, commVal, parseFloat(form.other_cost_etb) || 0, costs);
    const savedGrand = form.grand_total_etb != null ? parseFloat(form.grand_total_etb) : null;
    if (savedGrand != null) {
      const check = toleranceCompare(expectedGrand, savedGrand, 'grand_total_etb', 'Grand total', TOLERANCE.money);
      if (check) issues.push(check);
    }
  }

  // 12. Balance check
  const savedGrand = parseFloat(form.grand_total_etb) || 0;
  let payments = [];
  try { payments = JSON.parse(form.payment_history || '[]'); } catch {}
  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount_etb) || 0), 0);
  const expectedBalance = savedGrand - totalPaid;
  const savedBalance = form.balance_etb != null ? parseFloat(form.balance_etb) : null;
  if (savedBalance != null) {
    const balanceCheck = toleranceCompare(expectedBalance, savedBalance, 'balance_etb', 'Balance', TOLERANCE.money);
    if (balanceCheck) issues.push(balanceCheck);
  }

  // 13. Overpayment
  if (totalPaid > savedGrand + TOLERANCE.money) {
    issues.push({ field: 'payment_history', severity: 'critical', message: `Total paid (${fmt(totalPaid)}) exceeds grand total (${fmt(savedGrand)}). Overpayment of ${fmt(totalPaid - savedGrand)} ETB.`, expected_value: `≤ ${fmt(savedGrand)}`, actual_value: fmt(totalPaid) });
  }

  // 14. Payment validations
  payments.forEach((p, i) => {
    const prefix = `payment_history[${i}]`;
    const pAmount = parseFloat(p.amount_etb) || 0;
    if (pAmount <= 0) {
      issues.push({ field: `${prefix}.amount_etb`, severity: 'error', message: `Payment #${i + 1}: amount must be greater than zero.` });
    }
    if (!p.payment_date) {
      issues.push({ field: `${prefix}.payment_date`, severity: 'warning', message: `Payment #${i + 1}: payment date is missing.` });
    }
    if (!p.cpv_reference && !p.reference_no && !p.payment_no) {
      issues.push({ field: `${prefix}.cpv_reference`, severity: 'warning', message: `Payment #${i + 1}: CPV/reference number is missing.` });
    }
    // Duplicate CPV check
    if (p.cpv_reference) {
      const dup = payments.filter((pp, j) => j !== i && pp.cpv_reference === p.cpv_reference);
      if (dup.length > 0) {
        issues.push({ field: `${prefix}.cpv_reference`, severity: 'error', message: `Payment #${i + 1}: duplicate CPV reference "${p.cpv_reference}".` });
      }
    }
  });

  // 15. Duplicate code
  if (!isEdit && form.coffee_code) {
    const dup = allPurchases.filter(p => p.coffee_code === form.coffee_code && p.id !== currentId);
    if (dup.length > 0) {
      issues.push({ field: 'coffee_code', severity: 'error', message: `Coffee code "${form.coffee_code}" already exists. Must be unique.` });
    }
  }

  // 16. Possible duplicate (same supplier + date + KG)
  if (!isEdit && form.supplier_name && form.purchase_date && form.net_dispatch_weight_kg) {
    const nearMatch = allPurchases.filter(p =>
      p.id !== currentId &&
      p.supplier_name === form.supplier_name &&
      p.purchase_date === form.purchase_date &&
      Math.abs((p.net_dispatch_weight_kg || 0) - (parseFloat(form.net_dispatch_weight_kg) || 0)) < 1
    );
    if (nearMatch.length > 0) {
      issues.push({ field: 'supplier_name', severity: 'warning', message: `Possible duplicate purchase: same supplier "${form.supplier_name}", same date, similar KG. ${nearMatch.length} matching record(s).` });
    }
  }

  // 17. Supplier in master data
  if (form.supplier_name && supplierMap.size > 0) {
    if (!supplierMap.has((form.supplier_name || '').trim().toLowerCase())) {
      issues.push({ field: 'supplier_name', severity: 'warning', message: `Supplier "${form.supplier_name}" not found in master data.` });
    }
  }

  // 18. Future date
  issues.push(dateNotFuture(form.purchase_date, 'purchase_date', 'Purchase date'));

  return issues.filter(Boolean);
}