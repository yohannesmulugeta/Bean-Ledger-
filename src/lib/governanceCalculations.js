import { computeAvailabilityBySupplier } from './availabilityUtils.js';

const active = (row) => row?.archived !== true && !row?.archived_at;
const number = (value) => Number(value || 0);

const DATE_FIELDS = {
  purchases: 'purchase_date',
  receipts: 'received_date',
  sampleLogs: 'sample_date',
  processingLogs: 'processing_date',
  outputReports: 'start_date',
  exportContracts: 'contract_date',
  buyerInspections: 'inspection_date',
  stockAdjustments: 'adjustment_date',
};

export function inDateRange(value, fromDate, toDate) {
  if (!value) return false;
  const day = String(value).slice(0, 10);
  return (!fromDate || day >= fromDate) && (!toDate || day <= toDate);
}

export function filterSnapshotByDate(snapshot = {}, fromDate, toDate) {
  return Object.fromEntries(Object.entries(snapshot).map(([key, value]) => {
    if (!Array.isArray(value) || !DATE_FIELDS[key]) return [key, value];
    return [key, value.filter((row) => inDateRange(row[DATE_FIELDS[key]] || row.date, fromDate, toDate))];
  }));
}

export function buildCommissionRows({ purchases = [], receipts = [] }, fromDate, toDate) {
  const activeReceipts = receipts.filter(active);
  return purchases.filter(active).filter((purchase) => inDateRange(purchase.purchase_date, fromDate, toDate)).map((purchase) => {
    const linked = activeReceipts.filter((receipt) =>
      (purchase.id && receipt.purchase_record_id === purchase.id)
      || (purchase.coffee_code && receipt.coffee_code === purchase.coffee_code)
    );
    const receivedKg = linked.reduce((sum, receipt) => sum + number(receipt.warehouse_received_net_kg ?? receipt.received_kg), 0);
    const dispatchKg = number(purchase.net_dispatch_weight_kg);
    const basisKg = receivedKg > 0 ? receivedKg : dispatchKg;
    const commissionPercent = number(purchase.commission_percent);
    const expectedCommissionEtb = basisKg / 17 * number(purchase.unit_price_etb_per_feresula) * commissionPercent / 100;
    const storedCommissionEtb = number(purchase.commission_etb);
    const warnings = [];
    if (!purchase.agent && commissionPercent > 0) warnings.push('Commission has no agent');
    if (purchase.agent && commissionPercent <= 0) warnings.push('Agent has 0% commission');
    if (receivedKg <= 0) warnings.push('Estimated from dispatch; receipt pending');
    if (storedCommissionEtb && Math.abs(storedCommissionEtb - expectedCommissionEtb) > 1) warnings.push('Stored commission differs');
    return {
      id: purchase.id,
      purchaseDate: purchase.purchase_date,
      coffeeCode: purchase.coffee_code,
      supplierName: purchase.supplier_name,
      agent: purchase.agent || 'Unassigned',
      basis: receivedKg > 0 ? 'Warehouse receipt' : 'Dispatch estimate',
      basisKg,
      commissionPercent,
      expectedCommissionEtb,
      storedCommissionEtb,
      warnings,
    };
  });
}

export function buildAnnualReport(snapshot = {}, fromDate, toDate) {
  const filtered = filterSnapshotByDate(snapshot, fromDate, toDate);
  const purchases = (filtered.purchases || []).filter(active);
  const receipts = (filtered.receipts || []).filter(active);
  const sampleLogs = (filtered.sampleLogs || []).filter(active);
  const processingLogs = (filtered.processingLogs || []).filter(active);
  const outputReports = (filtered.outputReports || []).filter(active);
  const exportContracts = (filtered.exportContracts || []).filter(active);
  const stockAdjustments = (filtered.stockAdjustments || []).filter((row) => active(row) && row.status === 'approved');
  const receiptCodes = new Set(receipts.map((row) => row.coffee_code).filter(Boolean));
  const availability = computeAvailabilityBySupplier({
    receipts,
    purchases,
    sampleLogs,
    processingLogs,
    adjustments: stockAdjustments,
  });
  const warnings = [];
  const missingReceipts = purchases.filter((row) => !receiptCodes.has(row.coffee_code)).length;
  if (missingReceipts) warnings.push(`${missingReceipts} purchase(s) have no warehouse receipt in this period.`);
  const pendingBalances = purchases.filter((row) => number(row.balance_etb) > 1).length;
  if (pendingBalances) warnings.push(`${pendingBalances} purchase(s) have an outstanding balance.`);
  if (!stockAdjustments.length) warnings.push('No approved stock adjustments are linked to this period.');

  return {
    period: { fromDate, toDate },
    totals: {
      purchaseCount: purchases.length,
      dispatchKg: purchases.reduce((sum, row) => sum + number(row.net_dispatch_weight_kg), 0),
      receivedKg: receipts.reduce((sum, row) => sum + number(row.warehouse_received_net_kg ?? row.received_kg), 0),
      sampleKg: sampleLogs.reduce((sum, row) => sum + number(row.sample_kg), 0),
      processingKg: processingLogs.reduce((sum, row) => sum + number(row.actual_weighed_kg ?? row.kg_sent), 0),
      outputExportKg: outputReports.reduce((sum, row) => sum + number(row.export_kg), 0),
      outputRejectKg: outputReports.reduce((sum, row) => sum + number(row.reject_kg), 0),
      contractedKg: exportContracts.reduce((sum, row) => sum + number(row.export_kg), 0),
      purchaseValueEtb: purchases.reduce((sum, row) => sum + number(row.grand_total_etb), 0),
      paidEtb: purchases.reduce((sum, row) => sum + number(row.total_paid_etb), 0),
      balanceEtb: purchases.reduce((sum, row) => sum + number(row.balance_etb), 0),
      remainingSupplierKg: Object.values(availability).reduce((sum, row) => sum + number(row.availableKg), 0),
      adjustmentKg: stockAdjustments.reduce((sum, row) => sum + number(row.quantity_kg), 0),
    },
    warnings,
    adjustmentIds: stockAdjustments.map((row) => row.id),
  };
}

export function countSnapshotRows(snapshot = {}) {
  return Object.values(snapshot).reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);
}
