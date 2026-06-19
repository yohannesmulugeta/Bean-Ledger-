// @ts-nocheck
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

export const DEMO_NOTIFICATION_TYPES = [
  'new_purchase',
  'warehouse_confirmed',
  'export_contract',
  'weekly_payment_summary',
  'low_stock',
  'stock_empty',
];

function normalizeNotification(record) {
  const readAt = record.read_at || (record.is_read ? record.updated_at || record.created_at : null);
  return {
    ...record,
    created_date: record.created_date || record.created_at,
    is_read: Boolean(readAt),
    read_at: readAt,
    recipient_email: record.recipient_email || 'demo-admin@kkgt.local',
  };
}

function activeOnly(records, includeArchived) {
  return includeArchived ? records : records.filter((item) => !item.archived_at);
}

export const notificationService = {
  list: async ({ recipientEmail = null, includeArchived = false } = {}) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('list_demo_notifications', {
        p_organization_id: DEMO_META.organizationId,
        p_recipient_email: recipientEmail,
        p_include_archived: includeArchived,
      });
      if (!error) return (data || []).map(normalizeNotification);
    }

    const store = readDemoStore();
    return activeOnly(store.notifications || [], includeArchived)
      .filter((item) => !recipientEmail || !item.recipient_email || item.recipient_email.toLowerCase() === recipientEmail.toLowerCase())
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map(normalizeNotification);
  },

  markRead: async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: id,
      });
      if (!error) return normalizeNotification(data);
    }

    const store = readDemoStore();
    const now = new Date().toISOString();
    store.notifications = (store.notifications || []).map((item) =>
      item.id === id ? { ...item, read_at: item.read_at || now } : item
    );
    writeDemoStore(store);
    return normalizeNotification(store.notifications.find((item) => item.id === id));
  },

  markAllRead: async ({ recipientEmail = null } = {}) => {
    const notifications = await notificationService.list({ recipientEmail });
    await Promise.all(notifications.filter((item) => !item.is_read).map((item) => notificationService.markRead(item.id)));
    return notificationService.list({ recipientEmail });
  },

  getPreferences: async (userEmail = 'demo-admin@kkgt.local') => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', DEMO_META.organizationId)
        .ilike('user_email', userEmail)
        .is('archived_at', null)
        .maybeSingle();
      if (!error && data) return data;
    }

    const store = readDemoStore();
    return (store.notificationPreferences || []).find((item) => item.user_email?.toLowerCase() === userEmail.toLowerCase()) || {
      id: null,
      organization_id: DEMO_META.organizationId,
      user_email: userEmail,
      disabled_types: [],
      is_demo: true,
    };
  },

  savePreferences: async (userEmail, disabledTypes) => {
    const safeDisabled = Array.isArray(disabledTypes) ? disabledTypes : [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('save_demo_notification_preferences', {
        p_organization_id: DEMO_META.organizationId,
        p_user_email: userEmail,
        p_disabled_types: safeDisabled,
      });
      if (!error) return data;
    }

    const store = readDemoStore();
    const now = new Date().toISOString();
    const preferences = store.notificationPreferences || [];
    const existing = preferences.find((item) => item.user_email?.toLowerCase() === userEmail.toLowerCase());
    if (existing) {
      existing.disabled_types = safeDisabled;
      existing.updated_at = now;
    } else {
      preferences.push({
        id: createDemoId(),
        organization_id: DEMO_META.organizationId,
        user_email: userEmail,
        disabled_types: safeDisabled,
        is_demo: true,
        created_at: now,
        updated_at: now,
        archived_at: null,
      });
    }
    store.notificationPreferences = preferences;
    writeDemoStore(store);
    return preferences.find((item) => item.user_email?.toLowerCase() === userEmail.toLowerCase());
  },
};
