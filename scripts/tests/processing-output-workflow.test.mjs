import assert from 'node:assert/strict';
import {
  calculateBatchVarianceKg,
  calculateOutputTotals,
  calculateProcessingInputKg,
  calculateSupplierAvailableKgFromMovements,
  EXPORT_BAG_KG,
  KG_TO_LB,
  STANDARD_BAG_KG,
} from '../../src/lib/processingOutputCalculations.js';

function createState() {
  return {
    auditLogs: [],
    sampleLogs: [],
    processingLogs: [],
    outputReports: [],
    stockMovements: [
      { id: 'wh-1', supplier_id: 'supplier-1', movement_type: 'warehouse_received', stock_pool: 'supplier_available', quantity_kg: 1000, archived_at: null },
    ],
  };
}

function available(state) {
  return calculateSupplierAvailableKgFromMovements(state.stockMovements, 'supplier-1');
}

function createSample(state, kg) {
  if (kg <= 0) throw new Error('KG must be greater than zero');
  if (kg > available(state)) throw new Error('Requested KG exceeds supplier available KG');
  const sample = { id: `sample-${state.sampleLogs.length + 1}`, supplier_id: 'supplier-1', sample_kg: kg, archived_at: null };
  state.sampleLogs.push(sample);
  state.stockMovements.push({ id: `move-${state.stockMovements.length + 1}`, source_type: 'sample_log', source_id: sample.id, supplier_id: 'supplier-1', movement_type: 'sample_deduction', stock_pool: 'supplier_available', quantity_kg: kg, archived_at: null });
  state.auditLogs.push({ entity_table: 'sample_logs', entity_id: sample.id, action_type: 'Created' });
  return sample;
}

function createProcessing(state, kg) {
  if (kg <= 0) throw new Error('KG must be greater than zero');
  if (kg > available(state)) throw new Error('Requested KG exceeds supplier available KG');
  const log = { id: `processing-${state.processingLogs.length + 1}`, supplier_id: 'supplier-1', actual_weighed_kg: kg, archived_at: null };
  state.processingLogs.push(log);
  state.stockMovements.push({ id: `move-${state.stockMovements.length + 1}`, source_type: 'processing_log', source_id: log.id, supplier_id: 'supplier-1', movement_type: 'processing_deduction', stock_pool: 'supplier_available', quantity_kg: kg, archived_at: null });
  state.auditLogs.push({ entity_table: 'processing_logs', entity_id: log.id, action_type: 'Created' });
  return log;
}

function createOutput(state, totalKg, exportBags, rejectBags) {
  const totals = calculateOutputTotals({ total_kg_processed: totalKg, export_bags: exportBags, reject_bags: rejectBags });
  const report = { id: `output-${state.outputReports.length + 1}`, total_kg_processed: totalKg, export_bags: exportBags, reject_bags: rejectBags, ...totals, archived_at: null };
  state.outputReports.push(report);
  state.stockMovements.push({ id: `move-${state.stockMovements.length + 1}`, source_type: 'output_report', source_id: report.id, supplier_id: 'supplier-1', movement_type: 'output_export', stock_pool: 'export_available', quantity_kg: totals.export_kg, archived_at: null });
  state.stockMovements.push({ id: `move-${state.stockMovements.length + 1}`, source_type: 'output_report', source_id: report.id, supplier_id: 'supplier-1', movement_type: 'output_reject', stock_pool: 'reject_available', quantity_kg: totals.reject_kg, archived_at: null });
  state.auditLogs.push({ entity_table: 'output_reports', entity_id: report.id, action_type: 'Created' });
  return report;
}

function archiveRecord(state, sourceType, sourceId) {
  state.stockMovements = state.stockMovements.map((movement) => (
    movement.source_type === sourceType && movement.source_id === sourceId ? { ...movement, archived_at: '2026-06-18T00:00:00Z' } : movement
  ));
}

function restoreRecord(state, sourceType, sourceId) {
  state.stockMovements = state.stockMovements.map((movement) => (
    movement.source_type === sourceType && movement.source_id === sourceId ? { ...movement, archived_at: null } : movement
  ));
}

assert.equal(STANDARD_BAG_KG, 85);
assert.equal(EXPORT_BAG_KG, 60);
assert.equal(KG_TO_LB, 2.2046);

assert.equal(calculateProcessingInputKg({ entry_mode: 'By Bags', bags_sent: 3 }), 255);
assert.equal(calculateProcessingInputKg({ entry_mode: 'By KG', actual_weighed_kg: 212.5 }), 212.5);
assert.equal(calculateBatchVarianceKg({ bags_sent: 10, actual_weighed_kg: 842 }), -8);

const output = calculateOutputTotals({ total_kg_processed: 850, export_bags: 10, reject_bags: 2 });
assert.equal(output.export_kg, 600);
assert.equal(output.reject_kg, 170);
assert.equal(output.waste_kg, 80);
assert.equal(output.total_lb, 600 * 2.2046);
assert.throws(() => calculateOutputTotals({ total_kg_processed: 100, export_bags: 2, reject_bags: 0 }), /cannot exceed/i);
assert.throws(() => calculateOutputTotals({ total_kg_processed: 100, export_bags: -1, reject_bags: 0 }), /cannot be negative/i);

const state = createState();
assert.equal(available(state), 1000);
const sample = createSample(state, 12);
assert.equal(available(state), 988, 'sample deduction from available KG');
const processing = createProcessing(state, 850);
assert.equal(available(state), 138, 'processing deduction from available KG');

assert.throws(() => createSample(state, 139), /exceeds supplier available/i);
assert.throws(() => createProcessing(state, 139), /exceeds supplier available/i);
assert.throws(() => createSample(state, 0), /greater than zero/i);
assert.throws(() => createProcessing(state, -1), /greater than zero/i);

const beforeRollback = JSON.stringify(state);
assert.throws(() => createOutput(state, 100, 2, 0), /cannot exceed/i);
assert.equal(JSON.stringify(state), beforeRollback, 'failed output create does not partially mutate state');

const report = createOutput(state, 850, 10, 2);
assert.equal(report.export_kg, 600);
assert.equal(report.reject_kg, 170);
assert.equal(report.waste_kg, 80);
assert.equal(state.stockMovements.filter((movement) => movement.source_type === 'output_report').length, 2, 'stock movement creation');
assert.equal(state.auditLogs.filter((log) => log.entity_table === 'sample_logs').length, 1, 'sample audit log creation');
assert.equal(state.auditLogs.filter((log) => log.entity_table === 'processing_logs').length, 1, 'processing audit log creation');
assert.equal(state.auditLogs.filter((log) => log.entity_table === 'output_reports').length, 1, 'output audit log creation');

archiveRecord(state, 'sample_log', sample.id);
assert.equal(available(state), 150, 'archive restores sample availability');
restoreRecord(state, 'sample_log', sample.id);
assert.equal(available(state), 138, 'restore reapplies sample deduction');

archiveRecord(state, 'processing_log', processing.id);
assert.equal(available(state), 988, 'archive restores processing availability');
restoreRecord(state, 'processing_log', processing.id);
assert.equal(available(state), 138, 'restore reapplies processing deduction');

console.log('Phase 6 processing and output workflow tests passed');
