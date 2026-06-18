import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { calculateMaterialBalance, materialItemKey } from '@/lib/bagMaterialCalculations';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

function normalize(data) {
  const quantity = Number(data.quantity || 0);
  const unitCost = data.unit_cost_etb === null || data.unit_cost_etb === undefined || data.unit_cost_etb === ''
    ? null
    : Number(data.unit_cost_etb);
  return {
    organization_id: data.organization_id || DEMO_META.organizationId,
    export_contract_id: data.export_contract_id || null,
    base44_id: data.base44_id ?? null,
    category: data.category || 'general',
    date: data.date,
    item_type: data.item_type || null,
    bag_size: data.bag_size || null,
    entry_type: data.entry_type || null,
    item_name: data.item_name || null,
    quantity,
    unit_cost_etb: unitCost,
    total_cost_etb: data.total_cost_etb === null || data.total_cost_etb === undefined || data.total_cost_etb === ''
      ? (unitCost === null ? null : quantity * unitCost)
      : Number(data.total_cost_etb),
    purpose: data.purpose || null,
    note: data.note || null,
    is_demo: data.is_demo ?? true,
  };
}

function movementFor(entry) {
  if (entry.category !== 'export') return null;
  return {
    id: createDemoId(),
    organization_id: entry.organization_id,
    material_register_entry_id: entry.id,
    export_contract_id: entry.export_contract_id || null,
    item_key: materialItemKey(entry),
    movement_type: entry.entry_type === 'Purchase' ? 'material_purchase' : 'material_usage',
    quantity: entry.quantity,
    unit_cost_etb: entry.unit_cost_etb,
    total_cost_etb: entry.total_cost_etb,
    occurred_at: `${entry.date}T00:00:00Z`,
    notes: entry.note,
    is_demo: entry.is_demo,
    created_at: entry.created_at,
    archived_at: entry.archived_at || null,
  };
}

function active(items) {
  return (items || []).filter((item) => !item.archived_at && !item.archived);
}

function assertLocalMaterial(entry, store, excludingId = null) {
  if (entry.quantity <= 0) throw new Error('Material quantity must be greater than zero');
  const key = materialItemKey(entry);
  if (!key) throw new Error('Material item is required');
  if (entry.category === 'export' && entry.entry_type === 'Usage') {
    const balance = calculateMaterialBalance(store.materialMovements.filter((movement) => movement.material_register_entry_id !== excludingId))
      .find((row) => row.item_key === key)?.balance || 0;
    if (entry.quantity > balance) throw new Error('Requested material usage exceeds available balance');
  }
}

export const materialService = {
  async list() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('material_register_entries').select('*').is('archived_at', null).order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return active(readDemoStore().materialRegisterEntries).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  },

  async balance() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('calculate_material_balance', { p_organization_id: DEMO_META.organizationId });
      if (error) throw error;
      return data || [];
    }
    return calculateMaterialBalance(readDemoStore().materialMovements);
  },

  async create(data) {
    const payload = normalize(data);
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_material_register_entry', { p_payload: payload });
      if (error) throw error;
      return created;
    }
    const store = readDemoStore();
    assertLocalMaterial(payload, store);
    const timestamp = nowIso();
    const entry = { id: createDemoId(), ...payload, created_at: timestamp, updated_at: timestamp, archived_at: null };
    store.materialRegisterEntries.push(entry);
    const movement = movementFor(entry);
    if (movement) store.materialMovements.push(movement);
    store.auditLogs.push({ id: createDemoId(), organization_id: entry.organization_id, entity_table: 'materialRegisterEntries', entity_id: entry.id, action_type: 'Created', is_demo: true, created_at: timestamp });
    writeDemoStore(store);
    return entry;
  },

  async update(id, data) {
    const payload = normalize(data);
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.rpc('update_material_register_entry', { p_material_register_entry_id: id, p_payload: payload });
      if (error) throw error;
      return updated;
    }
    const store = readDemoStore();
    const index = store.materialRegisterEntries.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Material register entry not found');
    assertLocalMaterial(payload, store, id);
    const updated = { ...store.materialRegisterEntries[index], ...payload, updated_at: nowIso() };
    store.materialRegisterEntries[index] = updated;
    store.materialMovements = store.materialMovements.map((movement) => (
      movement.material_register_entry_id === id ? { ...movement, archived_at: nowIso() } : movement
    ));
    const movement = movementFor(updated);
    if (movement) store.materialMovements.push(movement);
    writeDemoStore(store);
    return updated;
  },

  async archive(id, reason = null) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('archive_material_register_entry', { p_material_register_entry_id: id, p_reason: reason });
      if (error) throw error;
      return data;
    }
    const store = readDemoStore();
    const index = store.materialRegisterEntries.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Material register entry not found');
    const archivedAt = nowIso();
    store.materialRegisterEntries[index] = { ...store.materialRegisterEntries[index], archived_at: archivedAt, archive_reason: reason };
    store.materialMovements = store.materialMovements.map((movement) => (
      movement.material_register_entry_id === id ? { ...movement, archived_at: archivedAt } : movement
    ));
    writeDemoStore(store);
    return store.materialRegisterEntries[index];
  },
};
