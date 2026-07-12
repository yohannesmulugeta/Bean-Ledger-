// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { useRole } from '@/lib/role-hooks';
import AccessDenied from '@/components/AccessDenied';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  MoreVertical,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'purchaser', label: 'Purchaser' },
  { value: 'warehouse_keeper', label: 'Warehouse Keeper' },
  { value: 'process_manager', label: 'Process Manager' },
  { value: 'final_registrar', label: 'Final Registrar' },
  { value: 'export_manager', label: 'Export Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'viewer', label: 'Viewer' },
];

function getRoleBadgeColor(role) {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'supervisor':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'purchaser':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'warehouse_keeper':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'process_manager':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'export_manager':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'accountant':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'auditor':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export default function UsersManagement() {
  const { role, isAdminOrSupervisor, user: currentUser } = useRole();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  // Actions states
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  // Fetch Users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list(),
  });

  // Fetch Invites
  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ['user-invites'],
    queryFn: () => userService.listInvites(),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => userService.invite(email, role, currentUser.email),
    onSuccess: () => {
      toast.success('Invitation sent successfully!');
      setInviteDialogOpen(false);
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['user-invites'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to send invitation');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (userId) => userService.approve(userId, currentUser.email),
    onSuccess: () => {
      toast.success('User approved successfully!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to approve user');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }) => userService.reject(userId, currentUser.email, reason),
    onSuccess: () => {
      toast.success('User application rejected');
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to reject application');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }) => {
      if (isActive) {
        return userService.deactivate(userId);
      } else {
        return userService.activate(userId);
      }
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? 'User deactivated' : 'User activated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update user status');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => userService.updateRole(userId, role),
    onSuccess: () => {
      toast.success('Role updated successfully');
      setRoleChangeDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update role');
    },
  });

  if (!isAdminOrSupervisor) {
    return <AccessDenied message="Only Admin or Supervisor roles can access Users & Roles management." />;
  }

  // Filter lists based on search
  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term);
    return matchesSearch;
  });

  const activeUsers = filteredUsers.filter((u) => u.status === 'active');
  const pendingUsers = filteredUsers.filter((u) => u.status === 'pending' || u.status === 'unassigned');
  
  const filteredInvites = invites.filter((inv) =>
    (inv.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error('Email is required');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!rejectReason) {
      toast.error('Rejection reason is required');
      return;
    }
    rejectMutation.mutate({ userId: selectedUser.id, reason: rejectReason });
  };

  const handleRoleChangeSubmit = (e) => {
    e.preventDefault();
    updateRoleMutation.mutate({ userId: selectedUser.id, role: selectedRole });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Manage user approvals, invitations, and system roles">
        <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Invite User
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users or invitations..."
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user-invites'] });
            toast.info('Data refreshed');
          }}
          title="Refresh User Data"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="active" className="rounded-md gap-2">
            <ShieldCheck className="w-4 h-4" />
            Active Users
            <Badge variant="secondary" className="ml-1 px-1.5 py-0">
              {loadingUsers ? '...' : activeUsers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-md gap-2">
            <ShieldAlert className="w-4 h-4" />
            Pending Approval
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 animate-pulse bg-red-500">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invited" className="rounded-md gap-2">
            <Mail className="w-4 h-4" />
            Invited
            <Badge variant="secondary" className="ml-1 px-1.5 py-0">
              {loadingInvites ? '...' : filteredInvites.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Assigned Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Last Access</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                          <td className="px-4 py-3 text-right"><Skeleton className="h-5 w-8 ml-auto" /></td>
                        </tr>
                      ))
                  ) : activeUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        No active users found.
                      </td>
                    </tr>
                  ) : (
                    activeUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{u.full_name || 'No Name'}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`${getRoleBadgeColor(u.role)} uppercase text-[10px]`}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.is_active ? 'default' : 'secondary'} className={u.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-800'}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.last_sign_in ? format(new Date(u.last_sign_in), 'd MMM yyyy, h:mm a') : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  setSelectedRole(u.role);
                                  setRoleChangeDialogOpen(true);
                                }}
                                className="gap-2"
                              >
                                <Shield className="w-4 h-4" /> Change Role
                              </DropdownMenuItem>
                              {u.email !== currentUser.email && (
                                <DropdownMenuItem
                                  onClick={() => toggleStatusMutation.mutate({ userId: u.id, isActive: u.is_active })}
                                  className={`gap-2 ${u.is_active ? 'text-red-600' : 'text-emerald-600'}`}
                                >
                                  <Ban className="w-4 h-4" /> {u.is_active ? 'Suspend Account' : 'Reactivate Account'}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Requested Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Applied Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6">
                        <Skeleton className="h-8 w-full max-w-md mx-auto" />
                      </td>
                    </tr>
                  ) : pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-muted-foreground">
                        No pending approval requests.
                      </td>
                    </tr>
                  ) : (
                    pendingUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{u.full_name || 'Anonymous User'}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                          {u.status === 'rejected' && (
                            <div className="text-xs text-red-600 mt-1">
                              Rejected. Reason: {u.rejection_reason || 'No details.'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`${getRoleBadgeColor(u.role)} uppercase text-[10px]`}>
                            {u.role || 'viewer'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.created_at ? format(new Date(u.created_at), 'd MMM yyyy, h:mm a') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8 gap-1"
                              onClick={() => approveMutation.mutate(u.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-700 border-red-200 hover:bg-red-50 h-8 gap-1"
                              onClick={() => {
                                setSelectedUser(u);
                                setRejectDialogOpen(true);
                              }}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invited" className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Invited Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Assigned Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Invited By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Sent Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingInvites ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6">
                        <Skeleton className="h-8 w-full max-w-md mx-auto" />
                      </td>
                    </tr>
                  ) : filteredInvites.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        No invitations found.
                      </td>
                    </tr>
                  ) : (
                    filteredInvites.map((inv) => (
                      <tr key={inv.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold">{inv.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`${getRoleBadgeColor(inv.role)} uppercase text-[10px]`}>
                            {inv.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {inv.invited_by_name || inv.invited_by}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {inv.created_at ? format(new Date(inv.created_at), 'd MMM yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={inv.status === 'accepted' ? 'default' : 'secondary'}
                            className={inv.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}
                          >
                            {inv.status === 'accepted' ? 'Accepted' : 'Pending Join'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleInviteSubmit}>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Invite someone to join BeanLedger. They will receive an email with instructions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. name@beanledgerexport.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Application Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRejectSubmit}>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>
                Are you sure you want to reject the registration application for{' '}
                <strong className="text-foreground">{selectedUser?.email}</strong>?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rejection Reason</label>
              <Input
                placeholder="Reason details (e.g. Unconfirmed personnel)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>
                Reject Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRoleChangeSubmit}>
            <DialogHeader>
              <DialogTitle>Update User Role</DialogTitle>
              <DialogDescription>
                Change the system permissions for <strong className="text-foreground">{selectedUser?.full_name || selectedUser?.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRoleChangeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateRoleMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
