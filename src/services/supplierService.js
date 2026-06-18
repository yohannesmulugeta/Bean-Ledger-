import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

const nowIso = () => new Date().toISOString();

function normalizeSupplier(data) {
  return {
    organization_id: data.organization_id || DEMO_META.organizationId,
    base44_id: data.base44_id ?? null,
    is_demo: data.is_demo ?? true,
    supplier_name: String(data.supplier_name || '').trim(),
    region: data.region || '',
    agent: data.agent || '',
    coffee_type: data.coffee_type || '',
    opening_stock_kg: Number(data.opening_stock_kg || 0),
    phone_number: data.phone_number || '',
    coffee_origin: data.coffee_origin || '',
    station_name: data.station_name || '',
    agreement_date: data.agreement_date || null,
    agreement_expiry_date: data.agreement_expiry_date || null,
  };
}

async function listLocal() {
  return readDemoStore().suppliers
    .filter((supplier) => !supplier.archived_at)
    .sort((a, b) => String(a.supplier_name).localeCompare(String(b.supplier_name)));
}

export const supplierService = {
  async list() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .is('archived_at', null)
        .order('supplier_name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return listLocal();
  },

  async create(data) {
    const payload = normalizeSupplier(data);
    if (!payload.supplier_name) throw new Error('Supplier name is required');

    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase
        .from('suppliers')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return created;
    }

    const store = readDemoStore();
    const timestamp = nowIso();
    const created = { id: createDemoId(), ...payload, created_at: timestamp, updated_at: timestamp, archived_at: null };
    store.suppliers.push(created);
    writeDemoStore(store);
    return created;
  },

  async update(id, data) {
    const payload = { ...normalizeSupplier(data), updated_at: nowIso() };
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }

    const store = readDemoStore();
    const index = store.suppliers.findIndex((supplier) => supplier.id === id);
    if (index < 0) throw new Error('Supplier not found');
    store.suppliers[index] = { ...store.suppliers[index], ...payload };
    writeDemoStore(store);
    return store.suppliers[index];
  },

  async archive(id) {
    const archivedAt = nowIso();
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('suppliers')
        .update({ archived_at: archivedAt, updated_at: archivedAt })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const store = readDemoStore();
    const index = store.suppliers.findIndex((supplier) => supplier.id === id);
    if (index < 0) throw new Error('Supplier not found');
    store.suppliers[index] = { ...store.suppliers[index], archived_at: archivedAt, updated_at: archivedAt };
    writeDemoStore(store);
    return store.suppliers[index];
  },
};
