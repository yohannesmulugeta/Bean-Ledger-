import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { purchaseService } from '@/services/purchaseService';
import { format } from 'date-fns';
import { Plus, Search, TrendingUp, Scale, Banknote, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
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

function PaymentBadge({ status }) {
  const styles = {
    'Paid': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Partial': 'bg-amber-100 text-amber-700 border-amber-200',
    'Unpaid': 'bg-red-100 text-red-700 border-red-200',
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
      <span className="font-semibold text-emerald-700 flex-shrink-0">{fmt(payment.amount_etb)} ETB</span>
      <span className="text-muted-foreground flex-shrink-0">{payment.bank_name || ''}</span>
      <span className="font-mono text-muted-foreground text-[10px] flex-shrink-0">{payment.cpv_reference || ''}</span>
    </div>
  );
}

export default function Purchases() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchaseService.list(),
    staleTime: 60000,
  });

  const active = useMemo(() => purchases.filter(p => !p.archived), [purchases]);

  const kpis = useMemo(() => {
    const totalKg = active.reduce((s, p) => s + (p.net_dispatch_weight_kg || 0), 0);
    const totalValue = active.reduce((s, p) => s + (p.grand_total_etb || 0), 0);
    const totalPaid = active.reduce((s, p) => s + (p.total_paid_etb || 0), 0);
    const totalBalance = active.reduce((s, p) => s + (p.balance_etb || 0), 0);
    return { count: active.length, totalKg, totalValue, totalPaid, totalBalance };
  }, [active]);

  const filtered = useMemo(() => {
    if (!search.trim()) return active;
    const q = search.toLowerCase();
    return active.filter(p =>
      (p.supplier_name || '').toLowerCase().includes(q) ||
      (p.coffee_code || '').toLowerCase().includes(q) ||
      (p.region || '').toLowerCase().includes(q)
    );
  }, [active, search]);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="space-y-6">
      <PageHeader title="Purchases" description="Overview of all coffee purchase records">
        <Button onClick={() => navigate('/purchase-registration')}>
          <Plus className="h-4 w-4 mr-2" /> New Purchase
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          <>
            <KpiCard label="Total Purchases" value={fmtInt(kpis.count)} sub="active records"
              icon={TrendingUp} iconColor="bg-blue-50 text-blue-600" />
            <KpiCard label="Total KG Dispatched" value={`${fmtInt(kpis.totalKg)} kg`}
              icon={Scale} iconColor="bg-emerald-50 text-emerald-600" />
            <KpiCard label="Total Value" value={`${fmt(kpis.totalValue)} ETB`}
              icon={Banknote} iconColor="bg-amber-50 text-amber-600" color="text-amber-700" />
            <KpiCard label="Balance Owed" value={`${fmt(kpis.totalBalance)} ETB`}
              icon={AlertCircle} iconColor="bg-red-50 text-red-500" color="text-red-600" />
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search supplier, coffee code, region…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['', 'Coffee Code', 'Supplier', 'Region', 'Date', 'KG', 'Unit Price', 'Grand Total ETB', 'Paid ETB', 'Balance ETB', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array(11).fill(0).map((__, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-muted-foreground">
                  {search ? 'No purchases match your search.' : 'No purchases recorded yet.'}
                </td></tr>
              ) : filtered.map((p, idx) => {
                const payments = (() => { try { return JSON.parse(p.payment_history || '[]'); } catch { return []; } })();
                const isExpanded = expandedId === p.id;
                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={`border-b border-border hover:bg-muted/30 cursor-pointer ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                      onClick={() => toggleExpand(p.id)}
                    >
                      <td className="px-3 py-3 text-muted-foreground">
                        {payments.length > 0
                          ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
                          : <span className="w-4 inline-block" />}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1F2A24] whitespace-nowrap">{p.coffee_code || '—'}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{p.supplier_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.region || '—'}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{p.purchase_date ? format(new Date(p.purchase_date), 'd MMM yyyy') : '—'}</td>
                      <td className="px-4 py-3 text-right text-xs">{fmtInt(p.net_dispatch_weight_kg)}</td>
                      <td className="px-4 py-3 text-right text-xs">{fmt(p.unit_price_etb_per_feresula)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-xs">{fmt(p.grand_total_etb)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-semibold text-xs">{fmt(p.total_paid_etb)}</td>
                      <td className={`px-4 py-3 text-right font-bold text-xs ${(p.balance_etb || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {fmt(p.balance_etb)}
                      </td>
                      <td className="px-4 py-3"><PaymentBadge status={p.payment_status} /></td>
                    </tr>
                    {isExpanded && payments.length > 0 && (
                      <tr className="border-b border-border bg-muted/20">
                        <td colSpan={11} className="px-8 py-3">
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
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold">TOTALS ({filtered.length} records)</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmtInt(filtered.reduce((s, p) => s + (p.net_dispatch_weight_kg || 0), 0))}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-xs font-bold">{fmt(filtered.reduce((s, p) => s + (p.grand_total_etb || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-emerald-300">{fmt(filtered.reduce((s, p) => s + (p.total_paid_etb || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-red-300">{fmt(filtered.reduce((s, p) => s + (p.balance_etb || 0), 0))}</td>
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
