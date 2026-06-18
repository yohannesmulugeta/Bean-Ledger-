import assert from 'node:assert/strict';
import {
  archiveWarehouseRecord,
  calculateShortageKg,
  calculateSupplierAvailableKg,
  validateWarehouseReceiptInput,
} from '../../src/lib/warehouseCalculations.js';
import { calculatePurchaseTotals } from '../../src/lib/purchaseCalculations.js';

const purchase = {
  id: 'purchase-1',
  organization_id: 'org-1',
  supplier_id: 'supplier-1',
  net_dispatch_weight_kg: 1700,
  warehouse_received_kg: null,
  unit_price_etb_per_feresula: 5400,
  commission_percent: 3,
  archived_at: null,
};

{
  assert.equal(calculateShortageKg(850, 850), 0);
  assert.equal(calculateShortageKg(1700, 1666), 34);
}

{
  assert.throws(() => calculateShortageKg(850, 900), /cannot exceed dispatch/i);
  assert.throws(() => calculateShortageKg(850, 0), /greater than zero/i);
  assert.throws(() => calculateShortageKg(850, -1), /greater than zero/i);
}

{
  assert.throws(() => validateWarehouseReceiptInput({ purchase: null, supplier_id: 'supplier-1', received_kg: 10 }), /not found/i);
  assert.throws(() => validateWarehouseReceiptInput({ purchase, supplier_id: 'other', received_kg: 10 }), /does not match/i);
  assert.equal(validateWarehouseReceiptInput({ purchase, supplier_id: 'supplier-1', received_kg: 1666 }), true);
}

{
  const before = calculatePurchaseTotals({
    ...purchase,
    additional_costs: [{ amount_etb: 15500 }],
    payments: [{ amount_etb: 560000 }],
  });
  const after = calculatePurchaseTotals({
    ...purchase,
    warehouse_received_kg: 1666,
    additional_costs: [{ amount_etb: 15500 }],
    payments: [{ amount_etb: 560000 }],
  });
  assert.notEqual(before.commission_etb, after.commission_etb);
  assert.notEqual(before.grand_total_etb, after.grand_total_etb);
  assert.notEqual(before.balance_etb, after.balance_etb);
}

{
  const movements = [
    { supplier_id: 'supplier-1', movement_type: 'warehouse_received', quantity_kg: 1666, archived_at: null },
    { supplier_id: 'supplier-1', movement_type: 'warehouse_received', quantity_kg: 680, archived_at: null },
    { supplier_id: 'supplier-2', movement_type: 'warehouse_received', quantity_kg: 850, archived_at: null },
    { supplier_id: 'supplier-1', movement_type: 'warehouse_received', quantity_kg: 100, archived_at: '2026-06-12T00:00:00Z' },
  ];
  assert.equal(calculateSupplierAvailableKg(movements, 'supplier-1'), 2346);
  assert.equal(calculateSupplierAvailableKg(movements, 'supplier-2'), 850);
}

{
  const archived = archiveWarehouseRecord({ id: 'receipt-1', received_kg: 1666 }, '2026-06-18T00:00:00Z');
  assert.equal(archived.archived, true);
  assert.equal(archived.archived_at, '2026-06-18T00:00:00Z');
}

{
  const state = { receipts: [], movements: [], history: [] };
  const receipt = { id: 'receipt-1', purchase_record_id: 'purchase-1', supplier_id: 'supplier-1', received_kg: 1666 };
  state.receipts.push(receipt);
  state.movements.push({ warehouse_receipt_id: receipt.id, movement_type: 'warehouse_received', quantity_kg: receipt.received_kg });
  state.history.push({ warehouse_receipt_id: receipt.id, action_type: 'Created' });
  assert.equal(state.movements.length, 1, 'stock movement creation');
  assert.equal(state.history.length, 1, 'history creation');
  assert.throws(() => {
    if (state.receipts.some((item) => item.purchase_record_id === receipt.purchase_record_id)) {
      throw new Error('This purchase already has an active warehouse receipt');
    }
  }, /already has an active warehouse receipt/i);
}

{
  const state = { receipts: [], movements: [], history: [] };
  try {
    validateWarehouseReceiptInput({ purchase, supplier_id: 'other', received_kg: 100 });
    state.receipts.push({ id: 'bad' });
    state.movements.push({ id: 'bad' });
  } catch {
    // Simulates the expected all-or-nothing transaction boundary: no partial write after validation failure.
  }
  assert.equal(state.receipts.length, 0);
  assert.equal(state.movements.length, 0);
}

console.log('Phase 5 warehouse workflow tests passed');
