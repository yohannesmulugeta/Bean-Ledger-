// Bag Ledger Validator (Bag Receipts, Reject Usage, Payments, Returns)
import {
  required, positiveNumber, nonNegative, dateNotFuture,
} from './common';

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function validateBagReceipt(form, options = {}) {
  const { allReceipts = [], isEdit = false, currentId = null } = options;
  const issues = [];

  // 1. Date required
  issues.push(required(form.date, 'date', 'Bag receipt date'));

  // 2. Bags > 0
  issues.push(positiveNumber(form.bags_received, 'bags_received', 'Bags received'));

  // 3. Bags not negative
  issues.push(nonNegative(form.bags_received, 'bags_received', 'Bags received'));

  // 4. Agent/supplier required based on mode
  if (form.receipt_mode === 'agent') {
    issues.push(required(form.agent_name, 'agent_name', 'Agent name'));
  } else if (form.receipt_mode === 'supplier') {
    issues.push(required(form.supplier_name, 'supplier_name', 'Supplier name'));
  }

  // 5. Future date
  issues.push(dateNotFuture(form.date, 'date', 'Bag receipt date'));

  return issues.filter(Boolean);
}

export function validateRejectBagUsage(form, options = {}) {
  const { availableBags = null } = options;
  const issues = [];

  // 1. Date required
  issues.push(required(form.date, 'date', 'Date'));

  // 2. Bags > 0
  issues.push(positiveNumber(form.bags_used, 'bags_used', 'Bags used'));

  // 3. Bags not negative
  issues.push(nonNegative(form.bags_used, 'bags_used', 'Bags used'));

  // 4. Agent/supplier required
  if (form.reject_mode === 'agent') {
    issues.push(required(form.agent_name, 'agent_name', 'Agent name'));
  } else {
    issues.push(required(form.supplier_name, 'supplier_name', 'Supplier name'));
  }

  // 5. Must not exceed available bags
  const used = parseFloat(form.bags_used) || 0;
  if (availableBags != null && used > availableBags) {
    issues.push({ field: 'bags_used', severity: 'error', message: `Bags used (${used}) exceeds available bags (${fmt(availableBags, 0)}).` });
  }

  // 6. Future date
  issues.push(dateNotFuture(form.date, 'date', 'Date'));

  return issues.filter(Boolean);
}

export function validateSupplierBagPayment(form, options = {}) {
  const issues = [];

  // 1. Date required
  issues.push(required(form.payment_date, 'payment_date', 'Payment date'));

  // 2. Amount > 0
  issues.push(positiveNumber(form.amount_etb, 'amount_etb', 'Payment amount'));

  // 3. Amount not negative
  issues.push(nonNegative(form.amount_etb, 'amount_etb', 'Payment amount'));

  // 4. Reference recommended
  if (!form.reference_no && !form.bank_name) {
    issues.push({ field: 'reference_no', severity: 'warning', message: 'Payment reference or bank name is recommended.' });
  }

  // 5. Agent/supplier required
  if (!form.supplier_name && !form.agent_name) {
    issues.push({ field: 'supplier_name', severity: 'error', message: 'Supplier or agent name is required.' });
  }

  // 6. Future date
  issues.push(dateNotFuture(form.payment_date, 'payment_date', 'Payment date'));

  return issues.filter(Boolean);
}

export function validateSupplierBagReturn(form, options = {}) {
  const { outstandingBags = null } = options;
  const issues = [];

  // 1. Date required
  issues.push(required(form.return_date, 'return_date', 'Return date'));

  // 2. Bags > 0
  issues.push(positiveNumber(form.bags_returned, 'bags_returned', 'Bags returned'));

  // 3. Bags not negative
  issues.push(nonNegative(form.bags_returned, 'bags_returned', 'Bags returned'));

  // 4. Must not exceed outstanding
  const returned = parseFloat(form.bags_returned) || 0;
  if (outstandingBags != null && returned > outstandingBags + 0.01) {
    issues.push({ field: 'bags_returned', severity: 'error', message: `Returned bags (${returned}) exceeds outstanding bags (${fmt(outstandingBags, 0)}).` });
  }

  // 5. Agent/supplier required
  if (!form.supplier_name && !form.agent_name) {
    issues.push({ field: 'supplier_name', severity: 'error', message: 'Supplier or agent name is required.' });
  }

  // 6. Future date
  issues.push(dateNotFuture(form.return_date, 'return_date', 'Return date'));

  return issues.filter(Boolean);
}