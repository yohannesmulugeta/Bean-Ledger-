import assert from 'node:assert/strict';
import {
  calculateAvailableStockFromMovements,
  calculateExportContractTotals,
  EXPORT_BAG_KG,
  KG_TO_LB,
  REJECT_BAG_KG,
} from '../../src/lib/exportContractCalculations.js';
import { getMissingRequiredUploads, getMissingShipmentFields, getShipmentChecks, parseShipmentDetails } from '../../src/lib/exportDocuments.js';

function createState() {
  return {
    contracts: [],
    inspections: [],
    auditLogs: [],
    stockMovements: [
      { id: 'out-1', movement_type: 'output_export', stock_pool: 'export_available', coffee_type: 'Demo Coffee', quantity_kg: 600, archived_at: null },
      { id: 'rej-1', movement_type: 'output_reject', stock_pool: 'reject_available', coffee_type: 'Demo Coffee', quantity_kg: 170, archived_at: null },
    ],
  };
}

function exportAvailable(state) {
  return calculateAvailableStockFromMovements(state.stockMovements, 'export_available', 'Demo Coffee');
}

function createContract(state, { export_bags = 5, price_per_lb_usd = 2.5, contract_rate_etb = 120 } = {}) {
  const totals = calculateExportContractTotals({
    export_bags,
    price_per_lb_usd,
    pricing_method: 'per_lb',
    contract_rate_etb,
    costs: [{ name: 'Freight', amount_etb: 10000 }],
    materials: [{ name: 'Jute Bags', quantity: 5, unit_cost_etb: 1000 }],
    payments: [{ amount_usd: 200, actual_rate_etb: 120 }],
    reject_sales_etb: 3000,
  });
  if (totals.export_kg > exportAvailable(state)) throw new Error('Requested export KG exceeds available stock');
  const contract = { id: `contract-${state.contracts.length + 1}`, coffee_type: 'Demo Coffee', export_bags, ...totals, archived_at: null };
  state.contracts.push(contract);
  state.stockMovements.push({ id: `move-${state.stockMovements.length + 1}`, source_type: 'export_contract', source_id: contract.id, movement_type: 'export_contract_deduction', stock_pool: 'export_available', coffee_type: 'Demo Coffee', quantity_kg: totals.export_kg, archived_at: null });
  state.auditLogs.push({ entity_table: 'export_contracts', entity_id: contract.id, action_type: 'Created' });
  return contract;
}

function createInspection(state, sampleKg = 4) {
  if (sampleKg <= 0) throw new Error('Sample KG must be greater than zero');
  if (sampleKg > exportAvailable(state)) throw new Error('Requested export KG exceeds available stock');
  const inspection = { id: `inspection-${state.inspections.length + 1}`, coffee_type: 'Demo Coffee', sample_kg_taken: sampleKg, result: 'Passed', archived_at: null };
  state.inspections.push(inspection);
  state.stockMovements.push({ id: `move-${state.stockMovements.length + 1}`, source_type: 'buyer_inspection', source_id: inspection.id, movement_type: 'buyer_inspection_sample', stock_pool: 'export_available', coffee_type: 'Demo Coffee', quantity_kg: sampleKg, archived_at: null });
  state.auditLogs.push({ entity_table: 'buyer_inspections', entity_id: inspection.id, action_type: 'Created' });
  return inspection;
}

function archiveSource(state, sourceType, sourceId) {
  state.stockMovements = state.stockMovements.map((movement) => (
    movement.source_type === sourceType && movement.source_id === sourceId ? { ...movement, archived_at: '2026-06-18T00:00:00Z' } : movement
  ));
}

function restoreSource(state, sourceType, sourceId) {
  state.stockMovements = state.stockMovements.map((movement) => (
    movement.source_type === sourceType && movement.source_id === sourceId ? { ...movement, archived_at: null } : movement
  ));
}

assert.equal(EXPORT_BAG_KG, 60);
assert.equal(REJECT_BAG_KG, 85);
assert.equal(KG_TO_LB, 2.2046);

const totals = calculateExportContractTotals({
  export_bags: 6,
  price_per_lb_usd: 2.85,
  pricing_method: 'per_lb',
  contract_rate_etb: 120,
  costs: [{ amount_etb: 20000 }],
  materials: [{ quantity: 6, unit_cost_etb: 2500 }],
  payments: [{ amount_usd: 1000, actual_rate_etb: 120 }],
  reject_sales_etb: 12000,
});

assert.equal(totals.export_kg, 360, 'export KG calculation');
assert.equal(totals.total_lb, 360 * 2.2046, 'KG to LB calculation');
assert.equal(Number(totals.total_export_value_usd.toFixed(2)), 2261.92, 'USD value calculation');
assert.equal(Number(totals.total_export_value_etb.toFixed(2)), 271430.35, 'ETB value calculation');
assert.equal(totals.total_costs_etb, 35000, 'cost total calculation');
assert.equal(totals.total_received_etb, 120000, 'payment total calculation');
assert.equal(Number(totals.profit_etb.toFixed(2)), 248430.35, 'profit ETB calculation');
assert.equal(Number(totals.profit_usd.toFixed(2)), 2070.25, 'profit USD calculation');

assert.throws(() => calculateExportContractTotals({ export_bags: -1, price_per_lb_usd: 1, contract_rate_etb: 1 }), /greater than zero/i);
assert.throws(() => calculateExportContractTotals({ export_bags: 1, price_per_lb_usd: -1, contract_rate_etb: 1 }), /price cannot be negative/i);
assert.throws(() => calculateExportContractTotals({ export_bags: 1, price_per_lb_usd: 1, contract_rate_etb: -1 }), /exchange rate cannot be negative/i);

const state = createState();
assert.equal(exportAvailable(state), 600);
const contract = createContract(state, { export_bags: 6 });
assert.equal(exportAvailable(state), 240, 'stock movement/reservation creation');
assert.equal(state.auditLogs.filter((log) => log.entity_table === 'export_contracts').length, 1, 'contract audit log creation');

archiveSource(state, 'export_contract', contract.id);
assert.equal(exportAvailable(state), 600, 'archive releases stock');
restoreSource(state, 'export_contract', contract.id);
assert.equal(exportAvailable(state), 240, 'restore reapplies stock');

const beforeRollback = JSON.stringify(state);
assert.throws(() => createContract(state, { export_bags: 99 }), /exceeds available stock/i);
assert.equal(JSON.stringify(state), beforeRollback, 'transaction rollback model');

const inspection = createInspection(state, 4);
assert.equal(exportAvailable(state), 236, 'buyer inspection sample deduction');
assert.equal(state.auditLogs.filter((log) => log.entity_table === 'buyer_inspections').length, 1, 'buyer inspection creation and audit');
archiveSource(state, 'buyer_inspection', inspection.id);
assert.equal(exportAvailable(state), 240, 'archive inspection releases sample stock');
restoreSource(state, 'buyer_inspection', inspection.id);
assert.equal(exportAvailable(state), 236, 'restore inspection reapplies sample stock');

const shipment = parseShipmentDetails(JSON.stringify({
  port_of_loading: 'Djibouti',
  port_of_discharge: 'Hamburg',
  containers: [{ container_number: 'MSCU1234567', seal_number: 'SEAL-1', bags: 6, net_kg: 356, gross_kg: 365 }],
}));
const shipmentChecks = getShipmentChecks({ export_bags: 6, actual_shipped_kg: 356 }, shipment);
assert.equal(shipmentChecks.every(check => check.ok), true, 'matching shipment details pass discrepancy checks');
assert.equal(getShipmentChecks({ export_bags: 6, actual_shipped_kg: 360 }, shipment).find(check => check.key === 'net').ok, false, 'weight mismatch is detected');
assert.deepEqual(getMissingRequiredUploads([{ section_ref: 'bill_of_lading' }]).map(doc => doc.key), ['phytosanitary', 'ico_coo', 'bank_permit'], 'required uploads are tracked');
assert.deepEqual(getMissingShipmentFields({ buyer_name: 'Buyer' }, shipment).map(field => field.key), ['shipment_date', 'shipping_line', 'booking_number', 'vessel', 'voyage'], 'required shipment fields are tracked');

console.log('Phase 7 export contract workflow tests passed');
