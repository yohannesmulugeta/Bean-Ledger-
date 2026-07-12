import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { purchaseService } from '@/services/purchaseService';
import { supplierService } from '@/services/supplierService';
import { format } from 'date-fns';
import { Users, Banknote, FileText, ChevronDown, ChevronRight, Printer, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import { useRole } from '@/lib/role-hooks';

const fmt = (n) => (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

function parsePayments(paymentHistory) {
  if (Array.isArray(paymentHistory)) return paymentHistory;
  if (!paymentHistory) return [];
  try {
    const parsed = JSON.parse(paymentHistory);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

function PaymentRow({ payment, idx }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 text-xs border-b border-border last:border-0">
      <span className="text-muted-foreground w-5 text-right flex-shrink-0">#{idx + 1}</span>
      <span className="text-muted-foreground flex-shrink-0">
        {payment.payment_date ? format(new Date(payment.payment_date), 'd MMM yyyy') : '—'}
      </span>
      <span className="font-semibold text-emerald-700 flex-shrink-0">{fmt(payment.amount_etb)} ETB</span>
      <span className="text-muted-foreground flex-shrink-0">{payment.bank_name || ''}</span>
      {payment.branch_account && (
        <span className="text-muted-foreground text-[10px] flex-shrink-0">{payment.branch_account}</span>
      )}
      <span className="font-mono text-muted-foreground text-[10px] flex-shrink-0">{payment.cpv_reference || ''}</span>
    </div>
  );
}

export default function SupplierRemainingExplanation() {
  const { role } = useRole();
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const canAccess = ['admin', 'supervisor', 'purchaser', 'accountant'].includes(role);

  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchaseService.list(),
    staleTime: 60000,
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.list(),
    staleTime: 60000,
  });

  // Build supplier list from both sources (purchases + supplier records)
  const supplierNames = useMemo(() => {
    const fromPurchases = purchases.map((p) => p.supplier_name).filter(Boolean);
    const fromSuppliers = suppliers.map((s) => s.supplier_name).filter(Boolean);
    return [...new Set([...fromSuppliers, ...fromPurchases])].sort();
  }, [purchases, suppliers]);

  // Filter active purchases for selected supplier
  const supplierPurchases = useMemo(() => {
    if (!selectedSupplier) return [];
    return purchases
      .filter((p) => p.supplier_name === selectedSupplier && !p.archived)
      .sort((a, b) => String(b.purchase_date).localeCompare(String(a.purchase_date)));
  }, [purchases, selectedSupplier]);

  // Summary KPIs
  const summary = useMemo(() => {
    const count = supplierPurchases.length;
    const totalValue = supplierPurchases.reduce((s, p) => s + (p.grand_total_etb || 0), 0);
    const totalPaid = supplierPurchases.reduce((s, p) => s + (p.total_paid_etb || 0), 0);
    const balance = supplierPurchases.reduce((s, p) => s + (p.balance_etb || 0), 0);
    return { count, totalValue, totalPaid, balance };
  }, [supplierPurchases]);

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const handlePrint = () => {
    window.print();
  };

  const isLoading = loadingPurchases || loadingSuppliers;

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Supplier Balance Explanation is available to Admin, Supervisor, Purchaser, and Accountant roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Supplier Balance Explanation" description="Per-supplier breakdown of amounts owed vs paid">
        {selectedSupplier && (
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print Statement
          </Button>
        )}
      </PageHeader>

      {/* Supplier Selector */}
      <div className="max-w-sm">
        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger>
            <SelectValue placeholder="Select a supplier…" />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="__loading" disabled>Loading suppliers…</SelectItem>
            ) : supplierNames.length === 0 ? (
              <SelectItem value="__empty" disabled>No suppliers found</SelectItem>
            ) : (
              supplierNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {!selectedSupplier ? (
        /* Prompt to select */
        <div className="rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-1">Select a Supplier</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Choose a supplier from the dropdown above to view their purchase balance breakdown and payment history.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
            ) : (
              <>
                <KpiCard label="Total Purchases" value={fmtInt(summary.count)} sub="purchase records"
                  icon={FileText} iconColor="bg-blue-50 text-blue-600" />
                <KpiCard label="Total Value" value={`${fmt(summary.totalValue)} ETB`}
                  icon={Banknote} iconColor="bg-amber-50 text-amber-600" color="text-amber-700" />
                <KpiCard label="Total Paid" value={`${fmt(summary.totalPaid)} ETB`}
                  icon={Banknote} iconColor="bg-emerald-50 text-emerald-600" color="text-emerald-700" />
                <KpiCard label="Balance Owed" value={`${fmt(summary.balance)} ETB`}
                  icon={AlertTriangle} iconColor="bg-red-50 text-red-500"
                  color={summary.balance > 0 ? 'text-red-600' : 'text-emerald-700'} />
              </>
            )}
          </div>

          {/* Per-purchase Breakdown Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['', 'Coffee Code', 'Purchase Date', 'Grand Total ETB', 'Paid Amount ETB', 'Balance ETB', 'Last Payment Date'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array(7).fill(0).map((__, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>)}
                      </tr>
                    ))
                  ) : supplierPurchases.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                      No purchases found for this supplier.
                    </td></tr>
                  ) : supplierPurchases.map((p, idx) => {
                    const payments = parsePayments(p.payment_history);
                    const lastPayment = payments.length > 0
                      ? payments.reduce((latest, pay) => {
                          if (!pay.payment_date) return latest;
                          return !latest || pay.payment_date > latest ? pay.payment_date : latest;
                        }, null)
                      : null;
                    const isExpanded = expandedId === p.id;

                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          className={`border-b border-border hover:bg-muted/30 cursor-pointer ${idx % 2 !== 0 ? 'bg-muted/10' : ''}`}
                          onClick={() => toggleExpand(p.id)}
                        >
                          <td className="px-3 py-3 text-muted-foreground">
                            {payments.length > 0
                              ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
                              : <span className="w-4 inline-block" />}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1F2A24] whitespace-nowrap">{p.coffee_code || '—'}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {p.purchase_date ? format(new Date(p.purchase_date), 'd MMM yyyy') : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-xs">{fmt(p.grand_total_etb)}</td>
                          <td className="px-4 py-3 text-right text-emerald-700 font-semibold text-xs">{fmt(p.total_paid_etb)}</td>
                          <td className={`px-4 py-3 text-right font-bold text-xs ${(p.balance_etb || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            {fmt(p.balance_etb)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {lastPayment ? format(new Date(lastPayment), 'd MMM yyyy') : '—'}
                          </td>
                        </tr>
                        {isExpanded && payments.length > 0 && (
                          <tr className="border-b border-border bg-muted/20">
                            <td colSpan={7} className="px-8 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Payment History</p>
                              {payments.map((pay, i) => (
                                <PaymentRow key={i} payment={pay} idx={i} />
                              ))}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {!isLoading && supplierPurchases.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#1F2A24', color: '#fff' }}>
                      <td colSpan={3} className="px-4 py-3 text-xs font-bold">
                        TOTALS ({supplierPurchases.length} purchases)
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold">
                        {fmt(supplierPurchases.reduce((s, p) => s + (p.grand_total_etb || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-emerald-300">
                        {fmt(supplierPurchases.reduce((s, p) => s + (p.total_paid_etb || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-red-300">
                        {fmt(supplierPurchases.reduce((s, p) => s + (p.balance_etb || 0), 0))}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
