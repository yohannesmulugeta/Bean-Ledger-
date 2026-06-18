import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { useRole, ROLE_LABELS, MODULES, PERMISSION_TYPES, DEFAULT_ROLE_PERMISSIONS } from '@/lib/role-hooks';
import PageHeader from '@/components/shared/PageHeader';
import AccessDenied from '@/components/AccessDenied';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Users, UserPlus, Shield, Activity, Settings, Clock, Mail, Copy, Check, X, UserCheck, UserX, AlertTriangle, Search,
  Ban, Send, Save, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ROLES_LIST = Object.keys(ROLE_LABELS);

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(s) { if (!s) return '—'; try { return format(new Date(s), 'dd/MM/yyyy HH:mm'); } catch { return s; } }
function fmtShort(s) { if (!s) return '—'; try { return format(new Date(s), 'dd/MM/yyyy'); } catch { return s; } }

const STATUS_BADGES = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-amber-100 text-amber-700',
  invited: 'bg-blue-100 text-blue-700',
  unassigned: 'bg-red-100 text-red-700',
};
const STATUS_LABELS = { active: 'Active', inactive: 'Inactive', pending_approval: 'Pending', invited: 'Invited', unassigned: 'Unassigned' };

function StatusBadge({ status }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[status] || STATUS_BADGES.unassigned}`}>{STATUS_LABELS[status] || status}</span>;
}

function RoleBadge({ role }) {
  const colors = { admin: 'bg-red-100 text-red-700', supervisor: 'bg-purple-100 text-purple-700', unassigned: 'bg-gray-100 text-gray-500' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || 'bg-indigo-100 text-indigo-700'}`}>{ROLE_LABELS[role] || role}</span>;
}

// ── Module Categories for grouping ─────────────────────────────────────────────
const MODULE_CATEGORIES = {
  'Operations': ['dashboard', 'purchase_registration', 'warehouse_receipt', 'sample_log', 'processing_log', 'output_report'],
  'Export & Stock': ['export_contracts', 'buyer_inspections', 'stock_report', 'materials_register', 'bag_ledger'],
  'Reports': ['reports', 'purchase_orders_report', 'warehouse_receipt_report', 'user_activity_report', 'activity_log'],
  'Notifications': ['notification_history', 'notification_settings'],
  'Admin': ['master_data', 'users_roles'],
};

const PERMISSION_LABELS = {
  can_view: 'View', can_create: 'Create', can_edit: 'Edit', can_delete: 'Delete',
  can_archive: 'Archive', can_restore: 'Restore', can_export: 'Export', can_import: 'Import',
  can_approve: 'Approve', can_manage_payments: 'Payments', can_view_financials: 'Financials',
  can_manage_attachments: 'Attachments',
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function UsersManagement() {
  const { isAdmin, isSupervisor, canManageUsers } = useRole();
  const currentUser = useUser();
  const canManage = isAdmin || (isSupervisor && canManageUsers);

  if (!canManage) return <AccessDenied message="Only administrators (and supervisors with manage users enabled) can access user management." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Manage users, roles, permissions, invites, and security settings." />
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap h-auto gap-1 mb-6">
          <TabsTrigger value="users"><Users className="w-3.5 h-3.5 mr-1.5" /> Users</TabsTrigger>
          <TabsTrigger value="pending"><Clock className="w-3.5 h-3.5 mr-1.5" /> Pending Approval</TabsTrigger>
          <TabsTrigger value="invites"><Mail className="w-3.5 h-3.5 mr-1.5" /> Invites</TabsTrigger>
          <TabsTrigger value="permissions"><Shield className="w-3.5 h-3.5 mr-1.5" /> Role Permissions</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="w-3.5 h-3.5 mr-1.5" /> Activity</TabsTrigger>
          <TabsTrigger value="security"><Settings className="w-3.5 h-3.5 mr-1.5" /> Security Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab currentUser={currentUser} /></TabsContent>
        <TabsContent value="pending"><PendingTab /></TabsContent>
        <TabsContent value="invites"><InvitesTab currentUser={currentUser} /></TabsContent>
        <TabsContent value="permissions"><PermissionsTab /></TabsContent>
        <TabsContent value="activity"><ActivityTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: Users
// ════════════════════════════════════════════════════════════════════════════════
function UsersTab({ currentUser }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [showConfirm, setShowConfirm] = useState(null);

  const { role: currentRole, isAdmin, isSupervisor, canManageUsers } = useRole();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10000,
  });

  const adminCount = useMemo(() => users.filter(u => u.role === 'admin' && u.is_active !== false).length, [users]);

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-users'] }); toast.success('User updated'); },
    onError: (e) => toast.error(e?.message || 'Update failed'),
  });

  // Sync status from role
  useEffect(() => {
    users.forEach(u => {
      if (u.role === 'unassigned' && u.status !== 'unassigned') {
        updateUser.mutate({ id: u.id, data: { status: 'unassigned' } });
      }
    });
  }, []);  

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search || (u.full_name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || (u.status || u.role === 'unassigned' ? 'unassigned' : 'active') === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleChangeRole = () => {
    if (!selectedUser || !newRole) return;
    // Safety: last admin check
    if (selectedUser.role === 'admin' && newRole !== 'admin' && adminCount <= 1) {
      return toast.error('Cannot remove the last admin. Assign another user as admin first.');
    }
    // Supervisor cannot assign admin
    if (isSupervisor && newRole === 'admin') {
      return toast.error('Supervisors cannot assign the admin role.');
    }
    // Self-demotion safety
    if (selectedUser.email === currentUser?.email && newRole !== 'admin' && selectedUser.role === 'admin' && isAdmin) {
      return toast.error('You cannot remove your own admin access.');
    }
    updateUser.mutate({ id: selectedUser.id, data: { role: newRole, status: newRole === 'unassigned' ? 'unassigned' : 'active' } }, {
      onSuccess: () => { setShowRoleDialog(false); setSelectedUser(null); },
    });
  };

  const handleAction = (action, user) => {
    // Safety: last admin
    if ((action === 'deactivate' || action === 'unassign') && user.role === 'admin' && adminCount <= 1) {
      setShowConfirm(null);
      return toast.error('Cannot deactivate or unassign the last admin. Assign another admin first.');
    }
    if (action === 'activate') updateUser.mutate({ id: user.id, data: { is_active: true, status: 'active' } });
    if (action === 'deactivate') updateUser.mutate({ id: user.id, data: { is_active: false, status: 'inactive' } });
    if (action === 'unassign') {
      if (user.email === currentUser?.email) return toast.error('You cannot unassign yourself.');
      if (isSupervisor && user.role === 'admin') return toast.error('Supervisors cannot modify admin users.');
      updateUser.mutate({ id: user.id, data: { role: 'unassigned', status: 'unassigned' } });
    }
    setShowConfirm(null);
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>{[{ key: 'all', label: 'All Roles' }, ...ROLES_LIST.map(r => ({ key: r, label: ROLE_LABELS[r] }))].map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>{['all', 'active', 'inactive', 'pending_approval', 'invited', 'unassigned'].map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s] || 'All Status'}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">Last Sign-In</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">Created</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No users found.</td></tr>
            )}
            {filtered.map((u, i) => (
              <tr key={u.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{u.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3"><StatusBadge status={u.status || (u.role === 'unassigned' ? 'unassigned' : 'active')} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{fmtDate(u.last_sign_in_at)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{fmtShort(u.created_date)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Change Role" onClick={() => { setSelectedUser(u); setNewRole(u.role); setShowRoleDialog(true); }}>
                      <Shield className="w-3.5 h-3.5" />
                    </Button>
                    {u.is_active !== false ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Deactivate" onClick={() => setShowConfirm({ action: 'deactivate', user: u })}>
                        <Ban className="w-3.5 h-3.5 text-amber-600" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Activate" onClick={() => setShowConfirm({ action: 'activate', user: u })}>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset to Unassigned" onClick={() => setShowConfirm({ action: 'unassign', user: u })}>
                      <UserX className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Change Role</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{selectedUser?.full_name || selectedUser?.email}</p>
            <Label>Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES_LIST.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
            <Button onClick={handleChangeRole} disabled={updateUser.isPending}>{updateUser.isPending ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={!!showConfirm} onOpenChange={() => setShowConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Confirm Action</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {showConfirm?.action === 'deactivate' && `Deactivate ${showConfirm?.user?.full_name || showConfirm?.user?.email}?`}
            {showConfirm?.action === 'activate' && `Activate ${showConfirm?.user?.full_name || showConfirm?.user?.email}?`}
            {showConfirm?.action === 'unassign' && `Reset ${showConfirm?.user?.full_name || showConfirm?.user?.email} to unassigned? They will lose all ERP access.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showConfirm && handleAction(showConfirm.action, showConfirm.user)}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: Pending Approval
// ════════════════════════════════════════════════════════════════════════════════
function PendingTab() {
  const qc = useQueryClient();
  const { isSupervisor } = useRole();
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState(null);

  const approvalRoles = isSupervisor
    ? ROLES_LIST.filter(r => r !== 'unassigned' && r !== 'admin')
    : ROLES_LIST.filter(r => r !== 'unassigned');

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10000,
  });

  const pending = useMemo(() => users.filter(u => u.status === 'pending_approval' || (u.role === 'unassigned' && u.status !== 'inactive')), [users]);

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-users'] }); toast.success('Action completed'); setSelected(null); },
    onError: (e) => toast.error(e?.message || 'Action failed'),
  });

  const handleApprove = (user, role) => {
    updateUser.mutate({
      id: user.id,
      data: { status: 'active', role, is_active: true, approved_by: 'admin', approved_at: new Date().toISOString(), internal_note: note || undefined },
    });
  };

  const handleReject = (user) => {
    updateUser.mutate({
      id: user.id,
      data: { status: 'inactive', is_active: false, rejected_by: 'admin', rejected_at: new Date().toISOString(), rejection_reason: note || 'Access rejected by admin' },
    });
  };

  return (
    <div className="space-y-4">
      {pending.length === 0 && <div className="text-center py-12 text-muted-foreground border border-border rounded-xl bg-card">No users pending approval.</div>}
      {pending.map(u => (
        <div key={u.id} className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{u.full_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Registered: {fmtShort(u.created_date)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select onValueChange={(role) => handleApprove(u, role)}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Approve as..." /></SelectTrigger>
              <SelectContent>
                {approvalRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelected(selected?.id === u.id ? null : u)}>
              {selected?.id === u.id ? <X className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            </Button>
            {selected?.id === u.id && (
              <div className="flex items-center gap-1">
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason..." className="h-8 w-32 text-xs" />
                <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleReject(u)}>Reject</Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: Invites
// ════════════════════════════════════════════════════════════════════════════════
function InvitesTab({ currentUser }) {
  const qc = useQueryClient();
  const { isSupervisor } = useRole();
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteNote, setInviteNote] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  const [requireApproval, setRequireApproval] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Supervisor cannot assign admin role
  const availableRoles = isSupervisor
    ? ROLES_LIST.filter(r => r !== 'unassigned' && r !== 'admin')
    : ROLES_LIST.filter(r => r !== 'unassigned');

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['user-invites'],
    queryFn: () => base44.entities.UserInvite.list('-created_date'),
    staleTime: 10000,
  });

  const createInvite = useMutation({
    mutationFn: (data) => base44.entities.UserInvite.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-invites'] });
      toast.success('Invite created');
      setEmail(''); setInviteNote('');
    },
    onError: (e) => toast.error(e?.message || 'Failed to create invite'),
  });

  const cancelInvite = useMutation({
    mutationFn: (id) => base44.entities.UserInvite.update(id, { status: 'cancelled' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-invites'] }); toast.success('Invite cancelled'); },
  });

  const copyInviteMessage = (inv) => {
    const msg = `You've been invited to join BeanLedger Coffee ERP as ${ROLE_LABELS[inv.role]}.\nRegister at: ${window.location.origin}/register\n${inv.note ? `Note: ${inv.note}` : ''}`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedId(inv.id);
      toast.success('Invite message copied');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCreate = () => {
    if (!email) return toast.error('Email is required');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays || '30'));
    createInvite.mutate({
      email, role: inviteRole, note: inviteNote,
      expires_at: expiresAt.toISOString(),
      invited_by: currentUser?.email || '',
      single_use: true,
      require_manual_approval: requireApproval,
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Invite Form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite New User</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{availableRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Expires (days)</Label>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{[7, 14, 30, 60, 90].map(d => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input value={inviteNote} onChange={e => setInviteNote(e.target.value)} placeholder="Optional note..." className="h-9 flex-1" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={requireApproval} onChange={e => setRequireApproval(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
            Require manual approval
          </label>
        </div>
        <Button onClick={handleCreate} disabled={createInvite.isPending} className="gap-2">
          <Send className="w-3.5 h-3.5" /> {createInvite.isPending ? 'Creating...' : 'Create Invite'}
        </Button>
      </div>

      {/* Invites Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">Created</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No invites yet.</td></tr>}
              {invites.map(inv => (
                <tr key={inv.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{inv.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={inv.role} /></td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      inv.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                      inv.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'expired' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{fmtShort(inv.expires_at)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{fmtShort(inv.created_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy invite" onClick={() => copyInviteMessage(inv)}>
                        {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      {inv.status === 'pending' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Cancel" onClick={() => cancelInvite.mutate(inv.id)}>
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: Role Permissions
// ════════════════════════════════════════════════════════════════════════════════
function PermissionsTab() {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('purchaser');
  const [permissions, setPermissions] = useState({});
  const [dirty, setDirty] = useState(false);

  const { data: dbRecords = [], isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => base44.entities.RolePermission.list(),
    staleTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existing = dbRecords.find(r => r.role === selectedRole);
      // Derive allowed_paths from permissions_data: include paths where can_view is true
      const derivedPaths = [];
      const permsData = permissions || {};
      for (const [moduleKey, modPerms] of Object.entries(permsData)) {
        if (modPerms.can_view && MODULES[moduleKey]) {
          derivedPaths.push(MODULES[moduleKey].path);
        }
      }
      // Always include dashboard and system paths
      const SYSTEM_PATHS = ['/notification-history', '/notification-settings'];
      const finalPaths = [...new Set(['/', ...derivedPaths, ...SYSTEM_PATHS])];

      const payload = {
        role: selectedRole,
        allowed_paths: JSON.stringify(finalPaths),
        permissions_data: JSON.stringify(permissions),
      };
      if (existing) await base44.entities.RolePermission.update(existing.id, payload);
      else await base44.entities.RolePermission.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
      setDirty(false);
      toast.success(`Permissions for ${ROLE_LABELS[selectedRole]} saved.`);
    },
    onError: (e) => toast.error(e?.message || 'Save failed'),
  });

  useEffect(() => {
    if (!isLoading && selectedRole) {
      const rec = dbRecords.find(r => r.role === selectedRole);
      if (rec?.permissions_data) {
        try { setPermissions(JSON.parse(rec.permissions_data)); setDirty(false); } catch { loadDefaults(); }
      } else {
        loadDefaults();
      }
    }
  }, [selectedRole, isLoading, dbRecords]);  

  function loadDefaults() {
    setPermissions(DEFAULT_ROLE_PERMISSIONS[selectedRole] || {});
    setDirty(false);
  }

  const togglePerm = (moduleKey, permKey) => {
    setPermissions(prev => {
      const modPerms = { ...(prev[moduleKey] || {}) };
      modPerms[permKey] = !modPerms[permKey];
      return { ...prev, [moduleKey]: modPerms };
    });
    setDirty(true);
  };

  const setModuleAll = (moduleKey, value) => {
    setPermissions(prev => {
      const modPerms = {};
      if (value === 'full') PERMISSION_TYPES.forEach(p => modPerms[p] = true);
      else if (value === 'readonly') { modPerms.can_view = true; }
      else if (value === 'none') { /* all false */ }
      return { ...prev, [moduleKey]: modPerms };
    });
    setDirty(true);
  };

  const isAdminRole = selectedRole === 'admin' || selectedRole === 'supervisor';

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-4">
      {/* Role selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-xs font-semibold">Select Role:</Label>
        <div className="flex flex-wrap gap-1.5">
          {ROLES_LIST.filter(r => r !== 'unassigned').map(r => (
            <Button key={r} variant={selectedRole === r ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setSelectedRole(r)}>
              {ROLE_LABELS[r]}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={loadDefaults} disabled={isAdminRole}>
          <RotateCcw className="w-3 h-3" /> Reset Defaults
        </Button>
        <Button size="sm" className="h-8 gap-1" onClick={() => saveMutation.mutate()} disabled={!dirty || isAdminRole || saveMutation.isPending}>
          <Save className="w-3 h-3" /> {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {dirty && <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">You have unsaved changes.</div>}

      {isAdminRole && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">Admin and Supervisor roles always have full access to all modules and actions.</div>
      )}

      {/* Permission Matrix */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-48">Module</th>
              <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-20">Quick Set</th>
              {PERMISSION_TYPES.map(p => (
                <th key={p} className="text-center px-2 py-2 font-semibold text-muted-foreground rotate-on-mobile" style={{ writingMode: 'vertical-rl', fontSize: '10px' }}>
                  {PERMISSION_LABELS[p]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(MODULE_CATEGORIES).map(([cat, moduleKeys]) => (
              <React.Fragment key={cat}>
                <tr className="bg-muted/30">
                  <td colSpan={PERMISSION_TYPES.length + 2} className="px-3 py-1.5 text-[11px] font-bold uppercase text-muted-foreground">{cat}</td>
                </tr>
                {moduleKeys.filter(k => MODULES[k]).map(k => {
                  const mod = MODULES[k];
                  const modPerms = permissions[k] || {};
                  return (
                    <tr key={k} className="border-b border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">{mod.label}</td>
                      <td className="px-2 py-2 text-center">
                        <Select value="" onValueChange={(v) => v && setModuleAll(k, v)} disabled={isAdminRole}>
                          <SelectTrigger className="h-7 text-[10px] w-16 mx-auto"><SelectValue placeholder="Set..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full</SelectItem>
                            <SelectItem value="readonly">Read Only</SelectItem>
                            <SelectItem value="none">No Access</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      {PERMISSION_TYPES.map(p => (
                        <td key={p} className="text-center px-2 py-2">
                          <input
                            type="checkbox"
                            checked={isAdminRole ? true : !!modPerms[p]}
                            disabled={isAdminRole}
                            onChange={() => togglePerm(k, p)}
                            className="w-3.5 h-3.5 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: Activity
// ════════════════════════════════════════════════════════════════════════════════
function ActivityTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['user-activity-logs'],
    queryFn: () => base44.entities.UserActivityLog.list('-created_date', 100),
    staleTime: 15000,
  });

  const { data: existingActivityLogs = [] } = useQuery({
    queryKey: ['activity-logs-legacy'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 100),
    staleTime: 15000,
    enabled: logs.length === 0,
  });

  const merged = useMemo(() => {
    const mapped = (logs || []).map(l => ({
      ...l, source: 'new', actionLabel: l.action, moduleLabel: l.module_label, recordLabel: l.record_label,
    }));
    const legacy = (existingActivityLogs || []).map(l => ({
      ...l, source: 'legacy', action: l.action_type, module_label: l.screen_name, record_label: l.record_description, user_name: '', user_role: '',
    }));
    return [...mapped, ...legacy].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 200);
  }, [logs, existingActivityLogs]);

  const filtered = useMemo(() => {
    return merged.filter(l => {
      const matchSearch = !search || (l.user_email || '').toLowerCase().includes(search.toLowerCase()) || (l.user_name || '').toLowerCase().includes(search.toLowerCase()) || (l.record_label || '').toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || l.user_role === roleFilter;
      const matchAction = actionFilter === 'all' || l.action === actionFilter;
      return matchSearch && matchRole && matchAction;
    });
  }, [merged, search, roleFilter, actionFilter]);

  const actions = useMemo(() => [...new Set(merged.map(l => l.action).filter(Boolean))], [merged]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user or record..." className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>{[{ key: 'all', label: 'All Roles' }, ...ROLES_LIST.map(r => ({ key: r, label: ROLE_LABELS[r] }))].map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>{[{ key: 'all', label: 'All Actions' }, ...actions.map(a => ({ key: a, label: a }))].map(a => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">User</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Role</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Action</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">Module</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">Record</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No activity recorded yet.</td></tr>}
              {filtered.map((l, i) => (
                <tr key={l.id || i} className={`border-b border-border hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-3 py-2.5"><span className="font-medium text-foreground">{l.user_name || l.user_email}</span></td>
                  <td className="px-3 py-2.5"><RoleBadge role={l.user_role || 'viewer'} /></td>
                  <td className="px-3 py-2.5"><span className="text-xs">{l.action || l.action_type}</span></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{l.module_label || l.screen_name || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{l.record_label || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtShort(l.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: Security Settings
// ════════════════════════════════════════════════════════════════════════════════
function SecurityTab() {
  const qc = useQueryClient();
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['security-settings'],
    queryFn: () => base44.entities.SecuritySetting.list(),
    staleTime: 0,
  });

  const saveSetting = useMutation({
    mutationFn: ({ key, value, description }) => {
      const existing = settings.find(s => s.key === key);
      if (existing) return base44.entities.SecuritySetting.update(existing.id, { value, updated_by: 'admin', updated_at: new Date().toISOString() });
      return base44.entities.SecuritySetting.create({ key, value, description, updated_by: 'admin', updated_at: new Date().toISOString() });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['security-settings'] }); toast.success('Setting saved'); },
  });

  const getVal = (key, def = 'false') => {
    const s = settings.find(s => s.key === key);
    return s ? s.value : def;
  };

  const toggle = (key, desc) => {
    const current = getVal(key);
    saveSetting.mutate({ key, value: current === 'true' ? 'false' : 'true', description: desc });
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-48 w-full" /></div>;

  const ITEMS = [
    { key: 'require_approval', label: 'Require approval for new users', desc: 'New registrations must be approved before accessing the ERP' },
    { key: 'allow_supervisor_manage_users', label: 'Allow supervisor to manage users', desc: 'Supervisor role can manage users, change roles, and approve pending users' },
    { key: 'allow_supervisor_manage_permissions', label: 'Allow supervisor to manage role permissions', desc: 'Supervisor role can edit role permission matrix' },
    { key: 'restrict_data_export', label: 'Restrict data export', desc: 'Only admin, accountant, and auditor can export data' },
    { key: 'restrict_financial_visibility', label: 'Restrict financial visibility', desc: 'Hide financial data from roles without can_view_financials' },
    { key: 'auto_deactivate_days', label: 'Auto-deactivate inactive users', desc: 'Days of inactivity before auto-deactivation (0 = disabled)' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {ITEMS.map((item, i) => {
        const val = getVal(item.key);
        return (
          <div key={item.key} className={`flex items-center justify-between px-5 py-4 ${i < ITEMS.length - 1 ? 'border-b border-border' : ''}`}>
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              {item.key === 'auto_deactivate_days' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{val === '0' ? 'Off' : `${val} days`}</span>
                  <Select value={val} onValueChange={(v) => saveSetting.mutate({ key: item.key, value: v, description: item.desc })}>
                    <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Off</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <button
                  onClick={() => toggle(item.key, item.desc)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${val === 'true' ? 'bg-primary' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val === 'true' ? 'left-5' : 'left-0.5'}`} />
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div className="px-5 py-3 bg-muted/20 border-t border-border">
        <p className="text-[11px] text-muted-foreground">Changes take effect immediately. Security settings affect all users across the ERP.</p>
      </div>
    </div>
  );
}