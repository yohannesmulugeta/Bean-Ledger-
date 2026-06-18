import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

function decorate(record) {
  return {
    ...record,
    archived: Boolean(record.archived_at),
    linked_contract_id: record.export_contract_id || record.linked_contract_id,
  };
}

function payload(data) {
  return {
    organization_id: data.organization_id || DEMO_META.organizationId,
    linked_contract_id: data.linked_contract_id || data.export_contract_id || null,
    linked_contract_no: data.linked_contract_no || null,
    inspection_date: data.inspection_date,
    buyer_name: data.buyer_name,
    coffee_type: data.coffee_type,
    kg_to_inspect: Number(data.kg_to_inspect || 0),
    sample_kg_taken: Number(data.sample_kg_taken || 0),
    result: data.result || 'Pending',
    kg_approved: data.kg_approved ?? null,
    rejection_reason: data.rejection_reason || null,
    kg_rejected: data.kg_rejected ?? null,
    action_taken: data.action_taken || null,
    notes: data.notes || null,
    reason: data.reason,
    is_demo: data.is_demo ?? true,
    base44_id: data.base44_id ?? null,
  };
}

export const buyerInspectionService = {
  async list({ includeArchived = false } = {}) {
    if (isSupabaseConfigured) {
      let query = supabase.from('buyer_inspections').select('*').order('inspection_date', { ascending: false });
      if (!includeArchived) query = query.is('archived_at', null);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(decorate);
    }
    return readDemoStore().buyerInspections
      .filter((item) => includeArchived || !item.archived_at)
      .map(decorate)
      .sort((a, b) => String(b.inspection_date).localeCompare(String(a.inspection_date)));
  },

  async create(data) {
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.rpc('create_buyer_inspection', { p_payload: payload(data) });
      if (error) throw error;
      return decorate(created);
    }
    const store = readDemoStore();
    const next = payload(data);
    if (next.kg_to_inspect <= 0 || next.sample_kg_taken <= 0) throw new Error('Inspection KG values must be greater than zero');
    const timestamp = nowIso();
    const created = {
      id: createDemoId(),
      ...next,
      export_contract_id: next.linked_contract_id,
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };
    store.buyerInspections.push(created);
    store.stockMovements.push({
      id: createDemoId(),
      organization_id: created.organization_id,
      source_type: 'buyer_inspection',
      source_id: created.id,
      movement_type: 'buyer_inspection_sample',
      stock_pool: 'export_available',
      coffee_type: created.coffee_type,
      quantity_kg: created.sample_kg_taken,
      occurred_at: `${created.inspection_date}T08:00:00Z`,
      notes: 'Buyer inspection sample deduction',
      is_demo: true,
      created_at: timestamp,
      archived_at: null,
    });
    writeDemoStore(store);
    return decorate(created);
  },

  async update(id, data) {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.rpc('update_buyer_inspection', { p_buyer_inspection_id: id, p_payload: payload(data) });
      if (error) throw error;
      return decorate(updated);
    }
    const store = readDemoStore();
    const index = store.buyerInspections.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Buyer inspection not found');
    const updated = { ...store.buyerInspections[index], ...payload(data), updated_at: nowIso() };
    store.buyerInspections[index] = updated;
    const movement = store.stockMovements.find((item) => item.source_type === 'buyer_inspection' && item.source_id === id);
    if (movement) {
      movement.quantity_kg = updated.sample_kg_taken;
      movement.coffee_type = updated.coffee_type;
    }
    writeDemoStore(store);
    return decorate(updated);
  },

  async archive(id, reason = '') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('archive_buyer_inspection', { p_buyer_inspection_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const archivedAt = nowIso();
    const index = store.buyerInspections.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Buyer inspection not found');
    store.buyerInspections[index] = { ...store.buyerInspections[index], archived_at: archivedAt, archived: true, archive_reason: reason };
    store.stockMovements = store.stockMovements.map((item) => item.source_type === 'buyer_inspection' && item.source_id === id ? { ...item, archived_at: archivedAt } : item);
    writeDemoStore(store);
    return decorate(store.buyerInspections[index]);
  },
};
