import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { exportService } from '@/services/exportService';
import { format } from 'date-fns';
import { Plus, Search, FileText, Scale, DollarSign, Landmark, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (n) => (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

function KpiCard({ label, value, sub = null, color = 'text-foreground', icon: Icon, iconColor }) {
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

function PaymentStatusBadge({ status }) {
  const styles = {
    'Fully Received': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Partial': 'bg-amber-100 text-amber-700 border-amber-200',
    'Unpaid': 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {status || 'Unknown'}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Pending': 'bg-gray-100 text-gray-700 border-gray-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'Shipped': 'bg-purple-100 text-purple-700 border-purple-200',
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {status || 'Unknown'}
    </span>
  );
}

function PaymentHistoryRow({ payment, idx }) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-xs border-b border-border last:border-0">
      <span className="text-muted-foreground w-5 text-right flex-shrink-0">#{idx + 1}</span>
      <span className="text-muted-foreground flex-shrink-0">{payment.payment_date ? format(new Date(payment.payment_date), 'd MMM yyyy') : '—'}</span>
      <span className="font-semibold text-blue-700 flex-shrink-0">{fmt(payment.amount_usd || 0)} USD</span>
      <span className="font-semibold text-emerald-700 flex-shrink-0">{fmt(payment.amount_etb || 0)} ETB</span>
      <span className="text-muted-foreground flex-shrink-0">{payment.bank_name || ''}</span>
      <span className="font-mono text-muted-foreground text-[10px] flex-shrink-0">{payment.reference_no || ''}</span>
    </div>
  );
}

export default function Exports() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['exportContracts'],
    queryFn: () => exportService.list(),
    staleTime: 60000,
  });

  const active = useMemo(() => contracts.filter(c => !c.archived), [contracts]);

  const kpis = useMemo(() => {
    const totalExportKg = active.reduce((s, c) => s + (c.export_kg || 0), 0);
    const totalUsd = active.reduce((s, c) => s + (c.total_export_value_usd || 0), 0);
    const totalEtb = active.reduce((s, c) => s + (c.total_export_value_etb || 0), 0);
    return { count: active.length, totalExportKg, totalUsd, totalEtb };
  }, [active]);

  const filtered = useMemo(() => {
    if (!search.trim()) return active;
    const q = search.toLowerCase();
    return active.filter(c =>
      (c.contract_no || '').toLowerCase().includes(q) ||
      (c.buyer_name || '').toLowerCase().includes(q) ||
      (c.destination_country || '').toLowerCase().includes(q) ||
      (c.coffee_type || '').toLowerCase().includes(q)
    );
  }, [active, search]);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="space-y-6">
      <PageHeader title="Exports" description="Overview of all export contracts and shipments">
        <Button onClick={() => navigate('/export-contracts')}>
          <Plus className="h-4 w-4 mr-2" /> New Export Contract
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          <>
            <KpiCard label="Active Contracts" value={fmtInt(kpis.count)} sub="active records"
              icon={FileText} iconColor="bg-blue-50 text-blue-600" />
            <KpiCard label="Total Export KG" value={`${fmtInt(kpis.totalExportKg)} kg`}
              icon={Scale} iconColor="bg-emerald-50 text-emerald-600" />
            <KpiCard label="Total USD Value" value={`$${fmt(kpis.totalUsd)}`}
              icon={DollarSign} iconColor="bg-amber-50 text-amber-600" color="text-amber-700" />
            <KpiCard label="Total ETB Value" value={`${fmt(kpis.totalEtb)} ETB`}
              icon={Landmark} iconColor="bg-purple-50 text-purple-600" color="text-purple-700" />
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search contract, buyer, destination, coffee type…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['', 'Contract No', 'Date', 'Buyer', 'Destination', 'Coffee Type', 'Grade', 'KG', 'USD Value', 'ETB Value', 'Payment', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array(12).fill(0).map((__, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-muted-foreground">
                  {search ? 'No export contracts match your search.' : 'No export contracts recorded yet.'}
                </td></tr>
              ) : filtered.map((c, idx) => {
                const payments = (() => { try { return JSON.parse(c.payment_history || '[]'); } catch { return []; } })();
                const isExpanded = expandedId === c.id;
                const contractDate = c.contract_date || c.export_date;
                return (
                  <React.Fragment key={c.id}>
                    <tr
                      className={`border-b border-border hover:bg-muted/30 cursor-pointer ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                      onClick={() => toggleExpand(c.id)}
                    >
                      <td className="px-3 py-3 text-muted-foreground">
                        {payments.length > 0
                          ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
                          : <span className="w-4 inline-block" />}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1F2A24] whitespace-nowrap">{c.contract_no || '—'}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{contractDate ? format(new Date(contractDate), 'd MMM yyyy') : '—'}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{c.buyer_name || '—'}</td>
                      <td className="px-4 py-3 text-xs">{c.destination_country || '—'}</td>
                      <td className="px-4 py-3 text-xs">{c.coffee_type || '—'}</td>
                      <td className="px-4 py-3 text-xs">{c.coffee_grade || '—'}</td>
                      <td className="px-4 py-3 text-right text-xs">{fmtInt(c.export_kg)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-xs">${fmt(c.total_export_value_usd)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-xs">{fmt(c.total_export_value_etb)}</td>
                      <td className="px-4 py-3"><PaymentStatusBadge status={c.payment_status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    </tr>
                    {isExpanded && payments.length > 0 && (
                      <tr className="border-b border-border bg-muted/20">
                        <td colSpan={12} className="px-8 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Payment History</p>
                          {payments.map((pay, i) => <PaymentHistoryRow key={i} payment={pay} idx={i} />)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            {!isLoading && filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: '#1F2A24', color: '#fff' }}>
                  <td colSpan={7} className="px-4 py-3 text-xs font-bold">TOTALS ({filtered.length} records)</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmtInt(filtered.reduce((s, c) => s + (c.export_kg || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">${fmt(filtered.reduce((s, c) => s + (c.total_export_value_usd || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmt(filtered.reduce((s, c) => s + (c.total_export_value_etb || 0), 0))}</td>
                  <td className="px-4 py-3" />
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
