import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  seedPurchases,
  seedWarehouseReceipts,
  seedSampleLogs,
  seedProcessingLogs,
  seedOutputReports,
  seedExportContracts,
  seedBuyerInspections,
  seedStockAdjustments,
} from '../../src/services/demoData.js';
import { computeAvailabilityBySupplier } from '../../src/lib/availabilityUtils.js';
import { computeStockPools } from '../../src/lib/stockPools.js';
import { buildAnnualReport, buildCommissionRows } from '../../src/lib/governanceCalculations.js';

const active = (row) => !row.archived_at;
const receipts = seedWarehouseReceipts.filter(active).map((row) => ({ ...row, warehouse_received_net_kg: row.received_kg, archived: false }));
const samples = seedSampleLogs.filter(active).map((row) => ({ ...row, archived: false }));
const processing = seedProcessingLogs.filter(active).map((row) => ({ ...row, archived: false }));
const adjustments = seedStockAdjustments.map((row) => ({ ...row, archived: false }));

const withoutAdjustments = computeAvailabilityBySupplier({ receipts, purchases: seedPurchases, sampleLogs: samples, processingLogs: processing });
const withAdjustments = computeAvailabilityBySupplier({ receipts, purchases: seedPurchases, sampleLogs: samples, processingLogs: processing, adjustments });
const adjustedSupplier = seedStockAdjustments[0].supplier_name;
assert.equal(withAdjustments[adjustedSupplier].availableKg - withoutAdjustments[adjustedSupplier].availableKg, seedStockAdjustments[0].quantity_kg, 'approved supplier adjustment changes remaining KG once');

const reversed = computeAvailabilityBySupplier({ receipts, purchases: seedPurchases, sampleLogs: samples, processingLogs: processing, adjustments: adjustments.map((row) => ({ ...row, status: 'reversed' })) });
assert.equal(reversed[adjustedSupplier].availableKg, withoutAdjustments[adjustedSupplier].availableKg, 'reversed adjustment is excluded');

const commissionRows = buildCommissionRows({ purchases: seedPurchases, receipts }, '2026-01-01', '2026-12-31');
assert.ok(commissionRows.some((row) => row.basis === 'Warehouse receipt'), 'commission uses receipt KG when available');
assert.ok(commissionRows.every((row) => row.basis === 'Warehouse receipt'), 'complete workflows do not use dispatch estimates');

const snapshot = {
  purchases: seedPurchases,
  receipts,
  sampleLogs: samples,
  processingLogs: processing,
  outputReports: seedOutputReports.filter(active),
  exportContracts: seedExportContracts.filter(active),
  buyerInspections: seedBuyerInspections.filter(active),
  stockAdjustments: adjustments,
};
const annual = buildAnnualReport(snapshot, '2026-01-01', '2026-12-31');
assert.ok(annual.totals.receivedKg > 0, 'annual report includes warehouse receipts');
assert.deepEqual(annual.adjustmentIds, seedStockAdjustments.filter((row) => row.adjustment_date.startsWith('2026')).map((row) => row.id), 'annual close links approved in-period adjustments');

const pools = computeStockPools({ outputReports: snapshot.outputReports, contracts: snapshot.exportContracts, inspections: snapshot.buyerInspections, sampleLogs: samples, adjustments: [{ ...adjustments[0], target_type: 'Fresh', supplier_id: null, supplier_name: null }] });
assert.ok(Object.values(pools.fresh).some((value) => value > 0), 'stock pool calculation accepts approved adjustments');

const migration = readFileSync('supabase/migrations/20260718052255_phase13_year_close_adjustments_backups.sql', 'utf8');
['stock_adjustments', 'annual_reporting_periods', 'year_end_stock_adjustments', 'backup_exports', 'security invoker', 'enable row level security'].forEach((token) => assert.ok(migration.toLowerCase().includes(token), `${token} exists in Phase 13 migration`));
assert.doesNotMatch(migration, /service_role/i, 'Phase 13 migration does not expose service-role access');

console.log('Phase 13 governance workflow tests passed');
