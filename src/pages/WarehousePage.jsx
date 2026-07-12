import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { warehouseService } from '@/services/warehouseService';
import { format } from 'date-fns';
import { Plus, Search, Warehouse, Scale, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (n) => (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

function KpiCard({ label, value, sub, color = 'text-foreground', icon: Icon, iconColor }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      {Icon && (
        <div className={`mt-0.5 p-2 rounded-lg ${iconColor || 'bg-muted'}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function WarehousePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['warehouseReceipts'],
    queryFn: () => warehouseService.listReceipts(),
    staleTime: 60000,
  });

  const active = useMemo(() => receipts.filter(r => !r.archived), [receipts]);

  const kpis = useMemo(() => {
    const totalReceivedKg = active.reduce((s, r) => s + (r.warehouse_received_net_kg || r.received_kg || 0), 0);
    const totalShortageKg = active.reduce((s, r) => s + (r.shortage_kg || 0), 0);
    const pendingCount = active.filter(r => r.status === 'pending' || r.status === 'received').length;
    return { count: active.length, totalReceivedKg, totalShortageKg, pendingCount };
  }, [active]);

  const filtered = useMemo(() => {
    if (!search.trim()) return active;
    const q = search.toLowerCase();
    return active.filter(r =>
      (r.supplier_name || '').toLowerCase().includes(q) ||
      (r.coffee_code || '').toLowerCase().includes(q) ||
      (r.grn_code || r.receipt_number || '').toLowerCase().includes(q)
    );
  }, [active, search]);

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouse" description="Overview of all warehouse receipts and incoming stock">
        <Button onClick={() => navigate('/warehouse-receipt')}>
          <Plus className="h-4 w-4 mr-2" /> Record Receipt
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          <>
            <KpiCard label="Total Receipts" value={fmtInt(kpis.count)} sub="active records"
              icon={Warehouse} iconColor="bg-blue-50 text-blue-600" />
            <KpiCard label="Total Received KG" value={`${fmtInt(kpis.totalReceivedKg)} kg`}
              icon={Scale} iconColor="bg-emerald-50 text-emerald-600" />
            <KpiCard label="Total Shortage KG" value={`${fmt(kpis.totalShortageKg)} kg`}
              icon={AlertTriangle} iconColor={kpis.totalShortageKg < 0 ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}
              color={kpis.totalShortageKg < 0 ? 'text-red-600' : 'text-foreground'} />
            <KpiCard label="Pending Processing" value={fmtInt(kpis.pendingCount)} sub="awaiting next step"
              icon={Clock} iconColor="bg-purple-50 text-purple-600" />
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search supplier, coffee code, GRN…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Coffee Code', 'Supplier', 'GRN Code', 'Received Date', 'Dispatch KG', 'Received KG', 'Shortage KG', 'Bags', 'Remark'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array(9).fill(0).map((__, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">
                  {search ? 'No receipts match your search.' : 'No warehouse receipts recorded yet.'}
                </td></tr>
              ) : filtered.map((r, idx) => {
                const shortage = r.shortage_kg || 0;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-border hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1F2A24] whitespace-nowrap">{r.coffee_code || '—'}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.supplier_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.grn_code || r.receipt_number || '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{r.received_date ? format(new Date(r.received_date), 'd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-right text-xs">{fmtInt(r.net_dispatch_weight_kg || r.dispatch_kg)}</td>
                    <td className="px-4 py-3 text-right text-xs">{fmtInt(r.warehouse_received_net_kg || r.received_kg)}</td>
                    <td className={`px-4 py-3 text-right font-bold text-xs ${shortage < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {fmt(shortage)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">{fmtInt(r.bags_received)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{r.remark || r.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            {!isLoading && filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: '#1F2A24', color: '#fff' }}>
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold">TOTALS ({filtered.length} records)</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmtInt(filtered.reduce((s, r) => s + (r.net_dispatch_weight_kg || r.dispatch_kg || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmtInt(filtered.reduce((s, r) => s + (r.warehouse_received_net_kg || r.received_kg || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-red-300">{fmt(filtered.reduce((s, r) => s + (r.shortage_kg || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmtInt(filtered.reduce((s, r) => s + (r.bags_received || 0), 0))}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
