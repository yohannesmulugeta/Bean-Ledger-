import assert from 'node:assert/strict';
import {
  archiveRecord,
  assertNonNegative,
  calculatePurchaseTotals,
  ensureUniqueCoffeeCode,
  FERESULA_KG,
} from '../../src/lib/purchaseCalculations.js';

function near(actual, expected, tolerance = 0.000001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be near ${expected}`);
}

const baseInput = {
  net_dispatch_weight_kg: 1700,
  warehouse_received_kg: 1666,
  unit_price_etb_per_feresula: 5400,
  commission_percent: 3,
  additional_costs: [
    { name: 'Transport', amount_etb: 12000 },
    { name: 'Loading', amount_etb: 3500 },
  ],
  payments: [
    { amount_etb: 350000 },
    { amount_etb: 210000 },
  ],
};

{
  const totals = calculatePurchaseTotals(baseInput);
  near(totals.net_feresula, 1700 / FERESULA_KG);
  near(totals.warehouse_feresula, 1666 / FERESULA_KG);
  near(totals.total_purchase_price_etb, 540000);
  near(totals.commission_etb, (1666 / FERESULA_KG) * 5400 * 0.03);
}

{
  const totals = calculatePurchaseTotals({
    ...baseInput,
    payments: [{ amount_etb: 100000 }],
  });
  assert.equal(totals.payment_status, 'Partial');
  assert.ok(totals.balance_etb > 0);
}

{
  const totals = calculatePurchaseTotals({
    ...baseInput,
    payments: [{ amount_etb: 1000000 }],
  });
  assert.equal(totals.payment_status, 'Overpaid');
  assert.ok(totals.balance_etb < 0);
}

{
  const withoutCosts = calculatePurchaseTotals({ ...baseInput, additional_costs: [] });
  const withCosts = calculatePurchaseTotals(baseInput);
  near(withCosts.grand_total_etb - withoutCosts.grand_total_etb, 15500);
}

{
  assert.throws(() => assertNonNegative(-1, 'Dispatch KG'), /cannot be negative/);
  assert.throws(() => calculatePurchaseTotals({ ...baseInput, payments: [{ amount_etb: -10 }] }), /cannot be negative/);
}

{
  const records = [
    { id: 'a', coffee_code: 'DEMO/WOL/001/2026', archived_at: null },
    { id: 'b', coffee_code: 'DEMO/GUJ/002/2026', archived_at: '2026-06-01T00:00:00Z' },
  ];
  assert.throws(() => ensureUniqueCoffeeCode(records, 'demo/wol/001/2026'), /already exists/);
  assert.equal(ensureUniqueCoffeeCode(records, 'DEMO/GUJ/002/2026'), true);
  assert.equal(ensureUniqueCoffeeCode(records, 'DEMO/WOL/001/2026', 'a'), true);
}

{
  const archived = archiveRecord({ id: 'p1', coffee_code: 'DEMO/ARCHIVE' }, '2026-06-18T00:00:00Z');
  assert.equal(archived.archived, true);
  assert.equal(archived.archived_at, '2026-06-18T00:00:00Z');
  assert.equal(archived.updated_at, '2026-06-18T00:00:00Z');
}

console.log('Phase 4 purchase calculation tests passed');
