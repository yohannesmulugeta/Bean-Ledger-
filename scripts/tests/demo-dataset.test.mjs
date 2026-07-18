import assert from 'node:assert/strict';
import fs from 'node:fs';

import { calculateBagSummary, calculateMaterialBalance } from '../../src/lib/bagMaterialCalculations.js';
import runDataAudit from '../../src/lib/dataAudit.js';
import { calculatePurchaseTotals } from '../../src/lib/purchaseCalculations.js';
import { DEMO_DATA_VERSION, DEMO_META, freshDemoStore } from '../../src/services/demoData.js';

const store = freshDemoStore();
const active = (row) => !row.archived_at;
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const byId = (rows) => new Map(rows.map((row) => [row.id, row]));

assert.equal(DEMO_META.companyName, 'BeanLedger Export PLC');
assert.equal(DEMO_DATA_VERSION, 'beanledger-showcase-2026-07-v1');
assert.equal(new Set(store.suppliers.map((supplier) => supplier.agent)).size, 6, 'six procurement agents');
assert.deepEqual(
  Object.fromEntries(Object.entries(store.purchases.reduce((counts, purchase) => {
    const year = purchase.purchase_date.slice(0, 4);
    counts[year] = (counts[year] || 0) + 1;
    return counts;
  }, {}))),
  { 2024: 36, 2025: 48, 2026: 36 },
);

const expectedCounts = {
  suppliers: 12,
  purchases: 120,
  warehouseReceipts: 120,
  sampleLogs: 120,
  processingLogs: 84,
  outputReports: 84,
  exportContracts: 18,
  buyerInspections: 18,
  additionalCosts: 180,
  payments: 240,
  attachments: 30,
  notifications: 8,
  stockAdjustments: 4,
  annualReportingPeriods: 2,
  backupExports: 6,
};
Object.entries(expectedCounts).forEach(([key, count]) => assert.equal(store[key].length, count, `${key} count`));

const allRecords = Object.values(store).flatMap((value) => Array.isArray(value) ? value : []);
const ids = allRecords.map((row) => row?.id).filter(Boolean);
assert.equal(new Set(ids).size, ids.length, 'record IDs must be globally unique');
assert.equal(new Set(store.purchases.map((row) => row.coffee_code)).size, store.purchases.length);
assert.equal(new Set(store.warehouseReceipts.map((row) => row.receipt_number)).size, store.warehouseReceipts.length);
assert.equal(new Set(store.processingLogs.map((row) => row.batch_no)).size, store.processingLogs.length);
assert.equal(new Set(store.exportContracts.map((row) => row.contract_no)).size, store.exportContracts.length);

const suppliers = byId(store.suppliers);
const purchases = byId(store.purchases);
const receipts = byId(store.warehouseReceipts);
const processing = byId(store.processingLogs);
const outputs = byId(store.outputReports);
const contracts = byId(store.exportContracts);
const adjustments = byId(store.stockAdjustments);
const periods = byId(store.annualReportingPeriods);

for (const purchase of store.purchases) {
  assert(suppliers.has(purchase.supplier_id), `purchase supplier: ${purchase.coffee_code}`);
  const costs = store.additionalCosts.filter((row) => row.purchase_record_id === purchase.id && active(row));
  const payments = store.payments.filter((row) => row.purchase_record_id === purchase.id && active(row));
  const totals = calculatePurchaseTotals({ ...purchase, additional_costs: costs, payments });
  assert.equal(totals.payment_status, 'Paid', `purchase paid: ${purchase.coffee_code}`);
  assert.equal(totals.balance_etb, 0, `purchase balance: ${purchase.coffee_code}`);
  assert(Math.abs(round2(payments.reduce((sum, row) => sum + row.amount_etb, 0)) - round2(totals.grand_total_etb)) <= 1);
}

for (const receipt of store.warehouseReceipts) {
  const purchase = purchases.get(receipt.purchase_record_id);
  assert(purchase, `receipt purchase: ${receipt.receipt_number}`);
  assert(suppliers.has(receipt.supplier_id), `receipt supplier: ${receipt.receipt_number}`);
  assert(receipt.received_date >= purchase.purchase_date);
  assert.equal(round2(receipt.received_kg + receipt.shortage_kg), round2(receipt.dispatch_kg));
}

for (const sample of store.sampleLogs) {
  const receipt = receipts.get(sample.warehouse_receipt_id);
  assert(receipt, `sample receipt: ${sample.id}`);
  assert(purchases.has(sample.purchase_record_id));
  assert(sample.sample_date >= receipt.received_date);
}

for (const batch of store.processingLogs) {
  const receipt = receipts.get(batch.warehouse_receipt_id);
  assert(receipt, `batch receipt: ${batch.batch_no}`);
  assert(batch.processing_date >= receipt.received_date);
  const sampleKg = store.sampleLogs
    .filter((row) => row.purchase_record_id === batch.purchase_record_id && active(row))
    .reduce((sum, row) => sum + row.sample_kg, 0);
  assert(batch.actual_weighed_kg + sampleKg <= receipt.received_kg, `supplier stock: ${batch.batch_no}`);
}

for (const output of store.outputReports) {
  const batch = processing.get(output.processing_log_id);
  assert(batch, `output batch: ${output.id}`);
  assert.equal(round2(output.total_kg_processed), round2(batch.actual_weighed_kg));
  assert.equal(round2(output.export_kg), round2(output.export_bags * 60));
  assert.equal(round2(output.reject_kg), round2(output.reject_bags * 85));
  assert.equal(round2(output.export_kg + output.reject_kg + output.waste_kg), round2(output.total_kg_processed));
}

for (const contract of store.exportContracts) {
  const output = outputs.get(contract.output_report_id);
  assert(output, `contract output: ${contract.contract_no}`);
  assert(contract.contract_date >= output.end_date);
  assert(contract.export_kg <= output.export_kg);
  const payments = store.exportContractPayments.filter((row) => row.export_contract_id === contract.id);
  assert.equal(round2(payments.reduce((sum, row) => sum + row.amount_usd, 0)), round2(contract.total_export_value_usd));
  assert.equal(round2(payments.reduce((sum, row) => sum + row.amount_etb, 0)), round2(contract.total_export_value_etb));
  assert.equal(contract.payment_status, 'Fully Received');
  assert.equal(contract.status, 'Completed');
}

for (const inspection of store.buyerInspections) {
  const contract = contracts.get(inspection.export_contract_id);
  assert(contract, `inspection contract: ${inspection.id}`);
  assert.equal(inspection.result, 'Passed');
  assert(inspection.kg_approved > 0 && inspection.kg_approved <= inspection.kg_to_inspect);
  assert(inspection.inspection_date >= outputs.get(contract.output_report_id).end_date);
  assert(inspection.inspection_date <= contract.contract_date);
}

for (const row of store.additionalCosts) assert(purchases.has(row.purchase_record_id));
for (const row of store.payments) assert(purchases.has(row.purchase_record_id));
for (const row of store.warehouseHistory) assert(receipts.has(row.warehouse_receipt_id));
for (const row of store.exportContractCosts) assert(contracts.has(row.export_contract_id));
for (const row of store.exportContractMaterials) assert(contracts.has(row.export_contract_id));
for (const row of store.exportContractPayments) assert(contracts.has(row.export_contract_id));
for (const row of store.materialMovements) assert(store.materialRegisterEntries.some((entry) => entry.id === row.material_register_entry_id));
for (const row of store.yearEndStockAdjustments) {
  assert(periods.has(row.annual_reporting_period_id));
  assert(adjustments.has(row.stock_adjustment_id));
}

const bagSummary = calculateBagSummary({
  receipts: store.bagReceipts.filter(active),
  usages: store.rejectBagUsages.filter(active),
  returns: store.supplierBagReturns.filter(active),
  payments: store.supplierBagPayments.filter(active),
  settlements: store.supplierBagSettlements.filter(active),
});
bagSummary.forEach((row) => {
  assert(row.bags_remaining_to_return >= 0, `bag balance: ${row.holder_name}`);
  assert(row.cash_remaining_etb >= 0, `bag cash: ${row.holder_name}`);
});
calculateMaterialBalance(store.materialMovements.filter(active)).forEach((row) => {
  assert(row.balance >= 0, `material balance: ${row.item_key}`);
});

const decorate = (row) => ({ ...row, archived: Boolean(row.archived_at) });
const auditPurchases = store.purchases.map((purchase) => {
  const costs = store.additionalCosts.filter((row) => row.purchase_record_id === purchase.id && active(row));
  const payments = store.payments.filter((row) => row.purchase_record_id === purchase.id && active(row));
  const totals = calculatePurchaseTotals({ ...purchase, additional_costs: costs, payments });
  return {
    ...decorate(purchase),
    ...totals,
    total_purchase_price: totals.total_purchase_price_etb,
    total_paid: totals.total_paid_etb,
    balance: totals.balance_etb,
    additional_costs: JSON.stringify(costs.map((row) => ({ name: row.name, amount: row.amount_etb }))),
    payment_history: JSON.stringify(payments),
  };
});
const auditIssues = runDataAudit({
  suppliers: store.suppliers.map(decorate),
  purchases: auditPurchases,
  warehouseReceipts: store.warehouseReceipts.map((row) => ({ ...decorate(row), warehouse_received_net_kg: row.received_kg, net_dispatch_weight_kg: row.dispatch_kg, grn_code: row.receipt_number })),
  sampleLogs: store.sampleLogs.map(decorate),
  processingLogs: store.processingLogs.map(decorate),
  outputReports: store.outputReports.map(decorate),
  exportContracts: store.exportContracts.map(decorate),
  buyerInspections: store.buyerInspections.map(decorate),
  bagReceipts: store.bagReceipts.map(decorate),
  rejectBagUsages: store.rejectBagUsages.map(decorate),
  supplierBagPayments: store.supplierBagPayments.map(decorate),
  supplierBagReturns: store.supplierBagReturns.map(decorate),
  materialEntries: store.materialRegisterEntries.map(decorate),
});
const activeAuditFindings = auditIssues.filter((row) => row.severity === 'critical' || row.severity === 'warning');
assert.deepEqual(activeAuditFindings, [], `active audit findings: ${activeAuditFindings.map((row) => row.problem_title).join(', ')}`);

const archivedRecords = allRecords.filter((row) => row.archived_at);
assert(archivedRecords.length > 0);
archivedRecords.forEach((row) => assert(row.archive_reason || row.reason || row.notes || row.note || row.description, `archive reason: ${row.id}`));

const serialized = JSON.stringify(store);
assert(!/Demo Wollega|Demo Guji|Demo Sidama/i.test(serialized), 'legacy fixture names must be absent');
assert(!serialized.includes('DEMO-'), 'legacy business references must be absent');
assert(!serialized.includes('Synthetic Phase'), 'synthetic phase wording must be absent');
assert(allRecords.every((row) => row.is_demo === undefined || row.is_demo === true));

const sql = fs.readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8');
assert(sql.includes(DEMO_DATA_VERSION));
assert(sql.includes(DEMO_META.companyName));
assert(!/Demo Wollega|Demo Guji|Demo Sidama/i.test(sql));
assert(!sql.includes('DEMO-'));

console.log(`Demo dataset validated: ${store.purchases.length} purchases, ${store.processingLogs.length} batches, ${store.exportContracts.length} export contracts, zero active audit warnings.`);
