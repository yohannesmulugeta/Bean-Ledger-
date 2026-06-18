import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEMO_META,
  seedSuppliers,
  seedPurchases,
  seedWarehouseReceipts,
  seedSampleLogs,
  seedProcessingLogs,
  seedOutputReports,
  seedExportContracts,
  seedBuyerInspections,
  seedBagReceipts,
  seedRejectBagUsages,
  seedSupplierBagReturns,
  seedSupplierBagPayments,
  seedSupplierBagSettlements,
  seedMaterialMovements,
} from '../../src/services/demoData.js';
import { calculateBagSummary, calculateMaterialBalance } from '../../src/lib/bagMaterialCalculations.js';
import { computeAvailabilityBySupplier } from '../../src/lib/availabilityUtils.js';
import { computeStockPools } from '../../src/lib/stockPools.js';

const active = (row) => !row.archived_at && row.archived !== true;
const sum = (rows, pick) => rows.filter(active).reduce((total, row) => total + Number(pick(row) || 0), 0);

assert.equal(DEMO_META.label, 'Demo Environment', 'demo environment label is explicit');

const activeReceipts = seedWarehouseReceipts.filter(active);
const activeSamples = seedSampleLogs.filter(active);
const activeProcessing = seedProcessingLogs.filter(active);
const activeOutputs = seedOutputReports.filter(active);
const activeContracts = seedExportContracts.filter(active);

const warehouseReceivedKg = sum(seedWarehouseReceipts, (row) => row.received_kg);
assert.equal(warehouseReceivedKg, 3196, 'dashboard excludes archived warehouse receipts');
assert.equal(sum(seedWarehouseReceipts, (row) => row.received_kg) < seedWarehouseReceipts.reduce((total, row) => total + row.received_kg, 0), true, 'archived receipts would inflate active stock');

const availability = computeAvailabilityBySupplier({
  receipts: activeReceipts.map((row) => ({ ...row, warehouse_received_net_kg: row.received_kg, net_dispatch_weight_kg: row.dispatch_kg })),
  purchases: seedPurchases,
  sampleLogs: activeSamples,
  processingLogs: activeProcessing.map((row) => ({ ...row, date: row.processing_date })),
});
assert.ok(Object.values(availability).every((row) => row.availableKg >= 0), 'supplier stock summary has no negative balances');

const pools = computeStockPools({
  outputReports: activeOutputs,
  contracts: activeContracts.map((row) => ({ ...row, commodity: row.coffee_type })),
  inspections: seedBuyerInspections.filter(active),
  sampleLogs: activeSamples,
});
assert.ok(Object.values(pools.fresh).some((kg) => kg > 0), 'fresh export stock is reported');
assert.ok(Object.values(pools.recleaned).every((kg) => kg >= 0), 'recleaned stock has no negative balance');

const bagSummary = calculateBagSummary({
  receipts: seedBagReceipts,
  usages: seedRejectBagUsages,
  returns: seedSupplierBagReturns,
  payments: seedSupplierBagPayments,
  settlements: seedSupplierBagSettlements,
});
assert.ok(bagSummary.some((row) => row.holder_name === 'Demo Agent A'), 'bag balance summary includes demo agent');
assert.ok(bagSummary.every((row) => row.bags_remaining_to_return >= 0), 'bag balance summary is non-negative');

const materialBalance = calculateMaterialBalance(seedMaterialMovements);
assert.ok(materialBalance.some((row) => row.item_key === 'Bag 60kg' && row.balance === 74), 'material balance summary is available');

const archivedCounts = {
  warehouseReceipts: seedWarehouseReceipts.filter((row) => row.archived_at).length,
  sampleLogs: seedSampleLogs.filter((row) => row.archived_at).length,
  processingLogs: seedProcessingLogs.filter((row) => row.archived_at).length,
  exportContracts: seedExportContracts.filter((row) => row.archived_at).length,
  bagReceipts: seedBagReceipts.filter((row) => row.archived_at).length,
};
assert.deepEqual(archivedCounts, {
  warehouseReceipts: 1,
  sampleLogs: 1,
  processingLogs: 1,
  exportContracts: 1,
  bagReceipts: 1,
}, 'archived demo records are present for the archive viewer');

const sql = readFileSync('supabase/migrations/202606180008_phase9_dashboard_reports_demo_schema.sql', 'utf8');
const seedSql = readFileSync('supabase/seed.sql', 'utf8');
[
  'demo_dashboard_summary_v',
  'get_demo_dashboard_summary',
  'get_demo_report_snapshot',
  'get_demo_audit_log_feed',
  'get_demo_archived_records_feed',
].forEach((name) => assert.ok(sql.includes(name), `${name} exists in migration`));
assert.ok(sql.includes('archived_at is null'), 'reporting SQL excludes archived records from active summaries');
assert.ok(seedSql.includes('Synthetic Phase 9 audit seed'), 'seed file adds clearly synthetic audit rows');

assert.equal(seedSuppliers.every((row) => row.is_demo), true, 'supplier seeds are demo data');
assert.equal(seedPurchases.every((row) => row.is_demo), true, 'purchase seeds are demo data');

console.log('Phase 9 dashboard and reporting workflow tests passed');
