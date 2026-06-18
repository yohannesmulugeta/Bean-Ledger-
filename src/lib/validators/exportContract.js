// Export Contract Validator
import {
  required, positiveNumber, nonNegative, dateNotFuture,
  toleranceCompare, exceedsLimit, zeroValue, TOLERANCE,
} from './common';

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function validateExportContract(form, options = {}) {
  const { availableStock = {}, stockPool = 'Fresh', allContracts = [], isEdit = false, currentId = null, hasBuyerInspection = false } = options;
  const issues = [];

  // 1. Buyer name required
  issues.push(required(form.buyer_name, 'buyer_name', 'Buyer name'));

  // 2. Contract date required
  issues.push(required(form.contract_date, 'contract_date', 'Contract date'));

  // 3. Contract number required
  issues.push(required(form.contract_no, 'contract_no', 'Contract number'));

  // 4. Coffee type required
  issues.push(required(form.coffee_type, 'coffee_type', 'Coffee type'));

  // 5. Export KG > 0
  issues.push(positiveNumber(form.export_kg, 'export_kg', 'Export KG'));

  // 6. Export KG not negative
  issues.push(nonNegative(form.export_kg, 'export_kg', 'Export KG'));

  // 7. Export KG must not exceed available stock
  const exportKg = parseFloat(form.export_kg) || 0;
  const coffeeType = form.coffee_type || '';
  if (coffeeType && exportKg > 0 && availableStock[coffeeType] != null) {
    const avail = availableStock[coffeeType];
    const adjustedAvail = isEdit ? avail + (parseFloat(options.initialExportKg) || 0) : avail;
    if (exportKg > adjustedAvail + 0.1) {
      issues.push({ field: 'export_kg', severity: 'critical', message: `Export KG (${fmt(exportKg)}) exceeds available ${stockPool} stock for "${coffeeType}" (${fmt(adjustedAvail)} KG).`, expected_value: `≤ ${fmt(adjustedAvail)}`, actual_value: fmt(exportKg) });
    }
  }

  // 8. Unit price / pricing
  const pricingMethod = form.pricing_method || 'per_lb';
  if (pricingMethod === 'per_lb') {
    issues.push(nonNegative(form.price_per_lb_usd, 'price_per_lb_usd', 'Price per LB'));
    issues.push(zeroValue(form.price_per_lb_usd, 'price_per_lb_usd', 'Price per LB'));
  } else {
    issues.push(nonNegative(form.price_per_kg_usd, 'price_per_kg_usd', 'Price per KG'));
    issues.push(zeroValue(form.price_per_kg_usd, 'price_per_kg_usd', 'Price per KG'));
  }

  // 9. Exchange rate non-negative
  const rate = parseFloat(form.contract_rate_etb) || 0;
  if (form.contract_rate_etb != null && form.contract_rate_etb !== '') {
    issues.push(nonNegative(form.contract_rate_etb, 'contract_rate_etb', 'Exchange rate'));
  }

  // 10. Cost rows validation
  try {
    const costRows = JSON.parse(form.cost_rows || '[]');
    costRows.forEach((c, i) => {
      if (c.name && c.amount_etb != null && parseFloat(c.amount_etb) < 0) {
        issues.push({ field: `cost_rows[${i}]`, severity: 'error', message: `Cost "${c.name}" must not be negative.` });
      }
    });
  } catch {}

  // 11. Total costs match
  try {
    const costRows = JSON.parse(form.cost_rows || '[]');
    const expectedCosts = costRows.reduce((s, c) => s + (parseFloat(c.amount_etb) || 0), 0) + (parseFloat(form.total_materials_etb) || 0);
    const savedCosts = parseFloat(form.total_costs_etb);
    if (expectedCosts > 0 && savedCosts != null) {
      const check = toleranceCompare(expectedCosts, savedCosts, 'total_costs_etb', 'Total costs', TOLERANCE.money);
      if (check) issues.push(check);
    }
  } catch {}

  // 12. Profit must match revenue - costs
  const revenue = parseFloat(form.total_export_value_etb || form.grand_total_revenue_etb) || 0;
  const costs = parseFloat(form.total_costs_etb) || 0;
  const rejectSales = parseFloat(form.reject_sales_etb) || 0;
  const expectedProfit = revenue - costs + rejectSales;
  const savedProfit = parseFloat(form.profit_etb);
  if (savedProfit != null && revenue > 0) {
    const check = toleranceCompare(expectedProfit, savedProfit, 'profit_etb', 'Profit', TOLERANCE.money);
    if (check) issues.push(check);
  }

  // 13. Profit margin
  if (revenue > 0 && savedProfit != null) {
    const expectedMargin = (savedProfit / (revenue + rejectSales)) * 100;
    const savedMargin = parseFloat(form.profit_margin_pct);
    if (savedMargin != null) {
      const check = toleranceCompare(expectedMargin, savedMargin, 'profit_margin_pct', 'Profit margin %', 0.5);
      if (check) issues.push(check);
    }
  }

  // 14. Negative profit warning
  if (savedProfit != null && savedProfit < -TOLERANCE.money) {
    issues.push({ field: 'profit_etb', severity: savedProfit < -50000 ? 'critical' : 'warning', message: `Contract will result in negative profit of ${fmt(Math.abs(savedProfit))} ETB. Review costs and pricing.` });
  }

  // 15. Missing buyer inspection
  if (!hasBuyerInspection && form.buyer_name && form.coffee_type) {
    issues.push({ field: 'buyer_name', severity: 'info', message: 'No buyer inspection found for this contract. Consider creating one before finalizing.' });
  }

  // 16. Duplicate contract number
  if (!isEdit && form.contract_no) {
    const dup = allContracts.filter(c => c.contract_no === form.contract_no && c.id !== currentId);
    if (dup.length > 0) {
      issues.push({ field: 'contract_no', severity: 'error', message: `Contract number "${form.contract_no}" already exists.` });
    }
  }

  // 17. Future date
  issues.push(dateNotFuture(form.contract_date, 'contract_date', 'Contract date'));

  return issues.filter(Boolean);
}