import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { calculateSupplierAvailableKgFromMovements } from '@/lib/processingOutputCalculations';
import { DEMO_META } from './demoData';
import { readDemoStore } from './demoStore';

export const stockService = {
  async supplierAvailability() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('calculate_supplier_available_kg', {
        p_organization_id: DEMO_META.organizationId,
        p_supplier_id: null,
      });
      if (error) throw error;
      return data || [];
    }

    const store = readDemoStore();
    return store.suppliers.map((supplier) => ({
      supplier_id: supplier.id,
      supplier_name: supplier.supplier_name,
      available_kg: calculateSupplierAvailableKgFromMovements(store.stockMovements, supplier.id),
    }));
  },

  async listMovements({ includeArchived = false } = {}) {
    if (isSupabaseConfigured) {
      let query = supabase.from('stock_movements').select('*').order('occurred_at', { ascending: false });
      if (!includeArchived) query = query.is('archived_at', null);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    return readDemoStore().stockMovements
      .filter((item) => includeArchived || !item.archived_at)
      .sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));
  },
};
