import assert from 'node:assert/strict';
import {
  calculateBagSummary,
  calculateMaterialBalance,
  materialItemKey,
  REJECT_BAG_PRICE_ETB,
} from '../../src/lib/bagMaterialCalculations.js';

function createState() {
  return {
    receipts: [],
    usages: [],
    returns: [],
    payments: [],
    settlements: [],
    materials: [],
    movements: [],
    auditLogs: [],
  };
}

function bagRow(state, mode, name) {
  return calculateBagSummary(state).find((row) => row.holder_mode === mode && row.holder_name === name);
}

function createReceipt(state, bags = 100) {
  if (bags <= 0) throw new Error('Bags received must be greater than zero');
  const record = { id: `receipt-${state.receipts.length + 1}`, receipt_mode: 'agent', agent_name: 'Demo Agent', bags_received: bags, archived_at: null };
  state.receipts.push(record);
  state.auditLogs.push({ entity_table: 'bag_receipts', entity_id: record.id, action_type: 'Created' });
  return record;
}

function createUsage(state, bags) {
  if (bags <= 0) throw new Error('Bags used must be greater than zero');
  const available = bagRow(state, 'agent', 'Demo Agent')?.net_to_return || 0;
  if (bags > available) throw new Error('Reject bag usage exceeds available bags');
  const record = { id: `usage-${state.usages.length + 1}`, reject_mode: 'agent', agent_name: 'Demo Agent', bags_used: bags, amount_etb: bags * REJECT_BAG_PRICE_ETB, archived_at: null };
  state.usages.push(record);
  state.auditLogs.push({ entity_table: 'reject_bag_usages', entity_id: record.id, action_type: 'Created' });
  return record;
}

function createReturn(state, bags) {
  if (bags <= 0) throw new Error('Bags returned must be greater than zero');
  const remaining = bagRow(state, 'agent', 'Demo Agent')?.bags_remaining_to_return || 0;
  if (bags > remaining) throw new Error('Supplier bag return exceeds remaining bags');
  const record = { id: `return-${state.returns.length + 1}`, agent_name: 'Demo Agent', bags_returned: bags, archived_at: null };
  state.returns.push(record);
  state.auditLogs.push({ entity_table: 'supplier_bag_returns', entity_id: record.id, action_type: 'Created' });
  return record;
}

function createPayment(state, amount) {
  if (amount <= 0) throw new Error('Bag payment amount must be greater than zero');
  const remaining = bagRow(state, 'agent', 'Demo Agent')?.cash_remaining_etb || 0;
  if (amount > remaining + 0.001) throw new Error('Supplier bag payment exceeds remaining cash balance');
  const record = { id: `payment-${state.payments.length + 1}`, agent_name: 'Demo Agent', amount_etb: amount, archived_at: null };
  state.payments.push(record);
  state.auditLogs.push({ entity_table: 'supplier_bag_payments', entity_id: record.id, action_type: 'Created' });
  return record;
}

function createSettlement(state, adjustment) {
  const record = { id: `settlement-${state.settlements.length + 1}`, agent_name: 'Demo Agent', bags_received_adjustment: adjustment, bags_used_adjustment: 0, bags_returned_count: 0, archived_at: null };
  state.settlements.push(record);
  state.auditLogs.push({ entity_table: 'supplier_bag_settlements', entity_id: record.id, action_type: 'Created' });
  return record;
}

function createMaterial(state, data) {
  const entry = { id: `material-${state.materials.length + 1}`, category: 'export', ...data, archived_at: null };
  if (entry.quantity <= 0) throw new Error('Material quantity must be greater than zero');
  const key = materialItemKey(entry);
  if (entry.entry_type === 'Usage') {
    const available = calculateMaterialBalance(state.movements).find((row) => row.item_key === key)?.balance || 0;
    if (entry.quantity > available) throw new Error('Requested material usage exceeds available balance');
  }
  state.materials.push(entry);
  state.movements.push({
    id: `movement-${state.movements.length + 1}`,
    material_register_entry_id: entry.id,
    item_key: key,
    movement_type: entry.entry_type === 'Purchase' ? 'material_purchase' : 'material_usage',
    quantity: entry.quantity,
    total_cost_etb: entry.total_cost_etb || 0,
    archived_at: null,
  });
  state.auditLogs.push({ entity_table: 'material_register_entries', entity_id: entry.id, action_type: 'Created' });
  return entry;
}

function archiveMaterial(state, entryId) {
  state.materials = state.materials.map((entry) => entry.id === entryId ? { ...entry, archived_at: '2026-06-18T00:00:00Z' } : entry);
  state.movements = state.movements.map((movement) => movement.material_register_entry_id === entryId ? { ...movement, archived_at: '2026-06-18T00:00:00Z' } : movement);
}

function restoreMaterial(state, entryId) {
  state.materials = state.materials.map((entry) => entry.id === entryId ? { ...entry, archived_at: null } : entry);
  state.movements = state.movements.map((movement) => movement.material_register_entry_id === entryId ? { ...movement, archived_at: null } : movement);
}

const state = createState();
createReceipt(state, 100);
let row = bagRow(state, 'agent', 'Demo Agent');
assert.equal(row.received, 100, 'bag receipt increases balance');
assert.equal(row.loss_allowance, 1, '1 percent loss allowance');
assert.equal(row.net_to_return, 99, 'net bag return balance');

createUsage(state, 12);
row = bagRow(state, 'agent', 'Demo Agent');
assert.equal(row.used, 12, 'reject bag usage decreases balance');
assert.equal(row.cash_earned_etb, 12 * REJECT_BAG_PRICE_ETB, 'reject bag cash earned');
assert.throws(() => createUsage(state, 999), /exceeds available bags/i, 'reject over-usage');
assert.throws(() => createUsage(state, 0), /greater than zero/i, 'reject zero quantity');
assert.throws(() => createUsage(state, -1), /greater than zero/i, 'reject negative quantity');

createReturn(state, 30);
row = bagRow(state, 'agent', 'Demo Agent');
assert.equal(row.returned, 30, 'supplier bag return affects balance');
assert.equal(row.bags_remaining_to_return, 57, 'bag return remaining balance');

createPayment(state, 1000);
row = bagRow(state, 'agent', 'Demo Agent');
assert.equal(row.paid_etb, 1000, 'supplier bag payment affects balance');
assert.equal(row.cash_remaining_etb, 836, 'cash remaining after payment');

createSettlement(state, 2);
row = bagRow(state, 'agent', 'Demo Agent');
assert.equal(row.received, 102, 'supplier bag settlement affects balance');

const purchase = createMaterial(state, { item_type: 'Bag', bag_size: '60kg', entry_type: 'Purchase', quantity: 80, unit_cost_etb: 250, total_cost_etb: 20000 });
let material = calculateMaterialBalance(state.movements).find((item) => item.item_key === 'Bag 60kg');
assert.equal(material.balance, 80, 'material receipt increases balance');
const usage = createMaterial(state, { item_type: 'Bag', bag_size: '60kg', entry_type: 'Usage', quantity: 6, export_contract_id: 'contract-1' });
material = calculateMaterialBalance(state.movements).find((item) => item.item_key === 'Bag 60kg');
assert.equal(material.balance, 74, 'material usage decreases balance');
assert.throws(() => createMaterial(state, { item_type: 'Bag', bag_size: '60kg', entry_type: 'Usage', quantity: 999 }), /exceeds available balance/i, 'reject material usage greater than available balance');

archiveMaterial(state, usage.id);
material = calculateMaterialBalance(state.movements).find((item) => item.item_key === 'Bag 60kg');
assert.equal(material.balance, 80, 'archive reverses balance');
restoreMaterial(state, usage.id);
material = calculateMaterialBalance(state.movements).find((item) => item.item_key === 'Bag 60kg');
assert.equal(material.balance, 74, 'restore reapplies balance');

const beforeRollback = JSON.stringify(state);
assert.throws(() => createMaterial(state, { item_type: 'Bag', bag_size: '60kg', entry_type: 'Usage', quantity: 999 }), /exceeds available balance/i);
assert.equal(JSON.stringify(state), beforeRollback, 'transaction rollback model');

assert.ok(purchase.id);
assert.ok(state.auditLogs.some((log) => log.entity_table === 'bag_receipts'), 'bag audit log creation');
assert.ok(state.auditLogs.some((log) => log.entity_table === 'material_register_entries'), 'material audit log creation');

console.log('Phase 8 bag and material workflow tests passed');
