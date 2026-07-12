import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adjustmentService } from '@/services/adjustmentService';
import { format } from 'date-fns';
import { Plus, ArrowUpCircle, ArrowDownCircle, RotateCcw, Scale, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import { useRole } from '@/lib/role-hooks';

const fmt = (n) => (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

const AREAS = [
  { value: 'supplier_unprocessed', label: 'Supplier Unprocessed' },
  { value: 'processed_exportable', label: 'Processed-Exportable' },
  { value: 'export_materials', label: 'Export Materials' },
  { value: 'bag_ledger', label: 'Bag Ledger' },
];

const REASONS = [
  'Physical count correction',
  'Loss/damage',
  'Data entry correction',
  'Found stock',
  'Other',
];

const UNITS = ['kg', 'bags'];

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

function DirectionBadge({ direction }) {
  const isIncrease = direction === 'increase';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
      isIncrease
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : 'bg-red-100 text-red-700 border-red-200'
    }`}>
      {isIncrease ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
      {isIncrease ? 'Increase' : 'Decrease'}
    </span>
  );
}

function ReversedBadge({ reversed }) {
  if (!reversed) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-orange-100 text-orange-700 border-orange-200">
      <RotateCcw className="w-3 h-3" />
      Reversed
    </span>
  );
}

const INITIAL_FORM = {
  adjustment_area: '',
  direction: 'increase',
  quantity: '',
  unit: 'kg',
  reason: '',
  note: '',
};

export default function AdjustmentCenter() {
  const { role, isAdmin, isSupervisor, isAdminOrSupervisor, user } = useRole();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentBalance, setCurrentBalance] = useState(null);

  const canAccess = ['admin', 'supervisor'].includes(role);

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['stockAdjustments'],
    queryFn: () => adjustmentService.list(),
    staleTime: 60000,
  });

  // Fetch current balance when area changes
  useEffect(() => {
    if (form.adjustment_area) {
      adjustmentService.getCurrentBalance(form.adjustment_area).then(setCurrentBalance);
    } else {
      setCurrentBalance(null);
    }
  }, [form.adjustment_area, adjustments]);

  const createMutation = useMutation({
    mutationFn: (data) => adjustmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockAdjustments'] });
      setDialogOpen(false);
      setForm(INITIAL_FORM);
    },
  });

  const reverseMutation = useMutation({
    mutationFn: (id) => adjustmentService.reverse(id, user?.full_name || 'Demo Admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockAdjustments'] });
    },
  });

  const kpis = useMemo(() => {
    const total = adjustments.length;
    const netIncrease = adjustments
      .filter((a) => a.direction === 'increase' && !a.reversed)
      .reduce((s, a) => s + Number(a.quantity || 0), 0);
    const netDecrease = adjustments
      .filter((a) => a.direction === 'decrease' && !a.reversed)
      .reduce((s, a) => s + Number(a.quantity || 0), 0);
    const reversedCount = adjustments.filter((a) => a.reversed).length;
    return { total, netIncrease, netDecrease, reversedCount };
  }, [adjustments]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.adjustment_area || !form.quantity || !form.reason) return;
    if (form.reason === 'Other' && !form.note.trim()) return;

    const qty = Number(form.quantity);
    const balanceBefore = currentBalance ?? 0;
    const balanceAfter = form.direction === 'increase' ? balanceBefore + qty : balanceBefore - qty;

    createMutation.mutate({
      ...form,
      quantity: qty,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      created_by: user?.full_name || 'Demo Admin',
      adjustment_date: new Date().toISOString().slice(0, 10),
    });
  };

  const areaLabel = (key) => AREAS.find((a) => a.value === key)?.label || key;

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          The Adjustment Center is only available to Admin and Supervisor roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Adjustment Center" description="Manual stock corrections with full audit trail">
        <Button onClick={() => { setForm(INITIAL_FORM); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Adjustment
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          <>
            <KpiCard label="Total Adjustments" value={fmtInt(kpis.total)} sub="all records"
              icon={Scale} iconColor="bg-blue-50 text-blue-600" />
            <KpiCard label="Net Increase" value={`${fmtInt(kpis.netIncrease)} kg`}
              icon={ArrowUpCircle} iconColor="bg-emerald-50 text-emerald-600" color="text-emerald-700" />
            <KpiCard label="Net Decrease" value={`${fmtInt(kpis.netDecrease)} kg`}
              icon={ArrowDownCircle} iconColor="bg-red-50 text-red-500" color="text-red-600" />
            <KpiCard label="Reversed" value={fmtInt(kpis.reversedCount)} sub="reversed adjustments"
              icon={RotateCcw} iconColor="bg-orange-50 text-orange-600" color="text-orange-600" />
          </>
        )}
      </div>

      {/* Adjustment History Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Date', 'Area', 'Direction', 'Quantity', 'Unit', 'Reason', 'Created By', 'Balance Change', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array(10).fill(0).map((__, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>)}
                  </tr>
                ))
              ) : adjustments.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">
                  No adjustments recorded yet. Click "New Adjustment" to create one.
                </td></tr>
              ) : adjustments.map((a, idx) => (
                <tr
                  key={a.id}
                  className={`border-b border-border hover:bg-muted/30 ${idx % 2 !== 0 ? 'bg-muted/10' : ''} ${a.reversed ? 'opacity-60' : ''}`}
                >
                  <td className={`px-4 py-3 text-xs whitespace-nowrap ${a.reversed ? 'line-through' : ''}`}>
                    {a.adjustment_date ? format(new Date(a.adjustment_date), 'd MMM yyyy') : '—'}
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium whitespace-nowrap ${a.reversed ? 'line-through' : ''}`}>
                    {areaLabel(a.adjustment_area)}
                  </td>
                  <td className="px-4 py-3"><DirectionBadge direction={a.direction} /></td>
                  <td className={`px-4 py-3 text-xs text-right font-semibold ${a.reversed ? 'line-through' : ''}`}>
                    {fmtInt(a.quantity)}
                  </td>
                  <td className={`px-4 py-3 text-xs ${a.reversed ? 'line-through' : ''}`}>{a.unit || 'kg'}</td>
                  <td className={`px-4 py-3 text-xs text-muted-foreground ${a.reversed ? 'line-through' : ''}`}>
                    {a.reason || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{a.created_by || '—'}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap font-mono">
                    <span className="text-muted-foreground">{fmtInt(a.balance_before)}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="font-semibold">{fmtInt(a.balance_after)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ReversedBadge reversed={a.reversed} />
                    {a.reversal_of_adjustment_id && !a.reversed && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-100 text-blue-700 border-blue-200">
                        Reversal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!a.reversed && !a.reversal_of_adjustment_id && isAdminOrSupervisor && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={() => reverseMutation.mutate(a.id)}
                        disabled={reverseMutation.isPending}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reverse
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Adjustment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Stock Adjustment</DialogTitle>
            <DialogDescription>Record a manual stock correction with audit trail.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Adjustment Area */}
            <div className="space-y-1.5">
              <Label htmlFor="adj-area">Adjustment Area</Label>
              <Select value={form.adjustment_area} onValueChange={(v) => setForm((f) => ({ ...f, adjustment_area: v }))}>
                <SelectTrigger id="adj-area">
                  <SelectValue placeholder="Select area…" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Direction Toggle */}
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, direction: 'increase' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                    form.direction === 'increase'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-border bg-background text-muted-foreground hover:border-emerald-300'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" /> Increase
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, direction: 'decrease' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                    form.direction === 'decrease'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-border bg-background text-muted-foreground hover:border-red-300'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" /> Decrease
                </button>
              </div>
            </div>

            {/* Quantity + Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="adj-qty">Quantity</Label>
                <Input
                  id="adj-qty"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adj-unit">Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger id="adj-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="adj-reason">Reason</Label>
              <Select value={form.reason} onValueChange={(v) => setForm((f) => ({ ...f, reason: v }))}>
                <SelectTrigger id="adj-reason">
                  <SelectValue placeholder="Select reason…" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note (required if reason is Other) */}
            <div className="space-y-1.5">
              <Label htmlFor="adj-note">
                Note {form.reason === 'Other' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="adj-note"
                placeholder="Additional details…"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                required={form.reason === 'Other'}
                rows={3}
              />
            </div>

            {/* Current Balance Display */}
            {form.adjustment_area && currentBalance !== null && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3">
                <Scale className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="text-lg font-bold text-foreground">{fmtInt(currentBalance)} kg</p>
                </div>
                {form.quantity && (
                  <div className="ml-auto text-right">
                    <p className="text-xs text-muted-foreground">After Adjustment</p>
                    <p className={`text-lg font-bold ${form.direction === 'increase' ? 'text-emerald-700' : 'text-red-600'}`}>
                      {fmtInt(form.direction === 'increase' ? currentBalance + Number(form.quantity) : currentBalance - Number(form.quantity))} kg
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !form.adjustment_area || !form.quantity || !form.reason || (form.reason === 'Other' && !form.note.trim())}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Adjustment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
