import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

const AREA_LABELS = {
  supplier_unprocessed: 'Supplier Unprocessed',
  processed_exportable: 'Processed-Exportable',
  export_materials: 'Export Materials',
  bag_ledger: 'Bag Ledger',
};

const DEFAULT_BALANCES = {
  supplier_unprocessed: 15000,
  processed_exportable: 8500,
  export_materials: 3200,
  bag_ledger: 1200,
};

function ensureAdjustments(store) {
  if (!Array.isArray(store.stockAdjustments)) {
    store.stockAdjustments = [];
  }
  return store.stockAdjustments;
}

function calcDemoBalance(adjustments, area) {
  const base = DEFAULT_BALANCES[area] || 0;
  const delta = adjustments
    .filter((a) => a.adjustment_area === area && !a.reversed)
    .reduce((sum, a) => {
      const qty = Number(a.quantity || 0);
      return sum + (a.direction === 'increase' ? qty : -qty);
    }, 0);
  return base + delta;
}

export const adjustmentService = {
  async list() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        throw error;
      }
      return data || [];
    }

    const store = readDemoStore();
    const adjustments = ensureAdjustments(store);
    return [...adjustments].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  },

  async create(data) {
    if (isSupabaseConfigured) {
      const payload = {
        adjustment_date: data.adjustment_date || nowIso().slice(0, 10),
        adjustment_area: data.adjustment_area,
        direction: data.direction,
        quantity: Number(data.quantity || 0),
        unit: data.unit || 'kg',
        reason: data.reason || '',
        note: data.note || '',
        balance_before: Number(data.balance_before ?? 0),
        balance_after: Number(data.balance_after ?? 0),
        created_by: data.created_by || 'system',
        reversed: false,
        reversal_of_adjustment_id: data.reversal_of_adjustment_id || null,
      };
      const { data: created, error } = await supabase
        .from('stock_adjustments')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return created;
    }

    const store = readDemoStore();
    const adjustments = ensureAdjustments(store);
    const timestamp = nowIso();
    const balanceBefore = calcDemoBalance(adjustments, data.adjustment_area);
    const qty = Number(data.quantity || 0);
    const balanceAfter = data.direction === 'increase' ? balanceBefore + qty : balanceBefore - qty;

    const record = {
      id: createDemoId(),
      adjustment_date: data.adjustment_date || timestamp.slice(0, 10),
      adjustment_area: data.adjustment_area,
      direction: data.direction,
      quantity: qty,
      unit: data.unit || 'kg',
      reason: data.reason || '',
      note: data.note || '',
      balance_before: Number(data.balance_before ?? balanceBefore),
      balance_after: Number(data.balance_after ?? balanceAfter),
      created_by: data.created_by || 'Demo Admin',
      reversed: false,
      reversal_of_adjustment_id: data.reversal_of_adjustment_id || null,
      is_demo: true,
      created_at: timestamp,
      updated_at: timestamp,
    };

    adjustments.push(record);
    writeDemoStore(store);
    return record;
  },

  async reverse(id, reversedBy = 'Demo Admin') {
    if (isSupabaseConfigured) {
      const { data: original, error: fetchError } = await supabase
        .from('stock_adjustments')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const reverseDirection = original.direction === 'increase' ? 'decrease' : 'increase';
      const reversalPayload = {
        adjustment_date: nowIso().slice(0, 10),
        adjustment_area: original.adjustment_area,
        direction: reverseDirection,
        quantity: original.quantity,
        unit: original.unit,
        reason: `Reversal of adjustment`,
        note: `Reversed adjustment ${id}`,
        balance_before: original.balance_after,
        balance_after: original.balance_before,
        created_by: reversedBy,
        reversed: false,
        reversal_of_adjustment_id: id,
      };

      const { data: reversal, error: insertError } = await supabase
        .from('stock_adjustments')
        .insert(reversalPayload)
        .select()
        .single();
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('stock_adjustments')
        .update({ reversed: true })
        .eq('id', id);
      if (updateError) throw updateError;

      return reversal;
    }

    const store = readDemoStore();
    const adjustments = ensureAdjustments(store);
    const original = adjustments.find((a) => a.id === id);
    if (!original) throw new Error('Adjustment not found');

    const timestamp = nowIso();
    const reverseDirection = original.direction === 'increase' ? 'decrease' : 'increase';
    const reversal = {
      id: createDemoId(),
      adjustment_date: timestamp.slice(0, 10),
      adjustment_area: original.adjustment_area,
      direction: reverseDirection,
      quantity: original.quantity,
      unit: original.unit,
      reason: `Reversal of adjustment`,
      note: `Reversed adjustment ${id}`,
      balance_before: original.balance_after,
      balance_after: original.balance_before,
      created_by: reversedBy,
      reversed: false,
      reversal_of_adjustment_id: id,
      is_demo: true,
      created_at: timestamp,
      updated_at: timestamp,
    };

    original.reversed = true;
    adjustments.push(reversal);
    writeDemoStore(store);
    return reversal;
  },

  async getCurrentBalance(area) {
    if (isSupabaseConfigured) {
      return DEFAULT_BALANCES[area] || 0;
    }

    const store = readDemoStore();
    const adjustments = ensureAdjustments(store);
    return calcDemoBalance(adjustments, area);
  },

  AREA_LABELS,
};
