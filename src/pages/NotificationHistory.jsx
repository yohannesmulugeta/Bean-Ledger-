// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { notificationService } from '@/services/notificationService';
import { useUser } from '@/lib/useUser';

const SEVERITY_BADGE = {
  info: 'bg-green-100 text-green-700',
  warning: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function NotificationHistory() {
  const user = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications-history', user?.email],
    queryFn: () => notificationService.list({ recipientEmail: user?.email }),
    enabled: Boolean(user?.email),
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((item) => {
      if (statusFilter === 'unread' && item.is_read) return false;
      if (statusFilter === 'read' && !item.is_read) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (!query) return true;
      return `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(query);
    });
  }, [notifications, search, severityFilter, statusFilter]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const markRead = async (item) => {
    if (!item.is_read) {
      await notificationService.markRead(item.id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-history'] });
    }
    if (item.link_path) navigate(item.link_path);
  };

  const markAllRead = async () => {
    await notificationService.markAllRead({ recipientEmail: user?.email });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-history'] });
  };

  return (
    <div>
      <PageHeader title="Notification Center" description="Demo-only notification inbox backed by synthetic data">
        <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0} className="gap-1.5">
          <CheckCheck className="w-3.5 h-3.5" />
          Mark all read
        </Button>
      </PageHeader>

      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Demo notifications are local/Supabase demo records only. Telegram, email, and production delivery are not connected.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{notifications.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Unread</p>
          <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Visible</p>
          <p className="text-2xl font-bold text-primary">{filtered.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-muted/30 border border-border rounded-xl p-4 mb-5">
        <div className="flex-1 min-w-[220px] space-y-1">
          <Label className="text-xs font-medium">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, message, type..." />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Severity</Label>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-8" />
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No demo notifications found.
                </TableCell>
              </TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id} onClick={() => markRead(item)} className={`cursor-pointer hover:bg-primary/5 ${item.is_read ? 'bg-gray-50/70' : 'bg-white'}`}>
                <TableCell>{!item.is_read && <span className="block w-2 h-2 rounded-full mx-auto bg-primary" />}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{formatDate(item.created_at)}</TableCell>
                <TableCell className={`text-xs max-w-[220px] ${item.is_read ? 'text-muted-foreground' : 'font-semibold'}`}>{item.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[360px] truncate">{item.message}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${SEVERITY_BADGE[item.severity] || SEVERITY_BADGE.info}`}>
                    {item.severity || 'info'}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{item.is_read ? 'Read' : 'Unread'}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
