import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { readDemoStore, writeDemoStore, createDemoId } from './demoStore';

const nowIso = () => new Date().toISOString();

// ── Demo seed users ─────────────────────────────────────────────────────────
const SEED_USERS = [
  {
    id: 'demo-user-001',
    full_name: 'Demo Admin',
    email: 'demo-admin@beanledgerexport.com',
    role: 'admin',
    status: 'active',
    is_active: true,
    approved_by: null,
    approved_at: '2026-01-01T08:00:00Z',
    rejected_by: null,
    rejection_reason: null,
    last_sign_in: '2026-07-11T14:30:00Z',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'demo-user-002',
    full_name: 'Abebe Kebede',
    email: 'abebe.k@beanledgerexport.com',
    role: 'purchaser',
    status: 'active',
    is_active: true,
    approved_by: 'demo-user-001',
    approved_at: '2026-02-10T10:00:00Z',
    rejected_by: null,
    rejection_reason: null,
    last_sign_in: '2026-07-10T09:15:00Z',
    created_at: '2026-02-05T08:00:00Z',
    updated_at: '2026-02-10T10:00:00Z',
  },
  {
    id: 'demo-user-003',
    full_name: 'Tigist Haile',
    email: 'tigist.h@beanledgerexport.com',
    role: 'warehouse_keeper',
    status: 'active',
    is_active: true,
    approved_by: 'demo-user-001',
    approved_at: '2026-03-01T09:00:00Z',
    rejected_by: null,
    rejection_reason: null,
    last_sign_in: '2026-07-09T16:45:00Z',
    created_at: '2026-02-28T08:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'demo-user-004',
    full_name: 'Dawit Tadesse',
    email: 'dawit.t@beanledgerexport.com',
    role: 'process_manager',
    status: 'active',
    is_active: true,
    approved_by: 'demo-user-001',
    approved_at: '2026-04-15T11:00:00Z',
    rejected_by: null,
    rejection_reason: null,
    last_sign_in: '2026-07-08T13:20:00Z',
    created_at: '2026-04-10T08:00:00Z',
    updated_at: '2026-04-15T11:00:00Z',
  },
  {
    id: 'demo-user-005',
    full_name: 'Meron Assefa',
    email: 'meron.a@beanledgerexport.com',
    role: 'viewer',
    status: 'pending',
    is_active: false,
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejection_reason: null,
    last_sign_in: null,
    created_at: '2026-07-10T08:00:00Z',
    updated_at: '2026-07-10T08:00:00Z',
  },
];

const SEED_INVITES = [
  {
    id: 'demo-invite-001',
    email: 'new-auditor@beanledgerexport.com',
    role: 'auditor',
    invited_by: 'demo-user-001',
    invited_by_name: 'Demo Admin',
    status: 'pending',
    created_at: '2026-07-08T10:00:00Z',
  },
  {
    id: 'demo-invite-002',
    email: 'finance@beanledgerexport.com',
    role: 'accountant',
    invited_by: 'demo-user-001',
    invited_by_name: 'Demo Admin',
    status: 'accepted',
    created_at: '2026-06-20T09:00:00Z',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function getDemoUsers() {
  const store = readDemoStore();
  if (store.users && store.users.length > 0) return store.users;
  // Seed on first access
  const users = SEED_USERS.map((u) => ({ ...u }));
  store.users = users;
  writeDemoStore(store);
  return users;
}

function getDemoInvites() {
  const store = readDemoStore();
  if (store.userInvites && store.userInvites.length > 0) return store.userInvites;
  const invites = SEED_INVITES.map((i) => ({ ...i }));
  store.userInvites = invites;
  writeDemoStore(store);
  return invites;
}

function saveDemoUsers(users) {
  const store = readDemoStore();
  store.users = users;
  writeDemoStore(store);
}

function saveDemoInvites(invites) {
  const store = readDemoStore();
  store.userInvites = invites;
  writeDemoStore(store);
}

// ── Service ─────────────────────────────────────────────────────────────────
export const userService = {
  async list() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return getDemoUsers().sort(
      (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
    );
  },

  async get(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
    const users = getDemoUsers();
    return users.find((u) => u.id === id) || null;
  },

  async updateRole(id, role) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .update({ role, updated_at: nowIso() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const users = getDemoUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error('User not found');
    users[idx] = { ...users[idx], role, updated_at: nowIso() };
    saveDemoUsers(users);
    return users[idx];
  },

  async approve(id, approvedBy) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .update({ status: 'active', approved_by: approvedBy, approved_at: nowIso(), updated_at: nowIso() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const users = getDemoUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error('User not found');
    users[idx] = {
      ...users[idx],
      status: 'active',
      is_active: true,
      approved_by: approvedBy,
      approved_at: nowIso(),
      updated_at: nowIso(),
    };
    saveDemoUsers(users);
    return users[idx];
  },

  async reject(id, rejectedBy, reason) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .update({ status: 'rejected', rejected_by: rejectedBy, rejection_reason: reason, updated_at: nowIso() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const users = getDemoUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error('User not found');
    users[idx] = {
      ...users[idx],
      status: 'rejected',
      rejected_by: rejectedBy,
      rejection_reason: reason,
      updated_at: nowIso(),
    };
    saveDemoUsers(users);
    return users[idx];
  },

  async deactivate(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: false, updated_at: nowIso() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const users = getDemoUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error('User not found');
    users[idx] = { ...users[idx], is_active: false, updated_at: nowIso() };
    saveDemoUsers(users);
    return users[idx];
  },

  async activate(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: true, updated_at: nowIso() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const users = getDemoUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error('User not found');
    users[idx] = { ...users[idx], is_active: true, updated_at: nowIso() };
    saveDemoUsers(users);
    return users[idx];
  },

  async invite(email, role, invitedBy) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('user_invites')
        .insert({ email, role, invited_by: invitedBy })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const invites = getDemoInvites();
    const newInvite = {
      id: createDemoId(),
      email,
      role,
      invited_by: invitedBy,
      invited_by_name: 'Demo Admin',
      status: 'pending',
      created_at: nowIso(),
    };
    invites.push(newInvite);
    saveDemoInvites(invites);
    return newInvite;
  },

  async listInvites() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('user_invites')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return getDemoInvites().sort(
      (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
    );
  },
};
