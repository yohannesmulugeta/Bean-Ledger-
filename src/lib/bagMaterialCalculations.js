export const REJECT_BAG_PRICE_ETB = 153;
export const BAG_LOSS_PERCENT = 1;

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function bagHolder(record, modeField = 'receipt_mode') {
  const mode = record[modeField] || (record.agent_name ? 'agent' : 'supplier');
  const name = mode === 'agent' ? record.agent_name : record.supplier_name;
  return { mode, name: name || '' };
}

export function calculateBagSummary({ receipts = [], usages = [], returns = [], payments = [], settlements = [] }) {
  const rows = new Map();
  const ensure = (mode, name) => {
    const key = `${mode}:${name}`;
    if (!rows.has(key)) {
      rows.set(key, {
        holder_mode: mode,
        holder_name: name,
        received: 0,
        used: 0,
        returned: 0,
        paid_etb: 0,
        received_adjustment: 0,
        used_adjustment: 0,
        returned_adjustment: 0,
      });
    }
    return rows.get(key);
  };

  receipts.filter((r) => !r.archived_at && !r.archived).forEach((record) => {
    const { mode, name } = bagHolder(record, 'receipt_mode');
    ensure(mode, name).received += toNumber(record.bags_received);
  });
  usages.filter((r) => !r.archived_at && !r.archived).forEach((record) => {
    const { mode, name } = bagHolder(record, 'reject_mode');
    ensure(mode, name).used += toNumber(record.bags_used);
  });
  returns.filter((r) => !r.archived_at && !r.archived).forEach((record) => {
    const mode = record.agent_name ? 'agent' : 'supplier';
    const name = record.agent_name || record.supplier_name || '';
    ensure(mode, name).returned += toNumber(record.bags_returned);
  });
  payments.filter((r) => !r.archived_at && !r.archived).forEach((record) => {
    const mode = record.agent_name ? 'agent' : 'supplier';
    const name = record.agent_name || record.supplier_name || '';
    ensure(mode, name).paid_etb += toNumber(record.amount_etb);
  });
  settlements.filter((r) => !r.archived_at && !r.archived).forEach((record) => {
    const mode = record.agent_name ? 'agent' : 'supplier';
    const name = record.agent_name || record.supplier_name || '';
    const row = ensure(mode, name);
    row.received_adjustment += toNumber(record.bags_received_adjustment);
    row.used_adjustment += toNumber(record.bags_used_adjustment);
    row.returned_adjustment += toNumber(record.bags_returned_count);
  });

  return Array.from(rows.values()).map((row) => {
    const received = Math.max(0, row.received + row.received_adjustment);
    const used = Math.max(0, row.used + row.used_adjustment);
    const loss_allowance = Math.ceil(received * (BAG_LOSS_PERCENT / 100));
    const net_to_return = received - loss_allowance - used;
    const returned = row.returned + row.returned_adjustment;
    const cash_earned_etb = used * REJECT_BAG_PRICE_ETB;
    return {
      ...row,
      received,
      loss_allowance,
      used,
      net_to_return,
      returned,
      bags_remaining_to_return: Math.max(0, net_to_return - returned),
      cash_earned_etb,
      cash_remaining_etb: Math.max(0, cash_earned_etb - row.paid_etb),
    };
  });
}

export function materialItemKey(record) {
  if (record.item_type === 'Bag') return `Bag ${record.bag_size || ''}`.trim();
  return record.item_type || record.item_name || '';
}

export function calculateMaterialBalance(movements = []) {
  const map = {};
  movements.filter((m) => !m.archived_at && !m.archived).forEach((movement) => {
    const key = movement.item_key || materialItemKey(movement);
    if (!key) return;
    if (!map[key]) map[key] = { item_key: key, purchased: 0, used: 0, balance: 0, total_cost_etb: 0 };
    const quantity = toNumber(movement.quantity);
    if (movement.movement_type === 'material_purchase') {
      map[key].purchased += quantity;
      map[key].balance += quantity;
      map[key].total_cost_etb += toNumber(movement.total_cost_etb);
    } else if (movement.movement_type === 'material_usage') {
      map[key].used += quantity;
      map[key].balance -= quantity;
    }
  });
  return Object.values(map).sort((a, b) => a.item_key.localeCompare(b.item_key));
}
