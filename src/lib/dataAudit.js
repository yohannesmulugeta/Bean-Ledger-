// ── BeanLedger Export — Full Data Integrity Audit Engine ────────────────────────
// 40+ checks across all ERP modules: Purchases, Warehouse Receipts, Processing,
// Output Reports, Export Contracts, Buyer Inspections, Stock Reconciliation,
// Financial Reconciliation, Orphans, Duplicates, and Suspicious Values.
//
// Returns: Array of structured audit issue objects with navigation metadata.

// ── Audit Rule Configuration ───────────────────────────────────────────────────
// Tune these to match your real business workflow. Only Critical checks are always
// active; Warning / Info checks can be disabled or downgraded below.
const AUDIT_RULES = {
  // If false, "Missing batch number" never shows.
  requireProcessingBatchNumber: false,

  // If false, "Zero bags received" on warehouse receipts is skipped.
  requireWarehouseBags: false,

  // If false, contracts without buyer inspections are not flagged.
  requireBuyerInspectionForEveryContract: false,

  // If false, "Purchase has no warehouse receipt" info is skipped.
  showMissingReceiptInfo: false,

  // If false, "Missing payment references" info is skipped.
  showMissingPaymentRefs: false,

  // If false, "Missing GRN" info is skipped.
  showMissingGRN: false,

  // If false, "Missing registrar" info is skipped.
  showMissingRegistrar: false,

  // If false, "Missing cert/PI number" info is skipped.
  showMissingCertPI: false,
};

const FERESULA = 17;
const TOLERANCE_ETB = 5;
const KG_TOLERANCE = 0.05;
const HIGH_REJECT_RATE = 25;
const UNREALISTIC_MARGIN = 80;
const LARGE_SHRINK_PCT = 20;
const EXPORT_BAG_KG = 60;
const REJECT_BAG_KG = 85;

let _issueId = 0;

function issue(severity, category, mod, problemTitle, problemDescription, recordId, recordLabel, meta, expected, actual, diff, fix, targetRoute) {
  _issueId++;
  return {
    id: `audit-${_issueId}`,
    severity,
    category,
    module: mod,
    problem_title: problemTitle,
    problem_description: problemDescription,
    record_id: recordId,
    record_label: recordLabel,
    supplier_name: meta?.supplier_name || null,
    coffee_code: meta?.coffee_code || null,
    buyer_name: meta?.buyer_name || null,
    expected_value: expected,
    actual_value: actual,
    difference: diff,
    suggested_fix: fix,
    target_route: targetRoute || null,
    target_record_id: recordId || null,
    check_id: null,
  };
}

const fmt = (n) => n == null ? '—' : Number(n).toFixed(2);
const fmtKg = (n) => n == null ? '—' : Number(n).toFixed(2);
const fmtDiff = (n) => n == null ? '—' : Number(n).toFixed(2);
const pct = (n) => n == null ? '—' : `${Number(n).toFixed(1)}%`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseNum(v) { if (v == null || v === '') return 0; const s = String(v).replace(/,/g, ''); const n = parseFloat(s); return isNaN(n) ? 0 : n; }

function parseJson(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

function sumAdditionalCosts(record) {
  return parseJson(record.additional_costs).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
}

function sumPaymentHistory(record) {
  return parseJson(record.payment_history).reduce((s, pmt) => s + (parseFloat(pmt.amount_etb) || 0), 0);
}

function dateVal(v) { if (!v) return null; const s = typeof v === 'string' ? v.split('T')[0] : v; try { return new Date(s); } catch { return null; } }

function isNegative(v) { return parseNum(v) < -TOLERANCE_ETB; }

function isZero(v) { return Math.abs(parseNum(v)) < 0.001; }

function calcPurchaseGrandTotal(dispatchKg, warehouseKg, unitPrice, commPct, costsTotal) {
  if (!dispatchKg || dispatchKg <= 0) return null;
  const dispatchFeresula = dispatchKg / FERESULA;
  const warehouseFeresula = (warehouseKg || dispatchKg) / FERESULA;
  return (unitPrice * dispatchFeresula) + (unitPrice * warehouseFeresula * commPct / 100) + costsTotal;
}

function calcBalance(grandTotal, totalPaid) {
  return Math.abs(grandTotal - totalPaid) <= 1 ? 0 : grandTotal - totalPaid;
}

// ── Main Entry ─────────────────────────────────────────────────────────────────

export default function runDataAudit(data) {
  _issueId = 0;
  const results = [];
  const {
    suppliers = [],
    purchases = [],
    warehouseReceipts = [],
    sampleLogs = [],
    processingLogs = [],
    outputReports = [],
    exportContracts = [],
    buyerInspections = [],
    bagReceipts = [],
    rejectBagUsages = [],
    supplierBagPayments = [],
    supplierBagReturns = [],
    materialEntries = [],
  } = data;

  const active = (r) => !r.archived;
  const activeList = (arr) => (arr || []).filter(active);
  const ap = activeList(purchases);
  const aw = activeList(warehouseReceipts);
  const as = activeList(sampleLogs);
  const apl = activeList(processingLogs);
  const ao = activeList(outputReports);
  const aec = activeList(exportContracts);
  const abi = activeList(buyerInspections);

  // Lookup maps
  const supplierSet = new Set((suppliers || []).map(s => (s.supplier_name || '').toLowerCase().trim()));
  const coffeeCodeToPurchase = {};
  ap.forEach(p => { if (p.coffee_code) coffeeCodeToPurchase[p.coffee_code] = p; });

  const receiptByCode = {};
  aw.forEach(w => { if (w.coffee_code) receiptByCode[w.coffee_code] = w; });

  const supplierReceipts = {};
  aw.forEach(w => {
    if (!w.supplier_name) return;
    const key = w.supplier_name.toLowerCase();
    if (!supplierReceipts[key]) supplierReceipts[key] = [];
    supplierReceipts[key].push(w);
  });

  // ============================================================================
  // SECTION 1: PURCHASE REGISTRATION
  // ============================================================================

  // 1a. Missing coffee code
  ap.filter(p => !p.coffee_code).forEach(p => {
    results.push(issue(
      'critical', 'Data Quality', 'Purchase Registration',
      'Missing coffee code',
      'Purchase record has no coffee code. Every purchase must have a unique auto-generated code for tracking and linking.',
      p.id, `Purchase (no code) — ${p.supplier_name || 'Unknown'}`,
      { supplier_name: p.supplier_name },
      'e.g. BeanLedger/Wollega/001/2026', 'Not set', null,
      'Re-save the purchase to auto-generate a coffee code, or enter one manually.',
      '/purchase-registration'
    ));
  });

  // 1b. Missing supplier / region / coffee type
  ap.forEach(p => {
    if (!p.supplier_name) {
      results.push(issue('warning', 'Data Quality', 'Purchase Registration',
        'Missing supplier name',
        'A supplier name is required for reporting and stock tracking.',
        p.id, `Purchase ${p.coffee_code || '—'}`,
        { coffee_code: p.coffee_code },
        'Supplier name', 'Not set', null,
        'Edit the purchase and select a supplier.',
        '/purchase-registration'));
    }
    if (!p.region) {
      results.push(issue('warning', 'Data Quality', 'Purchase Registration',
        'Missing region',
        'Region is missing. Coffee codes and regional reports depend on accurate region data.',
        p.id, `Purchase ${p.coffee_code || '—'}`,
        { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
        'e.g. Wollega, Guji', 'Not set', null,
        'Edit the purchase and select a region.',
        '/purchase-registration'));
    }
    if (!p.coffee_type) {
      results.push(issue('warning', 'Data Quality', 'Purchase Registration',
        'Missing coffee type',
        'Coffee type is missing. Type is required for stock tracking and export planning.',
        p.id, `Purchase ${p.coffee_code || '—'}`,
        { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
        'e.g. Unwashed Lekempti', 'Not set', null,
        'Edit the purchase and select a coffee type.',
        '/purchase-registration'));
    }
  });

  // 1c. Zero / negative dispatch weight
  ap.forEach(p => {
    const kg = parseNum(p.net_dispatch_weight_kg);
    if (kg <= 0) {
      results.push(issue('warning', 'Data Quality', 'Purchase Registration',
        'Zero or missing dispatch weight',
        'Net dispatch weight is zero or missing. This blocks grand total calculation, stock tracking, and payment processing.',
        p.id, `Purchase ${p.coffee_code || '—'}`,
        { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
        '> 0 KG', fmtKg(kg), null,
        'Enter the correct net dispatch weight in kilograms.',
        '/purchase-registration'));
    }
  });

  // 1d. Two-stage purchase total validation
  //    Stage 1: total_purchase_price = (dispatch KG ÷ 17) × unit price
  //    Stage 2: grand_total_etb = (warehouse KG ÷ 17) × unit price × (1+comm%) + costs
  //    These are intentionally different — the audit validates each against its own formula.
  ap.forEach(p => {
    try {
      const unitPrice = parseNum(p.unit_price_etb_per_feresula);
      const commPct = parseNum(p.commission_percent);
      const costsTotal = sumAdditionalCosts(p);
      const dispatchKg = parseNum(p.net_dispatch_weight_kg);
      const receipt = receiptByCode[p.coffee_code];
      const warehouseKg = receipt ? parseNum(receipt.warehouse_received_net_kg) : 0;

      // ── Check A: Purchase-stage total (dispatch-based) ──
      const savedPurchaseTotal = parseNum(p.total_purchase_price);
      if (dispatchKg > 0 && unitPrice > 0) {
        const expectedPurchaseTotal = (dispatchKg / FERESULA) * unitPrice;
        const diff = Math.abs(expectedPurchaseTotal - savedPurchaseTotal);
        if (diff > TOLERANCE_ETB) {
          results.push(issue('warning', 'Finance', 'Purchase Registration',
            'Purchase-stage total mismatch',
            `Total Purchase Price (${fmt(savedPurchaseTotal)}) doesn't match dispatch-based formula: (${fmtKg(dispatchKg)} KG ÷ 17) × ${fmt(unitPrice)} = ${fmt(expectedPurchaseTotal)}. This is the initial purchase estimate — it should use dispatch KG, not warehouse KG.`,
            p.id, `Purchase ${p.coffee_code || '—'}`,
            { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
            fmt(expectedPurchaseTotal), fmt(savedPurchaseTotal), fmtDiff(diff),
            'Re-save the purchase with the correct unit price and dispatch KG.',
            '/purchase-registration'));
        }
      }

      // ── Check B: Grand total (warehouse-based when receipt exists, dispatch otherwise) ──
      const savedGrand = parseNum(p.grand_total_etb);
      if (savedGrand > 0 && unitPrice > 0) {
        // When warehouse receipt exists, grand total MUST use warehouse KG
        if (warehouseKg > 0) {
          const expectedGrand = calcPurchaseGrandTotal(dispatchKg, warehouseKg, unitPrice, commPct, costsTotal);
          const diff = Math.abs(expectedGrand - savedGrand);
          if (diff > TOLERANCE_ETB) {
            results.push(issue('warning', 'Finance', 'Purchase Registration',
              'Grand total mismatch (warehouse basis)',
              `Grand Total (${fmt(savedGrand)}) should be based on warehouse received KG (${fmtKg(warehouseKg)}). Expected: (${fmtKg(warehouseKg)} ÷ 17) × ${fmt(unitPrice)} × (1 + ${commPct}%) + ${fmt(costsTotal)} costs = ${fmt(expectedGrand)}. Difference of ${fmtDiff(diff)} ETB — may indicate the purchase wasn't re-saved after warehouse receipt was recorded.`,
              p.id, `Purchase ${p.coffee_code || '—'}`,
              { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
              fmt(expectedGrand), fmt(savedGrand), fmtDiff(diff),
              'Open and re-save the purchase — grand total recalculates automatically from warehouse KG.',
              '/purchase-registration'));
          }
        } else {
          // No warehouse receipt yet — grand total can use dispatch KG, but inform the user
          if (dispatchKg > 0) {
            const expectedGrand = calcPurchaseGrandTotal(dispatchKg, dispatchKg, unitPrice, commPct, costsTotal);
            const diff = Math.abs(expectedGrand - savedGrand);
            if (diff > TOLERANCE_ETB) {
              results.push(issue('warning', 'Finance', 'Purchase Registration',
                'Grand total mismatch (dispatch basis — no receipt yet)',
                `Grand Total (${fmt(savedGrand)}) doesn't match dispatch-based formula: (${fmtKg(dispatchKg)} ÷ 17) × ${fmt(unitPrice)} × (1 + ${commPct}%) + ${fmt(costsTotal)} costs = ${fmt(expectedGrand)}. No warehouse receipt exists yet so the total should match the dispatch estimate.`,
                p.id, `Purchase ${p.coffee_code || '—'}`,
                { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
                fmt(expectedGrand), fmt(savedGrand), fmtDiff(diff),
                'Re-save the purchase to recalculate from dispatch KG.',
                '/purchase-registration'));
            }
          }
          // Info: purchase awaiting warehouse receipt
          results.push(issue('info', 'Workflow', 'Purchase Registration',
            'Purchase awaiting warehouse receipt',
            `Grand Total currently uses dispatch KG (${fmtKg(dispatchKg)}). It will update automatically when a warehouse receipt is recorded with the actual received KG.`,
            p.id, `Purchase ${p.coffee_code || '—'}`,
            { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
            'Warehouse receipt', 'Not yet recorded', null,
            'Create a warehouse receipt for this purchase.',
            '/warehouse-receipt'));
        }
      }
    } catch {}
  });

  // 1e. Balance mismatch
  ap.forEach(p => {
    try {
      const grand = parseNum(p.grand_total_etb);
      const totalPaid = sumPaymentHistory(p);
      const expectedBalance = calcBalance(grand, totalPaid);
      const savedBalance = parseNum(p.balance_etb);
      if (savedBalance !== null && Math.abs(expectedBalance - savedBalance) > TOLERANCE_ETB) {
        results.push(issue('warning', 'Finance', 'Purchase Registration',
          'Purchase balance mismatch',
          'Stored balance does not match Grand Total minus Total Paid.',
          p.id, `Purchase ${p.coffee_code || '—'}`,
          { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
          fmt(expectedBalance), fmt(savedBalance), fmtDiff(Math.abs(expectedBalance - savedBalance)),
          'Re-save the purchase — balance recalculates automatically.',
          '/purchase-registration'));
      }
    } catch {}
  });

  // 1f. Overpayment
  ap.forEach(p => {
    const grand = parseNum(p.grand_total_etb);
    const totalPaid = sumPaymentHistory(p);
    if (totalPaid > grand + TOLERANCE_ETB) {
      results.push(issue('critical', 'Finance', 'Purchase Registration',
        'Purchase overpayment detected',
        `Total paid (${fmt(totalPaid)}) exceeds grand total (${fmt(grand)}).`,
        p.id, `Purchase ${p.coffee_code || '—'}`,
        { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
        `≤ ${fmt(grand)}`, fmt(totalPaid), fmtDiff(totalPaid - grand),
        'Reduce or remove excess payments.',
        '/purchase-registration'));
    }
  });

  // 1g. Supplier not in master data (case-insensitive, trimmed match)
  ap.forEach(p => {
    if (p.supplier_name) {
      const normName = (p.supplier_name || '').trim();
      const normLower = normName.toLowerCase();
      if (!supplierSet.has(normLower)) {
        results.push(issue('warning', 'Data Quality', 'Purchase Registration',
          'Supplier not in master data',
          `"${normName}" not found in Supplier master list. This may be a spelling or casing difference.`,
          p.id, `Purchase ${p.coffee_code || '—'}`,
          { coffee_code: p.coffee_code, supplier_name: normName },
          'In master list', normName, null,
          `Add "${normName}" to Suppliers in Master Data, or fix the spelling on the purchase.`,
          '/master-data'));
      }
    }
  });

  // 1h. Duplicate coffee code
  const codeCount = {};
  ap.filter(p => p.coffee_code).forEach(p => { codeCount[p.coffee_code] = (codeCount[p.coffee_code] || 0) + 1; });
  Object.entries(codeCount).filter(([, n]) => n > 1).forEach(([code, n]) => {
    ap.filter(p => p.coffee_code === code).forEach(p => {
      results.push(issue('warning', 'Data Quality', 'Purchase Registration',
        `Duplicate coffee code (${n} records)`,
        `${n} purchases share coffee code "${code}". Each code should be unique.`,
        p.id, `Purchase ${code}`,
        { coffee_code: code, supplier_name: p.supplier_name },
        'Unique', `${n} records`, null,
        'Review duplicates. Merge if accidental, or ensure they are intentional splits.',
        '/purchase-registration'));
    });
  });

  // 1i. Purchase with no warehouse receipt (optional info)
  if (AUDIT_RULES.showMissingReceiptInfo) {
    ap.forEach(p => {
      if (p.coffee_code && !receiptByCode[p.coffee_code]) {
        results.push(issue('info', 'Workflow', 'Purchase Registration',
          'Purchase has no warehouse receipt',
          'This purchase has no linked warehouse receipt. Coffee may not have been received yet.',
          p.id, `Purchase ${p.coffee_code}`,
          { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
          'Linked receipt', 'None found', null,
          'Create a warehouse receipt for this purchase if goods have arrived.',
          '/warehouse-receipt'));
      }
    });
  }

  // 1j. Missing payment references (optional info)
  if (AUDIT_RULES.showMissingPaymentRefs) {
    ap.forEach(p => {
      parseJson(p.payment_history).forEach((pmt, idx) => {
        if (!pmt.cpv_reference && !pmt.reference_no && !pmt.payment_no) {
          results.push(issue('info', 'Finance', 'Purchase Registration',
            'Payment missing reference number',
            `Payment #${idx + 1} has no CPV reference or document number.`,
            p.id, `Purchase ${p.coffee_code || '—'} (Payment #${idx + 1})`,
            { coffee_code: p.coffee_code, supplier_name: p.supplier_name },
            'CPV / reference no.', 'Not provided', null,
            'Add a CPV reference for this payment.',
            '/purchase-registration'));
        }
      });
    });
  }

  // ============================================================================
  // SECTION 2: WAREHOUSE RECEIPT
  // ============================================================================

  // 2a. Receipt without purchase
  aw.forEach(w => {
    if (w.coffee_code && !coffeeCodeToPurchase[w.coffee_code]) {
      results.push(issue('critical', 'Workflow', 'Warehouse Receipt',
        'Receipt has no matching purchase',
        `Coffee code "${w.coffee_code}" has no purchase record.`,
        w.id, `Receipt ${w.grn_code || w.coffee_code || '—'}`,
        { coffee_code: w.coffee_code, supplier_name: w.supplier_name },
        'Matching purchase', 'None found', null,
        `Create a purchase with code "${w.coffee_code}" or fix the receipt.`,
        '/warehouse-receipt'));
    }
  });

  // 2b. Missing or zero received KG
  aw.forEach(w => {
    if (parseNum(w.warehouse_received_net_kg) <= 0) {
      results.push(issue('warning', 'Data Quality', 'Warehouse Receipt',
        'Missing received weight',
        'Warehouse received net KG is zero or missing. Grand total and balance on linked purchase cannot calculate without it.',
        w.id, `Receipt ${w.grn_code || w.coffee_code || '—'}`,
        { coffee_code: w.coffee_code, supplier_name: w.supplier_name },
        '> 0 KG', fmtKg(parseNum(w.warehouse_received_net_kg)), null,
        'Enter the actual received net weight.',
        '/warehouse-receipt'));
    }
  });

  // 2c. Zero bags received (skipped if AUDIT_RULES.requireWarehouseBags is false, or receipt has valid KG)
  if (AUDIT_RULES.requireWarehouseBags) {
    aw.forEach(w => {
      const hasValidKg = parseNum(w.warehouse_received_net_kg) > 0;
      if (parseNum(w.bags_received) <= 0 && !hasValidKg) {
        results.push(issue('warning', 'Data Quality', 'Warehouse Receipt',
          'Zero bags received',
          'Bags received is zero and no warehouse KG is recorded.',
          w.id, `Receipt ${w.grn_code || w.coffee_code || '—'}`,
          { coffee_code: w.coffee_code, supplier_name: w.supplier_name },
          '> 0', fmt(parseNum(w.bags_received)), null,
          'Enter the bag count or confirm it is intentionally zero.',
          '/warehouse-receipt'));
      }
    });
  }

  // 2d. Received KG differs significantly from dispatch KG
  aw.forEach(w => {
    const received = parseNum(w.warehouse_received_net_kg);
    const dispatched = parseNum(w.net_dispatch_weight_kg);
    if (received > 0 && dispatched > 0) {
      const diff = Math.abs(received - dispatched);
      const diffPct = (diff / dispatched) * 100;
      if (diffPct > LARGE_SHRINK_PCT) {
        results.push(issue('warning', 'Stock', 'Warehouse Receipt',
          `Received weight differs ${diffPct.toFixed(1)}% from dispatch`,
          `Received (${fmtKg(received)}) varies significantly from dispatch (${fmtKg(dispatched)}).`,
          w.id, `Receipt ${w.grn_code || w.coffee_code || '—'}`,
          { coffee_code: w.coffee_code, supplier_name: w.supplier_name },
          fmtKg(dispatched), fmtKg(received), fmtDiff(diff),
          'Verify both dispatch and received weights.',
          '/warehouse-receipt'));
      }
    }
  });

  // 2e. Missing GRN (optional info)
  if (AUDIT_RULES.showMissingGRN) {
    aw.forEach(w => {
      if (!w.grn_code) {
        results.push(issue('info', 'Data Quality', 'Warehouse Receipt',
          'Missing GRN number',
          'No Goods Received Note number. GRN is important for audit trails.',
          w.id, `Receipt ${w.coffee_code || '—'}`,
          { coffee_code: w.coffee_code, supplier_name: w.supplier_name },
          'GRN code', 'Not set', null,
          'Add a GRN number for this warehouse receipt.',
          '/warehouse-receipt'));
      }
    });
  }

  // 2f. Duplicate GRN
  const grnCount = {};
  aw.filter(w => w.grn_code).forEach(w => { grnCount[w.grn_code] = (grnCount[w.grn_code] || 0) + 1; });
  Object.entries(grnCount).filter(([, n]) => n > 1).forEach(([grn, n]) => {
    aw.filter(w => w.grn_code === grn).forEach(w => {
      results.push(issue('warning', 'Data Quality', 'Warehouse Receipt',
        `Duplicate GRN "${grn}" (${n} records)`,
        `${n} receipts share the same GRN. GRN numbers should be unique.`,
        w.id, `Receipt ${grn}`,
        { coffee_code: w.coffee_code, supplier_name: w.supplier_name },
        'Unique', `${n} records`, null,
        'Verify both receipts. Correct the GRN on duplicates.',
        '/warehouse-receipt'));
    });
  });

  // 2g. Duplicate warehouse receipt for same purchase
  const wrByCode = {};
  aw.forEach(w => {
    if (w.coffee_code && w.coffee_code !== '') {
      if (!wrByCode[w.coffee_code]) wrByCode[w.coffee_code] = [];
      wrByCode[w.coffee_code].push(w);
    }
  });
  Object.entries(wrByCode).filter(([, recs]) => recs.length > 1).forEach(([code, recs]) => {
    recs.slice(1).forEach(w => {
      results.push(issue('warning', 'Data Quality', 'Warehouse Receipt',
        'Duplicate receipt for same purchase',
        `Coffee code "${code}" has ${recs.length} active warehouse receipts. Usually one receipt per purchase.`,
        w.id, `Receipt ${w.grn_code || '—'}`,
        { coffee_code: code, supplier_name: w.supplier_name },
        '1 receipt', `${recs.length} receipts`, null,
        'Review duplicate receipts and merge or archive extras.',
        '/warehouse-receipt'));
    });
  });

  // ============================================================================
  // SECTION 3: PROCESSING LOG
  // ============================================================================

  // 3a. Processing without warehouse stock
  apl.forEach(pl => {
    if (pl.supplier_name) {
      const key = pl.supplier_name.toLowerCase();
      const recs = supplierReceipts[key] || [];
      const totalReceived = recs.reduce((s, w) => s + parseNum(w.warehouse_received_net_kg), 0);
      const kgSent = parseNum(pl.kg_sent) || parseNum(pl.bags_sent) * REJECT_BAG_KG;
      if (totalReceived === 0) {
        results.push(issue('critical', 'Stock', 'Processing Log',
          'No warehouse stock for supplier',
          `Supplier "${pl.supplier_name}" has processing but zero warehouse receipts.`,
          pl.id, `Processing ${pl.batch_no || pl.supplier_name}`,
          { supplier_name: pl.supplier_name, coffee_code: pl.coffee_code },
          '> 0 KG received', '0 KG', null,
          'Create a warehouse receipt for this supplier first.',
          '/processing-log'));
      } else if (kgSent > totalReceived + KG_TOLERANCE) {
        results.push(issue('critical', 'Stock', 'Processing Log',
          'Processing exceeds available stock',
          `${fmtKg(kgSent)} KG sent but only ${fmtKg(totalReceived)} KG received.`,
          pl.id, `Processing ${pl.batch_no || pl.supplier_name}`,
          { supplier_name: pl.supplier_name, coffee_code: pl.coffee_code },
          `≤ ${fmtKg(totalReceived)}`, fmtKg(kgSent), fmtDiff(kgSent - totalReceived),
          'Reduce processing quantity or add missing warehouse receipts.',
          '/processing-log'));
      }
    }
  });

  // 3b. Missing processing date
  apl.filter(pl => !pl.date).forEach(pl => {
    results.push(issue('warning', 'Data Quality', 'Processing Log',
      'Missing processing date',
      'Processing date is required for date-based reports.',
      pl.id, `Processing ${pl.batch_no || '—'}`,
      { supplier_name: pl.supplier_name, coffee_code: pl.coffee_code },
      'Any valid date', 'Not set', null,
      'Enter the processing date.',
      '/processing-log'));
  });

  // 3c. Zero KG sent
  apl.forEach(pl => {
    const kg = parseNum(pl.kg_sent) || parseNum(pl.actual_weighed_kg) || parseNum(pl.bags_sent) * REJECT_BAG_KG;
    if (kg <= 0) {
      results.push(issue('warning', 'Data Quality', 'Processing Log',
        'Zero KG sent for processing',
        'Processing record has zero KG. This may be an incomplete entry.',
        pl.id, `Processing ${pl.batch_no || pl.supplier_name || '—'}`,
        { supplier_name: pl.supplier_name, coffee_code: pl.coffee_code },
        '> 0 KG', fmtKg(kg), null,
        'Enter the correct KG or bags sent.',
        '/processing-log'));
    }
  });

  // 3d. Missing batch number (only if AUDIT_RULES.requireProcessingBatchNumber is true)
  if (AUDIT_RULES.requireProcessingBatchNumber) {
    apl.filter(pl => !pl.batch_no).forEach(pl => {
      results.push(issue('info', 'Data Quality', 'Processing Log',
        'Missing batch number',
        'No batch number assigned. Batch numbers help track processing runs.',
        pl.id, `Processing ${pl.supplier_name || '—'}`,
        { supplier_name: pl.supplier_name, coffee_code: pl.coffee_code },
        'Batch no.', 'Not set', null,
        'Enter a batch number for this processing run.',
        '/processing-log'));
    });
  }

  // ============================================================================
  // SECTION 4: OUTPUT REPORT
  // ============================================================================

  // 4a. Export KG mismatch (bags × 60)
  ao.forEach(o => {
    const expBags = parseNum(o.export_bags);
    const expectedExpKg = expBags * EXPORT_BAG_KG;
    const savedExpKg = parseNum(o.export_kg);
    if (savedExpKg !== null && expBags > 0 && Math.abs(expectedExpKg - savedExpKg) > KG_TOLERANCE) {
      results.push(issue('warning', 'Stock', 'Output Report',
        'Export KG mismatch (bags × 60)',
        `Export KG should equal ${expBags} bags × ${EXPORT_BAG_KG} KG = ${fmtKg(expectedExpKg)} but ${fmtKg(savedExpKg)} is stored.`,
        o.id, `Output ${o.supplier_name || '—'}`,
        { supplier_name: o.supplier_name, coffee_type: o.coffee_type },
        fmtKg(expectedExpKg), fmtKg(savedExpKg), fmtDiff(Math.abs(expectedExpKg - savedExpKg)),
        'Update export KG to match bags × 60 or correct the bag count.',
        '/output-report'));
    }
  });

  // 4b. Reject KG mismatch (bags × 85)
  ao.forEach(o => {
    const rejBags = parseNum(o.reject_bags);
    const expectedRejKg = rejBags * REJECT_BAG_KG;
    const savedRejKg = parseNum(o.reject_kg);
    if (savedRejKg !== null && rejBags > 0 && Math.abs(expectedRejKg - savedRejKg) > KG_TOLERANCE) {
      results.push(issue('warning', 'Stock', 'Output Report',
        'Reject KG mismatch (bags × 85)',
        `Reject KG should equal ${rejBags} bags × ${REJECT_BAG_KG} KG = ${fmtKg(expectedRejKg)} but ${fmtKg(savedRejKg)} is stored.`,
        o.id, `Output ${o.supplier_name || '—'}`,
        { supplier_name: o.supplier_name, coffee_type: o.coffee_type },
        fmtKg(expectedRejKg), fmtKg(savedRejKg), fmtDiff(Math.abs(expectedRejKg - savedRejKg)),
        'Update reject KG to match bags × 85 or correct the bag count.',
        '/output-report'));
    }
  });

  // 4c. Output exceeds processed
  ao.forEach(o => {
    const totalOut = parseNum(o.export_kg) + parseNum(o.reject_kg);
    const processed = parseNum(o.total_kg_processed);
    if (processed > 0 && totalOut > processed + KG_TOLERANCE) {
      results.push(issue('critical', 'Stock', 'Output Report',
        'Export + Reject exceeds processed KG',
        `Output (${fmtKg(totalOut)}) exceeds input (${fmtKg(processed)}). Physically impossible.`,
        o.id, `Output ${o.supplier_name || '—'}`,
        { supplier_name: o.supplier_name, coffee_type: o.coffee_type },
        `≤ ${fmtKg(processed)}`, fmtKg(totalOut), fmtDiff(totalOut - processed),
        'Reduce export/reject bags or increase total KG processed.',
        '/output-report'));
    }
  });

  // 4d. Negative waste
  ao.forEach(o => {
    const waste = parseNum(o.waste_kg);
    if (waste < -KG_TOLERANCE) {
      results.push(issue('critical', 'Stock', 'Output Report',
        'Negative waste detected',
        `Waste KG is ${fmtKg(waste)}. Waste cannot be negative.`,
        o.id, `Output ${o.supplier_name || '—'}`,
        { supplier_name: o.supplier_name, coffee_type: o.coffee_type },
        '≥ 0', fmtKg(waste), fmtDiff(Math.abs(waste)),
        'Review export bags, reject bags, and total processed KG.',
        '/output-report'));
    }
  });

  // 4e. High reject rate
  ao.forEach(o => {
    const processed = parseNum(o.total_kg_processed);
    const rejectKg = parseNum(o.reject_kg);
    if (processed > 0) {
      const rate = (rejectKg / processed) * 100;
      if (rate > HIGH_REJECT_RATE) {
        results.push(issue('warning', 'Quality', 'Output Report',
          `High reject rate: ${rate.toFixed(1)}%`,
          `Reject rate exceeds ${HIGH_REJECT_RATE}%. May indicate processing quality or input coffee grade issues.`,
          o.id, `Output ${o.supplier_name || '—'}`,
          { supplier_name: o.supplier_name, coffee_type: o.coffee_type },
          `< ${HIGH_REJECT_RATE}%`, pct(rate), null,
          'Review processing quality. Check equipment or supplier sourcing.',
          '/output-report'));
      }
    }
  });

  // 4f. Missing dates
  ao.filter(o => !o.start_date && !o.date).forEach(o => {
    results.push(issue('warning', 'Data Quality', 'Output Report',
      'Missing output date',
      'No start date or date set. Required for reporting.',
      o.id, `Output ${o.supplier_name || '—'}`,
      { supplier_name: o.supplier_name, coffee_type: o.coffee_type },
      'Any valid date', 'Not set', null,
      'Enter the output report date.',
      '/output-report'));
  });

  // 4g. Missing registrar (optional info)
  if (AUDIT_RULES.showMissingRegistrar) {
    ao.filter(o => !o.registrar_name).forEach(o => {
      results.push(issue('info', 'Data Quality', 'Output Report',
        'Missing registrar name',
        'No registrar recorded for this output report.',
        o.id, `Output ${o.supplier_name || '—'}`,
        { supplier_name: o.supplier_name, coffee_type: o.coffee_type },
        'Name', 'Not set', null,
        'Enter the registrar name for this output report.',
        '/output-report'));
    });
  }

  // ============================================================================
  // SECTION 5: EXPORT CONTRACTS
  // ============================================================================

  // 5a. Unique contract number
  const contractNoCount = {};
  aec.filter(c => c.contract_no).forEach(c => { contractNoCount[c.contract_no] = (contractNoCount[c.contract_no] || 0) + 1; });
  Object.entries(contractNoCount).filter(([, n]) => n > 1).forEach(([no, n]) => {
    aec.filter(c => c.contract_no === no).forEach(c => {
      results.push(issue('critical', 'Data Quality', 'Export Contracts',
        `Duplicate contract number "${no}"`,
        `${n} contracts share the same number. Contract numbers must be unique.`,
        c.id, `Contract ${no}`,
        { buyer_name: c.buyer_name },
        'Unique', `${n} records`, null,
        'Renumber duplicate contracts immediately.',
        '/export-contracts'));
    });
  });

  // 5b. Missing key fields
  aec.forEach(c => {
    const checks = [
      ['buyer_name', 'Buyer name'],
      ['destination_country', 'Destination country'],
      ['payment_terms', 'Payment terms'],
    ];
    checks.forEach(([field, label]) => {
      if (!c[field]) {
        results.push(issue('warning', 'Data Quality', 'Export Contracts',
          `Missing ${label.toLowerCase()}`,
          `${label} is required for export documentation.`,
          c.id, `Contract ${c.contract_no || '—'}`,
          { buyer_name: c.buyer_name },
          label, 'Not set', null,
          `Enter the ${label.toLowerCase()}.`,
          '/export-contracts'));
      }
    });
  });

  // 5c. Missing contract date
  aec.filter(c => !c.contract_date && !c.export_date).forEach(c => {
    results.push(issue('warning', 'Data Quality', 'Export Contracts',
      'Missing contract date',
      'No contract date set for this export.',
      c.id, `Contract ${c.contract_no || '—'}`,
      { buyer_name: c.buyer_name },
      'Any valid date', 'Not set', null,
      'Enter the contract date.',
      '/export-contracts'));
  });

  // 5d. Contract exceeds available stock (respect stock pool)
  aec.forEach(c => {
    const contractKg = parseNum(c.export_kg);
    if (c.coffee_type && contractKg > 0) {
      const pool = c.stock_pool || 'Fresh';
      const availableOutputs = ao.filter(o => {
        if (o.coffee_type !== c.coffee_type) return false;
        if (o.export_status === 'Exported') return false;
        const outputPool = o.entry_type === 'Recleaned' ? 'Recleaned' : 'Fresh';
        return outputPool === pool;
      });
      const availableKg = availableOutputs.reduce((s, o) => s + parseNum(o.export_kg), 0);
      if (contractKg > availableKg + KG_TOLERANCE) {
        results.push(issue('critical', 'Stock', 'Export Contracts',
          `Contract exceeds available ${pool} stock`,
          `Contract needs ${fmtKg(contractKg)} KG of "${c.coffee_type}" (${pool} pool) but only ${fmtKg(availableKg)} KG available.`,
          c.id, `Contract ${c.contract_no || '—'}`,
          { buyer_name: c.buyer_name, coffee_type: c.coffee_type },
          `≤ ${fmtKg(availableKg)}`, fmtKg(contractKg), fmtDiff(contractKg - availableKg),
          'Process more coffee, reduce contract quantity, or check output report export_status.',
          '/export-contracts'));
      }
    }
  });

  // 5e. Profit mismatch
  aec.forEach(c => {
    try {
      const revenue = parseNum(c.total_export_value_etb || c.grand_total_revenue_etb || c.grand_total_sales_etb);
      const costs = parseNum(c.total_costs_etb || c.total_expenses_etb);
      const materials = parseNum(c.total_materials_etb);
      const rejectSales = parseNum(c.reject_sales_etb || c.total_reject_sales_etb);
      const expectedProfit = revenue - costs - materials + rejectSales;
      const savedProfit = parseNum(c.profit_etb || c.total_profit_etb);
      if (savedProfit !== null && revenue > 0 && Math.abs(expectedProfit - savedProfit) > TOLERANCE_ETB) {
        results.push(issue('warning', 'Finance', 'Export Contracts',
          'Profit calculation mismatch',
          `Profit should be Revenue - Costs - Materials + Reject Sales = ${fmt(expectedProfit)} but ${fmt(savedProfit)} is stored.`,
          c.id, `Contract ${c.contract_no || '—'}`,
          { buyer_name: c.buyer_name },
          fmt(expectedProfit), fmt(savedProfit), fmtDiff(Math.abs(expectedProfit - savedProfit)),
          'Recalculate profit: verify revenue, costs, materials, and reject sales.',
          '/export-contracts'));
      }
    } catch {}
  });

  // 5f. Negative profit
  aec.forEach(c => {
    const profit = parseNum(c.profit_etb || c.total_profit_etb);
    if (profit !== null && profit < -TOLERANCE_ETB) {
      results.push(issue(profit < -50000 ? 'critical' : 'warning', 'Finance', 'Export Contracts',
        `Negative profit: ${fmt(profit)} ETB`,
        'Contract shows a net loss. Usually indicates data entry errors on costs or pricing.',
        c.id, `Contract ${c.contract_no || '—'}`,
        { buyer_name: c.buyer_name },
        '≥ 0 ETB', fmt(profit), fmtDiff(Math.abs(profit)),
        'Review costs, pricing, materials. Verify all figures.',
        '/export-contracts'));
    }
  });

  // 5g. Unrealistic profit margin
  aec.forEach(c => {
    const profit = parseNum(c.profit_etb || c.total_profit_etb);
    const revenue = parseNum(c.total_export_value_etb || c.grand_total_revenue_etb || c.grand_total_sales_etb);
    if (profit > 0 && revenue > 0) {
      const margin = (profit / revenue) * 100;
      if (margin > UNREALISTIC_MARGIN) {
        results.push(issue('warning', 'Finance', 'Export Contracts',
          `Unrealistic profit margin: ${margin.toFixed(1)}%`,
          'Profit margin exceeds realistic trade margins. Verify costs and pricing.',
          c.id, `Contract ${c.contract_no || '—'}`,
          { buyer_name: c.buyer_name },
          `< ${UNREALISTIC_MARGIN}%`, pct(margin), null,
          'Review costs, materials, and pricing for accuracy.',
          '/export-contracts'));
      }
    }
  });

  // 5h. Missing certificate or PI number (optional info)
  if (AUDIT_RULES.showMissingCertPI) {
    aec.forEach(c => {
      if (!c.certificate_no && !c.contract_pi_number) {
        results.push(issue('info', 'Data Quality', 'Export Contracts',
          'Missing certificate and PI number',
          'Neither certificate number nor PI number is recorded.',
          c.id, `Contract ${c.contract_no || '—'}`,
          { buyer_name: c.buyer_name },
          'ICO-... or PI number', 'Not set', null,
          'Enter the ICO certificate number or PI number.',
          '/export-contracts'));
      }
    });
  }

  // ============================================================================
  // SECTION 6: BUYER INSPECTIONS
  // ============================================================================

  // 6a. Inspection without export contract
  abi.forEach(bi => {
    const hasContract = aec.some(c => c.buyer_name === bi.buyer_name && c.coffee_type === bi.coffee_type);
    if (!hasContract && bi.result === 'Passed') {
      results.push(issue('warning', 'Workflow', 'Buyer Inspections',
        'Passed inspection without export contract',
        `Buyer "${bi.buyer_name}" / "${bi.coffee_type}" has a passed inspection but no matching export contract.`,
        bi.id, `Inspection ${bi.buyer_name || '—'}`,
        { buyer_name: bi.buyer_name, coffee_type: bi.coffee_type },
        'Linked contract', 'None found', null,
        'Create an export contract for this buyer/coffee type.',
        '/export-contracts'));
    }
  });

  // 6b. Missing inspection date
  abi.filter(bi => !bi.inspection_date).forEach(bi => {
    results.push(issue('warning', 'Data Quality', 'Buyer Inspections',
      'Missing inspection date',
      'No inspection date recorded.',
      bi.id, `Inspection ${bi.buyer_name || '—'}`,
      { buyer_name: bi.buyer_name, coffee_type: bi.coffee_type },
      'Any valid date', 'Not set', null,
      'Enter the inspection date.',
      '/buyer-inspections'));
  });

  // 6c. Failed inspection with no action
  abi.filter(bi => bi.result === 'Failed' && !bi.action_taken).forEach(bi => {
    results.push(issue('warning', 'Workflow', 'Buyer Inspections',
      'Failed inspection with no action',
      'Inspection failed but no action (Reprocess/Sell Locally/Hold) was recorded.',
      bi.id, `Inspection ${bi.buyer_name || '—'}`,
      { buyer_name: bi.buyer_name, coffee_type: bi.coffee_type },
      'Action taken', 'Not set', null,
      'Record the action taken for rejected coffee.',
      '/buyer-inspections'));
  });

  // 6d. Contract without inspection (only if AUDIT_RULES.requireBuyerInspectionForEveryContract)
  if (AUDIT_RULES.requireBuyerInspectionForEveryContract) {
    aec.forEach(c => {
      const hasInspection = abi.some(bi => bi.buyer_name === c.buyer_name && bi.coffee_type === c.coffee_type);
      if (!hasInspection && c.buyer_name && c.coffee_type) {
        results.push(issue('info', 'Workflow', 'Export Contracts',
          'No buyer inspection found',
          `Contract for "${c.buyer_name}" / "${c.coffee_type}" has no linked inspection.`,
          c.id, `Contract ${c.contract_no || '—'}`,
          { buyer_name: c.buyer_name, coffee_type: c.coffee_type },
          'Linked inspection', 'Not found', null,
          'Create a buyer inspection for this contract.',
          '/buyer-inspections'));
      }
    });
  }

  // ============================================================================
  // SECTION 7: STOCK RECONCILIATION
  // ============================================================================

  // 7a. Stock pool consistency: sum output exports vs contract exports per coffee type AND pool
  const allTypes = new Set([...ao.map(o => o.coffee_type), ...aec.map(c => c.coffee_type)].filter(Boolean));
  allTypes.forEach(coffeeType => {
    // Fresh pool
    const freshOutputKg = ao
      .filter(o => o.coffee_type === coffeeType && o.entry_type !== 'Recleaned')
      .reduce((s, o) => s + parseNum(o.export_kg), 0);
    const freshContractKg = aec
      .filter(c => c.coffee_type === coffeeType && (c.stock_pool || 'Fresh') === 'Fresh')
      .reduce((s, c) => s + parseNum(c.export_kg), 0);
    if (freshContractKg > freshOutputKg + KG_TOLERANCE) {
      results.push(issue('critical', 'Stock', 'Stock Reconciliation',
        'Contract KG exceeds Fresh output KG',
        `Fresh pool: contracts need ${fmtKg(freshContractKg)} KG of "${coffeeType}" but only ${fmtKg(freshOutputKg)} KG produced.`,
        null, `Coffee type: ${coffeeType} (Fresh)`,
        { coffee_type: coffeeType },
        `≤ ${fmtKg(freshOutputKg)}`, fmtKg(freshContractKg), fmtDiff(freshContractKg - freshOutputKg),
        'Reduce contract quantities or increase processing output for this coffee type.',
        '/stock-report'));
    }
    // Recleaned pool
    const recleanedOutputKg = ao
      .filter(o => o.coffee_type === coffeeType && o.entry_type === 'Recleaned')
      .reduce((s, o) => s + parseNum(o.export_kg), 0);
    const recleanedContractKg = aec
      .filter(c => c.coffee_type === coffeeType && c.stock_pool === 'Recleaned')
      .reduce((s, c) => s + parseNum(c.export_kg), 0);
    if (recleanedContractKg > recleanedOutputKg + KG_TOLERANCE) {
      results.push(issue('critical', 'Stock', 'Stock Reconciliation',
        'Contract KG exceeds Recleaned output KG',
        `Recleaned pool: contracts need ${fmtKg(recleanedContractKg)} KG of "${coffeeType}" but only ${fmtKg(recleanedOutputKg)} KG produced.`,
        null, `Coffee type: ${coffeeType} (Recleaned)`,
        { coffee_type: coffeeType },
        `≤ ${fmtKg(recleanedOutputKg)}`, fmtKg(recleanedContractKg), fmtDiff(recleanedContractKg - recleanedOutputKg),
        'Reduce contract quantities or increase recleaning output for this coffee type.',
        '/stock-report'));
    }
  });

  // 7b. Supplier-level stock: purchased − samples − processing inputs + outputs
  const supplierStock = {};
  aw.forEach(w => {
    if (!w.supplier_name) return;
    const key = w.supplier_name;
    if (!supplierStock[key]) supplierStock[key] = { received: 0, sampled: 0, processed: 0, outputExport: 0, outputReject: 0 };
    supplierStock[key].received += parseNum(w.warehouse_received_net_kg);
  });
  as.filter(s => s.sample_type === 'Warehouse').forEach(s => {
    if (s.supplier_name && supplierStock[s.supplier_name]) {
      supplierStock[s.supplier_name].sampled += parseNum(s.sample_kg);
    }
  });
  apl.filter(pl => pl.entry_type !== 'Recleaning').forEach(pl => {
    if (pl.supplier_name && supplierStock[pl.supplier_name]) {
      supplierStock[pl.supplier_name].processed += parseNum(pl.actual_weighed_kg) || parseNum(pl.kg_sent) || 0;
    }
  });
  ao.forEach(o => {
    if (o.supplier_name && supplierStock[o.supplier_name]) {
      supplierStock[o.supplier_name].outputExport += parseNum(o.export_kg);
      supplierStock[o.supplier_name].outputReject += parseNum(o.reject_kg);
    }
  });

  Object.entries(supplierStock).forEach(([name, stock]) => {
    const remaining = stock.received - stock.sampled - stock.processed;
    if (remaining < -KG_TOLERANCE) {
      results.push(issue('critical', 'Stock', 'Stock Reconciliation',
        'Negative stock for supplier',
        `Supplier "${name}" has more samples + processing (${fmtKg(stock.sampled + stock.processed)}) than received (${fmtKg(stock.received)}). Negative stock of ${fmtKg(Math.abs(remaining))} KG.`,
        null, `Supplier: ${name}`,
        { supplier_name: name },
        '≥ 0', fmtKg(remaining), fmtDiff(Math.abs(remaining)),
        'Verify warehouse receipts, samples, and processing quantities.',
        '/stock-report'));
    }
  });

  // ============================================================================
  // SECTION 8: FINANCIAL RECONCILIATION
  // ============================================================================

  // 8a. Total purchase vs total paid across all purchases
  const totalPurchased = ap.reduce((s, p) => s + parseNum(p.grand_total_etb), 0);
  const totalPaidAll = ap.reduce((s, p) => s + sumPaymentHistory(p), 0);
  const totalBalance = totalPurchased - totalPaidAll;
  // No issue to raise here, just logged for informational purposes — could surface in UI

  // 8b. Total contract revenue vs costs vs profit across all contracts
  const totalContractRevenue = aec.reduce((s, c) => s + parseNum(c.total_export_value_etb || c.grand_total_revenue_etb || c.grand_total_sales_etb), 0);
  const totalContractCosts = aec.reduce((s, c) => s + parseNum(c.total_costs_etb || c.total_expenses_etb), 0);
  const totalContractMaterials = aec.reduce((s, c) => s + parseNum(c.total_materials_etb), 0);
  const totalContractProfit = aec.reduce((s, c) => s + parseNum(c.profit_etb || c.total_profit_etb), 0);
  const expectedTotalProfit = totalContractRevenue - totalContractCosts - totalContractMaterials;
  if (Math.abs(expectedTotalProfit - totalContractProfit) > TOLERANCE_ETB * aec.length) {
    results.push(issue('warning', 'Finance', 'Financial Summary',
      'Aggregate contract profit mismatch',
      `Total profit across all contracts (${fmt(totalContractProfit)}) doesn't match Total Revenue - Costs - Materials (${fmt(expectedTotalProfit)}).`,
      null, 'All contracts',
      {},
      fmt(expectedTotalProfit), fmt(totalContractProfit), fmtDiff(Math.abs(expectedTotalProfit - totalContractProfit)),
      'Review individual contract profit calculations.',
      '/export-contracts'));
  }

  // ============================================================================
  // SECTION 9: SAMPLE LOG
  // ============================================================================

  // 9a. Warehouse sample without source purchase
  as.filter(s => s.sample_type === 'Warehouse').forEach(s => {
    if (s.coffee_code && !coffeeCodeToPurchase[s.coffee_code]) {
      const hasReceipt = aw.some(w => w.coffee_code === s.coffee_code);
      if (!hasReceipt) {
        results.push(issue('warning', 'Workflow', 'Sample Log',
          'Sample references unknown coffee code',
          `Warehouse sample for "${s.coffee_code}" has no purchase or receipt.`,
          s.id, `Sample ${s.coffee_code || '—'}`,
          { coffee_code: s.coffee_code, supplier_name: s.supplier_name },
          'Known code', s.coffee_code, null,
          'Verify coffee code or create a purchase first.',
          '/sample-log'));
      }
    }
  });

  // 9b. Zero sample KG
  as.filter(s => parseNum(s.sample_kg) <= 0).forEach(s => {
    results.push(issue('warning', 'Data Quality', 'Sample Log',
      'Zero sample KG',
      'Sample KG is zero or missing.',
      s.id, `Sample ${s.coffee_code || '—'}`,
      { coffee_code: s.coffee_code, supplier_name: s.supplier_name },
      '> 0 KG', fmtKg(parseNum(s.sample_kg)), null,
      'Enter the sample weight.',
      '/sample-log'));
  });

  // ============================================================================
  // SECTION 10: BAG LEDGER
  // ============================================================================

  const suppBagData = {};
  (bagReceipts || []).filter(active).filter(b => b.supplier_name).forEach(b => {
    const name = b.supplier_name;
    if (!suppBagData[name]) suppBagData[name] = { received: 0, returned: 0, used: 0, paid: 0 };
    suppBagData[name].received += parseNum(b.bags_received);
  });
  (supplierBagReturns || []).filter(active).filter(b => b.supplier_name).forEach(b => {
    const name = b.supplier_name;
    if (!suppBagData[name]) suppBagData[name] = { received: 0, returned: 0, used: 0, paid: 0 };
    suppBagData[name].returned += parseNum(b.bags_returned);
  });
  (rejectBagUsages || []).filter(active).filter(b => b.supplier_name).forEach(b => {
    const name = b.supplier_name;
    if (!suppBagData[name]) suppBagData[name] = { received: 0, returned: 0, used: 0, paid: 0 };
    suppBagData[name].used += parseNum(b.bags_used);
  });
  (supplierBagPayments || []).filter(active).filter(b => b.supplier_name).forEach(b => {
    const name = b.supplier_name;
    if (!suppBagData[name]) suppBagData[name] = { received: 0, returned: 0, used: 0, paid: 0 };
    suppBagData[name].paid += parseNum(b.amount_etb);
  });

  Object.entries(suppBagData).forEach(([name, d]) => {
    const outstanding = d.received - d.returned - d.used;
    if (outstanding < -1) {
      results.push(issue('warning', 'Stock', 'Bag Ledger',
        'Negative bag balance',
        `${name} has more bags used/returned (${d.returned + d.used}) than received (${d.received}).`,
        null, `Supplier: ${name}`,
        { supplier_name: name },
        '≥ 0', String(outstanding), fmtDiff(Math.abs(outstanding)),
        'Review bag receipts, returns, and usage for this supplier.',
        '/bag-ledger'));
    }
    if (d.paid > 0 && d.received === 0) {
      results.push(issue('warning', 'Finance', 'Bag Ledger',
        'Payments without bag receipts',
        `${name} has bag payments of ${fmt(d.paid)} ETB but zero receipts.`,
        null, `Supplier: ${name}`,
        { supplier_name: name },
        'Bags received > 0', 'No receipts', null,
        'Record bag receipts or verify the payments.',
        '/bag-ledger'));
    }
  });

  // ============================================================================
  // SECTION 11: MATERIALS REGISTER
  // ============================================================================

  (materialEntries || []).filter(active).forEach(m => {
    const qty = parseNum(m.quantity);
    const unit = parseNum(m.unit_cost_etb);
    const expectedTotal = qty * unit;
    const savedTotal = parseNum(m.total_cost_etb);
    if (savedTotal !== null && unit > 0 && Math.abs(expectedTotal - savedTotal) > TOLERANCE_ETB) {
      results.push(issue('warning', 'Finance', 'Materials Register',
        'Material total cost mismatch',
        `Quantity (${qty}) × Unit Cost (${unit}) = ${fmt(expectedTotal)} ETB, but ${fmt(savedTotal)} ETB stored.`,
        m.id, `Material: ${m.item_name || m.item_type || '—'}`,
        {},
        fmt(expectedTotal), fmt(savedTotal), fmtDiff(Math.abs(expectedTotal - savedTotal)),
        'Update total cost to match Qty × Unit Cost.',
        '/materials-register'));
    }
  });

  // ============================================================================
  // SECTION 12: SUSPICIOUS VALUES — FUTURE DATES
  // ============================================================================

  const now = new Date();
  [
    { list: ap, field: 'purchase_date', mod: 'Purchase Registration', label: p => `Purchase ${p.coffee_code || '—'}`, meta: p => ({ coffee_code: p.coffee_code, supplier_name: p.supplier_name }), route: '/purchase-registration' },
    { list: aw, field: 'received_date', mod: 'Warehouse Receipt', label: w => `Receipt ${w.grn_code || w.coffee_code || '—'}`, meta: w => ({ coffee_code: w.coffee_code, supplier_name: w.supplier_name }), route: '/warehouse-receipt' },
    { list: ao, field: r => r.start_date || r.date, mod: 'Output Report', label: o => `Output ${o.supplier_name || '—'}`, meta: o => ({ supplier_name: o.supplier_name }), route: '/output-report' },
    { list: aec, field: r => r.contract_date || r.export_date, mod: 'Export Contracts', label: c => `Contract ${c.contract_no || '—'}`, meta: c => ({ buyer_name: c.buyer_name }), route: '/export-contracts' },
    { list: abi, field: 'inspection_date', mod: 'Buyer Inspections', label: bi => `Inspection ${bi.buyer_name || '—'}`, meta: bi => ({ buyer_name: bi.buyer_name }), route: '/buyer-inspections' },
    { list: as, field: 'sample_date', mod: 'Sample Log', label: s => `Sample ${s.coffee_code || '—'}`, meta: s => ({ coffee_code: s.coffee_code }), route: '/sample-log' },
    { list: apl, field: 'date', mod: 'Processing Log', label: pl => `Processing ${pl.batch_no || '—'}`, meta: pl => ({ supplier_name: pl.supplier_name, coffee_code: pl.coffee_code }), route: '/processing-log' },
  ].forEach(({ list, field, mod, label, meta, route }) => {
    list.forEach(r => {
      const v = typeof field === 'function' ? field(r) : r[field];
      if (v) {
        const d = dateVal(v);
        if (d && d > now) {
          results.push(issue('warning', 'Data Quality', mod,
            'Future date detected',
            `Date "${(v || '').split ? v.split('T')[0] : v}" is in the future.`,
            r.id, label(r), meta(r),
            '≤ today', (v || '').split ? v.split('T')[0] : String(v), null,
            'Verify and correct the date.',
            route));
        }
      }
    });
  });

  // ============================================================================
  // SECTION 13: SUSPICIOUS VALUES — NEGATIVE NUMBERS
  // ============================================================================

  const negChecks = [
    ...ap.flatMap(p => [
      [p, 'net_dispatch_weight_kg', 'weight', 'Purchase Registration', () => `Purchase ${p.coffee_code || '—'}`, () => ({ coffee_code: p.coffee_code, supplier_name: p.supplier_name }), '/purchase-registration'],
      [p, 'unit_price_etb_per_feresula', 'unit price', 'Purchase Registration', () => `Purchase ${p.coffee_code || '—'}`, () => ({ coffee_code: p.coffee_code, supplier_name: p.supplier_name }), '/purchase-registration'],
      [p, 'grand_total_etb', 'grand total', 'Purchase Registration', () => `Purchase ${p.coffee_code || '—'}`, () => ({ coffee_code: p.coffee_code, supplier_name: p.supplier_name }), '/purchase-registration'],
    ]),
    ...aw.flatMap(w => [
      [w, 'warehouse_received_net_kg', 'received KG', 'Warehouse Receipt', () => `Receipt ${w.grn_code || w.coffee_code}`, () => ({ coffee_code: w.coffee_code, supplier_name: w.supplier_name }), '/warehouse-receipt'],
      [w, 'bags_received', 'bags received', 'Warehouse Receipt', () => `Receipt ${w.grn_code || w.coffee_code}`, () => ({ coffee_code: w.coffee_code, supplier_name: w.supplier_name }), '/warehouse-receipt'],
    ]),
    ...ao.flatMap(o => [
      [o, 'total_kg_processed', 'processed KG', 'Output Report', () => `Output ${o.supplier_name || '—'}`, () => ({ supplier_name: o.supplier_name }), '/output-report'],
      [o, 'export_kg', 'export KG', 'Output Report', () => `Output ${o.supplier_name || '—'}`, () => ({ supplier_name: o.supplier_name }), '/output-report'],
      [o, 'export_bags', 'export bags', 'Output Report', () => `Output ${o.supplier_name || '—'}`, () => ({ supplier_name: o.supplier_name }), '/output-report'],
      [o, 'reject_kg', 'reject KG', 'Output Report', () => `Output ${o.supplier_name || '—'}`, () => ({ supplier_name: o.supplier_name }), '/output-report'],
      [o, 'reject_bags', 'reject bags', 'Output Report', () => `Output ${o.supplier_name || '—'}`, () => ({ supplier_name: o.supplier_name }), '/output-report'],
      [o, 'waste_kg', 'waste KG', 'Output Report', () => `Output ${o.supplier_name || '—'}`, () => ({ supplier_name: o.supplier_name }), '/output-report'],
    ]),
    ...aec.flatMap(c => [
      [c, 'export_kg', 'export KG', 'Export Contracts', () => `Contract ${c.contract_no || '—'}`, () => ({ buyer_name: c.buyer_name }), '/export-contracts'],
      [c, 'export_bags', 'export bags', 'Export Contracts', () => `Contract ${c.contract_no || '—'}`, () => ({ buyer_name: c.buyer_name }), '/export-contracts'],
      [c, 'profit_etb', 'profit ETB', 'Export Contracts', () => `Contract ${c.contract_no || '—'}`, () => ({ buyer_name: c.buyer_name }), '/export-contracts'],
    ]),
    ...as.flatMap(s => [
      [s, 'sample_kg', 'sample KG', 'Sample Log', () => `Sample ${s.coffee_code || '—'}`, () => ({ coffee_code: s.coffee_code }), '/sample-log'],
    ]),
    ...(rejectBagUsages || []).filter(active).flatMap(b => [
      [b, 'bags_used', 'bags used', 'Bag Ledger', () => `Reject: ${b.supplier_name || b.agent_name || '—'}`, () => ({ supplier_name: b.supplier_name }), '/bag-ledger'],
    ]),
    ...(supplierBagPayments || []).filter(active).flatMap(b => [
      [b, 'amount_etb', 'payment amount', 'Bag Ledger', () => `Payment: ${b.supplier_name || b.agent_name || '—'}`, () => ({ supplier_name: b.supplier_name }), '/bag-ledger'],
    ]),
  ];

  negChecks.forEach(([rec, field, fieldLabel, mod, lfn, mfn, route]) => {
    const val = parseNum(rec[field]);
    if (val < -TOLERANCE_ETB) {
      results.push(issue('warning', 'Data Quality', mod,
        `Negative ${fieldLabel}`,
        `${field} is ${fmt(val)} (negative). Should normally be positive.`,
        rec.id, lfn(), mfn(), '≥ 0', fmt(val), fmtDiff(Math.abs(val)),
        `Verify the ${fieldLabel}.`,
        route));
    }
  });

  // ============================================================================
  // SECTION 14: SUSPICIOUS VALUES — DATE ORDER CHECKS
  // ============================================================================

  // Received date before purchase date
  aw.forEach(w => {
    const purchase = coffeeCodeToPurchase[w.coffee_code];
    if (purchase && w.received_date && purchase.purchase_date) {
      const received = dateVal(w.received_date);
      const purchased = dateVal(purchase.purchase_date);
      if (received && purchased && received < purchased) {
        results.push(issue('warning', 'Data Quality', 'Warehouse Receipt',
          'Received date before purchase date',
          'Warehouse receipt date is earlier than the purchase date. Coffee was received before it was purchased.',
          w.id, `Receipt ${w.grn_code || w.coffee_code}`,
          { coffee_code: w.coffee_code, supplier_name: w.supplier_name },
          `≥ ${purchase.purchase_date}`, w.received_date, null,
          'Correct either the purchase date or the receipt date.',
          '/warehouse-receipt'));
      }
    }
  });

  // Processing date before warehouse receipt
  apl.forEach(pl => {
    if (pl.supplier_name && pl.date) {
      const recs = supplierReceipts[pl.supplier_name.toLowerCase()] || [];
      const earliestReceipt = recs.reduce((earliest, r) => {
        if (!r.received_date) return earliest;
        const d = dateVal(r.received_date);
        return (!earliest || (d && d < earliest)) ? d : earliest;
      }, null);
      const procDate = dateVal(pl.date);
      if (earliestReceipt && procDate && procDate < earliestReceipt) {
        results.push(issue('warning', 'Data Quality', 'Processing Log',
          'Processing date before receipt date',
          `Processing started on ${pl.date} but earliest warehouse receipt is ${earliestReceipt.toISOString().split('T')[0]}.`,
          pl.id, `Processing ${pl.batch_no || pl.supplier_name}`,
          { supplier_name: pl.supplier_name },
          `≥ ${earliestReceipt.toISOString().split('T')[0]}`, pl.date, null,
          'Correct the processing or receipt date.',
          '/processing-log'));
      }
    }
  });

  // ============================================================================
  // SECTION 15: ARCHIVE CONSISTENCY
  // ============================================================================

  const archivedPurchaseCodes = new Set(purchases.filter(p => p.archived).map(p => p.coffee_code));
  aw.forEach(w => {
    if (w.coffee_code && archivedPurchaseCodes.has(w.coffee_code)) {
      results.push(issue('warning', 'Workflow', 'Warehouse Receipt',
        'Active receipt linked to archived purchase',
        `Purchase "${w.coffee_code}" is archived but this receipt is active.`,
        w.id, `Receipt ${w.grn_code || w.coffee_code}`,
        { coffee_code: w.coffee_code, supplier_name: w.supplier_name },
        'Both active or both archived', 'Inconsistent', null,
        'Archive this receipt or restore the purchase.',
        '/warehouse-receipt'));
    }
  });

  // ============================================================================
  // SECTION 16: MISSING DATES (all modules)
  // ============================================================================

  [
    { list: ap, filter: r => !r.purchase_date, field: 'purchase_date', mod: 'Purchase Registration', label: r => `Purchase ${r.coffee_code || '—'}`, meta: r => ({ coffee_code: r.coffee_code, supplier_name: r.supplier_name }), route: '/purchase-registration' },
    { list: aw, filter: r => !r.received_date, field: 'received_date', mod: 'Warehouse Receipt', label: r => `Receipt ${r.grn_code || r.coffee_code || '—'}`, meta: r => ({ coffee_code: r.coffee_code, supplier_name: r.supplier_name }), route: '/warehouse-receipt' },
    { list: ao, filter: r => !r.start_date && !r.date, field: 'start_date', mod: 'Output Report', label: r => `Output ${r.supplier_name || '—'}`, meta: r => ({ supplier_name: r.supplier_name }), route: '/output-report' },
    { list: aec, filter: r => !r.contract_date && !r.export_date, field: 'contract_date', mod: 'Export Contracts', label: r => `Contract ${r.contract_no || '—'}`, meta: r => ({ buyer_name: r.buyer_name }), route: '/export-contracts' },
    { list: abi, filter: r => !r.inspection_date, field: 'inspection_date', mod: 'Buyer Inspections', label: r => `Inspection ${r.buyer_name || '—'}`, meta: r => ({ buyer_name: r.buyer_name }), route: '/buyer-inspections' },
  ].forEach(({ list, filter, field, mod, label, meta, route }) => {
    list.filter(filter).forEach(r => {
      results.push(issue('warning', 'Data Quality', mod,
        `Missing ${field.replace(/_/g, ' ')}`,
        `Required date field is empty. Record may be excluded from reports.`,
        r.id, label(r), meta(r), 'Any valid date', 'Not set', null,
        `Enter the ${field.replace(/_/g, ' ')}.`,
        route));
    });
  });

  // Attach check count for display
  const checkCount = 40;
  /** @type {any} */ (results)._checkCount = checkCount;
  return results;
}
