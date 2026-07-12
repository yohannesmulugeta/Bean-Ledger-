import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { processingService } from '@/services/processingService';
import { format } from 'date-fns';
import { Plus, Search, Layers, Scale, BarChart3, Package } from 'lucide-react';
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

function TypeBadge({ type }) {
  const styles = {
    'Standard': 'bg-blue-100 text-blue-700 border-blue-200',
    'Recleaning': 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[type] || 'bg-muted text-muted-foreground border-border'}`}>
      {type || 'Standard'}
    </span>
  );
}

export default function Processing() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['processingLogs'],
    queryFn: () => processingService.list(),
    staleTime: 60000,
  });

  const active = useMemo(() => logs.filter(l => !l.archived), [logs]);

  const kpis = useMemo(() => {
    const totalActualKg = active.reduce((s, l) => s + (l.actual_weighed_kg || 0), 0);
    const avgBatch = active.length > 0 ? totalActualKg / active.length : 0;
    const totalBagsSent = active.reduce((s, l) => s + (l.bags_sent || 0), 0);
    return { count: active.length, totalActualKg, avgBatch, totalBagsSent };
  }, [active]);

  const filtered = useMemo(() => {
    if (!search.trim()) return active;
    const q = search.toLowerCase();
    return active.filter(l =>
      (l.supplier_name || '').toLowerCase().includes(q) ||
      (l.coffee_type || '').toLowerCase().includes(q) ||
      (l.coffee_code || '').toLowerCase().includes(q) ||
      (l.batch_no || '').toLowerCase().includes(q)
    );
  }, [active, search]);

  return (
    <div className="space-y-6">
      <PageHeader title="Processing" description="Overview of all processing logs and batch records">
        <Button onClick={() => navigate('/processing-log')}>
          <Plus className="h-4 w-4 mr-2" /> New Processing Log
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          <>
            <KpiCard label="Total Batches" value={fmtInt(kpis.count)} sub="active records"
              icon={Layers} iconColor="bg-blue-50 text-blue-600" />
            <KpiCard label="Total KG Processed" value={`${fmtInt(kpis.totalActualKg)} kg`}
              icon={Scale} iconColor="bg-emerald-50 text-emerald-600" />
            <KpiCard label="Avg Batch Size" value={`${fmt(kpis.avgBatch)} kg`}
              icon={BarChart3} iconColor="bg-amber-50 text-amber-600" />
            <KpiCard label="Total Bags Sent" value={fmtInt(kpis.totalBagsSent)} sub="bags"
              icon={Package} iconColor="bg-purple-50 text-purple-600" />
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search supplier, coffee type, batch…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Date', 'Supplier', 'Coffee Type', 'Type', 'Bags Sent', 'KG Sent', 'Actual KG', 'Variance KG', 'Batch No'].map(h => (
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
                  {search ? 'No processing logs match your search.' : 'No processing logs recorded yet.'}
                </td></tr>
              ) : filtered.map((l, idx) => {
                const variance = l.batch_variance_kg || 0;
                const procDate = l.date || l.processing_date;
                return (
                  <tr
                    key={l.id}
                    className={`border-b border-border hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{procDate ? format(new Date(procDate), 'd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{l.supplier_name || '—'}</td>
                    <td className="px-4 py-3 text-xs">{l.coffee_type || '—'}</td>
                    <td className="px-4 py-3"><TypeBadge type={l.entry_type} /></td>
                    <td className="px-4 py-3 text-right text-xs">{fmtInt(l.bags_sent)}</td>
                    <td className="px-4 py-3 text-right text-xs">{fmt(l.kg_sent)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-xs">{fmt(l.actual_weighed_kg)}</td>
                    <td className={`px-4 py-3 text-right font-bold text-xs ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                      {fmt(variance)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{l.batch_no || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            {!isLoading && filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: '#1F2A24', color: '#fff' }}>
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold">TOTALS ({filtered.length} records)</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmtInt(filtered.reduce((s, l) => s + (l.bags_sent || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmt(filtered.reduce((s, l) => s + (l.kg_sent || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmt(filtered.reduce((s, l) => s + (l.actual_weighed_kg || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-amber-300">{fmt(filtered.reduce((s, l) => s + (l.batch_variance_kg || 0), 0))}</td>
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
