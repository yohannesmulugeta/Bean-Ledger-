// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportService, REPORT_QUERY_KEYS } from '@/services/reportService';
import { stockAdjustmentService } from '@/services/governanceService';
import { usePermission } from '@/lib/role-hooks';
import ReasonDialog from '@/components/shared/ReasonDialog';

const today = () => new Date().toISOString().slice(0, 10);
const initialForm = { adjustment_date: today(), target_type: 'supplier', direction: 'increase', kg: '', supplier_id: '', coffee_type: '', reason: '', notes: '' };
const fmt = (value) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });

export default function AdjustmentCenter() {
  const queryClient = useQueryClient();
  const { canPerform } = usePermission();
  const canWrite = canPerform('adjustment_center', 'can_create');
  const [form, setForm] = useState(initialForm);
  const [reversing, setReversing] = useState(null);
  const { data: adjustments = [], isLoading } = useQuery({ queryKey: ['stock-adjustments'], queryFn: () => stockAdjustmentService.list() });
  const { data: snapshot = {} } = useQuery({ queryKey: REPORT_QUERY_KEYS.snapshot, queryFn: () => reportService.snapshot() });
  const suppliers = snapshot.suppliers || [];
  const coffeeTypes = useMemo(() => Array.from(new Set([
    ...suppliers.map((row) => row.coffee_type),
    ...(snapshot.outputReports || []).map((row) => row.coffee_type),
  ].filter(Boolean))).sort(), [suppliers, snapshot.outputReports]);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] }),
    queryClient.invalidateQueries({ queryKey: REPORT_QUERY_KEYS.snapshot }),
  ]);

  const createMutation = useMutation({
    mutationFn: () => {
      const supplier = suppliers.find((row) => row.id === form.supplier_id);
      return stockAdjustmentService.create({
        adjustment_no: `BL-ADJ-${new Date().getFullYear()}-${String(adjustments.length + 1).padStart(3, '0')}`,
        adjustment_date: form.adjustment_date,
        target_type: form.target_type,
        supplier_id: supplier?.id,
        supplier_name: supplier?.supplier_name,
        coffee_type: form.target_type === 'supplier' ? supplier?.coffee_type : form.coffee_type,
        quantity_kg: Number(form.kg) * (form.direction === 'decrease' ? -1 : 1),
        reason: form.reason,
        notes: form.notes,
      });
    },
    onSuccess: async () => { await refresh(); setForm(initialForm); toast.success('Stock adjustment approved'); },
    onError: (error) => toast.error(error.message || 'Adjustment failed'),
  });

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }) => stockAdjustmentService.reverse(id, reason),
    onSuccess: async () => { await refresh(); setReversing(null); toast.success('Adjustment reversed'); },
    onError: (error) => toast.error(error.message || 'Reversal failed'),
  });

  return (
    <div>
      <PageHeader title="Inventory Adjustments" description="Approved inventory corrections and reversal history" />

      {canWrite && <form className="mb-6 border-y border-border bg-muted/20 py-5" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.adjustment_date} onChange={(e) => setForm({ ...form, adjustment_date: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Stock target</Label><Select value={form.target_type} onValueChange={(value) => setForm({ ...form, target_type: value, supplier_id: '', coffee_type: '' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="supplier">Supplier remaining</SelectItem><SelectItem value="Fresh">Fresh export stock</SelectItem><SelectItem value="Recleaned">Recleaned stock</SelectItem><SelectItem value="Reject">Reject stock</SelectItem></SelectContent></Select></div>
          {form.target_type === 'supplier' ? (
            <div className="space-y-1.5"><Label>Supplier</Label><Select value={form.supplier_id} onValueChange={(value) => setForm({ ...form, supplier_id: value })}><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent>{suppliers.filter((row) => !row.archived).map((row) => <SelectItem key={row.id} value={row.id}>{row.supplier_name}</SelectItem>)}</SelectContent></Select></div>
          ) : (
            <div className="space-y-1.5"><Label>Coffee type</Label><Select value={form.coffee_type} onValueChange={(value) => setForm({ ...form, coffee_type: value })}><SelectTrigger><SelectValue placeholder="Select coffee type" /></SelectTrigger><SelectContent>{coffeeTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div className="grid grid-cols-[1fr_1.2fr] gap-2"><div className="space-y-1.5"><Label>Direction</Label><Select value={form.direction} onValueChange={(value) => setForm({ ...form, direction: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="increase">Increase</SelectItem><SelectItem value="decrease">Decrease</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label>KG</Label><Input type="number" min="0.001" step="0.001" value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })} required /></div></div>
          <div className="space-y-1.5 xl:col-span-2"><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Scale reconciliation, physical count..." required /></div>
          <div className="space-y-1.5 xl:col-span-2"><Label>Notes</Label><Textarea rows={1} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex justify-end"><Button type="submit" disabled={createMutation.isPending} className="gap-2"><Plus className="h-4 w-4" />Approve adjustment</Button></div>
      </form>}

      <div className="overflow-hidden border border-border rounded-lg">
        <Table>
          <TableHeader><TableRow><TableHead>Adjustment</TableHead><TableHead>Date</TableHead><TableHead>Target</TableHead><TableHead className="text-right">KG</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {!isLoading && adjustments.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No adjustments recorded.</TableCell></TableRow>}
            {adjustments.map((row) => <TableRow key={row.id}><TableCell className="font-mono text-xs">{row.adjustment_no}</TableCell><TableCell>{row.adjustment_date}</TableCell><TableCell>{row.target_type === 'supplier' ? row.supplier_name : `${row.target_type} / ${row.coffee_type}`}</TableCell><TableCell className={`text-right font-semibold ${Number(row.quantity_kg) < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{Number(row.quantity_kg) > 0 ? '+' : ''}{fmt(row.quantity_kg)}</TableCell><TableCell>{row.reason}</TableCell><TableCell><span className={`text-xs font-semibold ${row.status === 'approved' ? 'text-emerald-700' : 'text-muted-foreground'}`}>{row.status}</span></TableCell><TableCell>{canWrite && row.status === 'approved' && <Button type="button" variant="ghost" size="icon" title="Reverse adjustment" aria-label={`Reverse ${row.adjustment_no}`} onClick={() => setReversing(row)} disabled={reverseMutation.isPending}><RotateCcw className="h-4 w-4" /></Button>}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>
      <ReasonDialog
        open={Boolean(reversing)}
        onOpenChange={(open) => { if (!open) setReversing(null); }}
        title="Reverse inventory adjustment"
        description={reversing ? `Provide a business reason for reversing ${reversing.adjustment_no}.` : ''}
        confirmLabel="Reverse adjustment"
        pending={reverseMutation.isPending}
        onConfirm={(reason) => reverseMutation.mutate({ id: reversing.id, reason })}
      />
    </div>
  );
}
