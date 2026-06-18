// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArchiveRestore, Clock, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import RoleGuard from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import NumberInput from '@/components/shared/NumberInput';
import TablePagination from '@/components/shared/TablePagination';
import RichArchiveDialog from '@/components/shared/RichArchiveDialog';
import { warehouseService } from '@/services/warehouseService';
import { calculateShortageKg } from '@/lib/warehouseCalculations';

function fmt(n, decimals = 2) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ReceiptDialog({ open, onOpenChange, initialData, purchases, onSubmit, isSubmitting }) {
  const [form, setForm] = useState({
    purchase_record_id: '',
    receipt_number: '',
    received_date: todayStr(),
    received_kg: '',
    warehouse_name: 'Demo Warehouse',
    notes: '',
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      purchase_record_id: initialData?.purchase_record_id || '',
      receipt_number: initialData?.receipt_number || '',
      received_date: initialData?.received_date || todayStr(),
      received_kg: initialData?.received_kg ?? '',
      warehouse_name: initialData?.warehouse_name || 'Demo Warehouse',
      notes: initialData?.notes || '',
    });
  }, [open, initialData]);

  const selectedPurchase = purchases.find((purchase) => purchase.id === form.purchase_record_id);
  const receivedKg = form.received_kg === '' ? null : Number(form.received_kg);
  const shortageKg = selectedPurchase && receivedKg != null
    ? (() => {
        try { return calculateShortageKg(selectedPurchase.net_dispatch_weight_kg, receivedKg); }
        catch { return null; }
      })()
    : null;
  const projectedCommission = selectedPurchase && receivedKg != null
    ? (receivedKg / 17) * Number(selectedPurchase.unit_price_etb_per_feresula || 0) * (Number(selectedPurchase.commission_percent || 0) / 100)
    : null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      supplier_id: selectedPurchase?.supplier_id,
      received_kg: Number(form.received_kg),
      is_demo: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{initialData ? 'Edit Receipt' : 'New Warehouse Receipt'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Coffee Code (from Purchases) *</Label>
            <Select value={form.purchase_record_id} onValueChange={(value) => setForm((prev) => ({ ...prev, purchase_record_id: value }))} disabled={Boolean(initialData)}>
              <SelectTrigger><SelectValue placeholder="Select coffee code..." /></SelectTrigger>
              <SelectContent>
                {purchases.map((purchase) => (
                  <SelectItem key={purchase.id} value={purchase.id}>
                    {purchase.coffee_code} - {purchase.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Supplier Name</Label>
              <Input value={selectedPurchase?.supplier_name || initialData?.supplier_name || '-'} readOnly className="bg-muted font-medium" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Net Dispatch Weight KG (from Purchase)</Label>
              <Input value={selectedPurchase ? fmt(selectedPurchase.net_dispatch_weight_kg) : initialData ? fmt(initialData.dispatch_kg) : '-'} readOnly className="bg-muted font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Warehouse Received Net KG *</Label>
              <NumberInput decimals={2} value={form.received_kg} onChange={(value) => setForm((prev) => ({ ...prev, received_kg: value }))} placeholder="0.00" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Shortage KG (Dispatch - Received)</Label>
              <Input value={shortageKg == null ? '-' : fmt(shortageKg)} readOnly className={`font-medium ${shortageKg === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">GRN / Receipt No</Label>
              <Input value={form.receipt_number} onChange={(event) => setForm((prev) => ({ ...prev, receipt_number: event.target.value }))} placeholder="DEMO-WH-004" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Received Date</Label>
              <Input type="date" value={form.received_date} onChange={(event) => setForm((prev) => ({ ...prev, received_date: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Warehouse</Label>
              <Input value={form.warehouse_name} onChange={(event) => setForm((prev) => ({ ...prev, warehouse_name: event.target.value }))} />
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            <div className="font-semibold">Purchase impact</div>
            <div>Warehouse feresula: {receivedKg != null ? fmt(receivedKg / 17, 4) : '-'}</div>
            <div>Projected commission from receipt KG: {projectedCommission != null ? fmt(projectedCommission) : '-'} ETB</div>
            <div>Grand total and balance are recalculated by the database RPC after save.</div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remark</Label>
            <Textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} rows={2} placeholder="Optional..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !form.purchase_record_id || !form.received_kg}>
              {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create Receipt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WarehouseReceiptPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const queryClient = useQueryClient();

  const receiptsQuery = useQuery({
    queryKey: ['warehouse-receipts', showArchived],
    queryFn: () => warehouseService.listReceipts({ includeArchived: showArchived }),
  });
  const purchasesQuery = useQuery({
    queryKey: ['purchase-records-for-warehouse'],
    queryFn: () => warehouseService.listEligiblePurchases(),
  });
  const availabilityQuery = useQuery({
    queryKey: ['warehouse-supplier-availability'],
    queryFn: () => warehouseService.supplierAvailability(),
  });
  const historyQuery = useQuery({
    queryKey: ['warehouse-history', expandedHistoryId],
    queryFn: () => warehouseService.listHistory(expandedHistoryId),
    enabled: Boolean(expandedHistoryId),
  });

  const receipts = receiptsQuery.data || [];
  const purchases = purchasesQuery.data || [];
  const availability = availabilityQuery.data || [];

  const invalidateWarehouse = () => {
    queryClient.invalidateQueries({ queryKey: ['warehouse-receipts'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-records'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-records-for-warehouse'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-supplier-availability'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-history'] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => warehouseService.createReceipt(data),
    onSuccess: () => {
      invalidateWarehouse();
      setDialogOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => warehouseService.updateReceipt(id, data),
    onSuccess: () => {
      invalidateWarehouse();
      setDialogOpen(false);
      setEditRecord(null);
    },
  });
  const archiveMutation = useMutation({
    mutationFn: ({ id, reason }) => warehouseService.archiveReceipt(id, reason),
    onSuccess: () => {
      invalidateWarehouse();
      setArchiveTarget(null);
    },
  });
  const restoreMutation = useMutation({
    mutationFn: (id) => warehouseService.restoreReceipt(id, 'Restored from Phase 5 demo UI'),
    onSuccess: invalidateWarehouse,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return receipts.filter((receipt) => (
      !search ||
      receipt.supplier_name?.toLowerCase().includes(q) ||
      receipt.coffee_code?.toLowerCase().includes(q) ||
      receipt.receipt_number?.toLowerCase().includes(q)
    ));
  }, [receipts, search]);

  const availabilityBySupplier = useMemo(() => {
    const map = {};
    availability.forEach((item) => { map[item.supplier_id] = item.available_kg; });
    return map;
  }, [availability]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <RoleGuard allowedRoles={['admin', 'warehouse_keeper']}>
      <div>
        <PageHeader title="Warehouse Receipt" description="Manage incoming coffee warehouse receipts">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowArchived((value) => !value)}>
              <ArchiveRestore className="w-4 h-4 mr-1" /> {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
            <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New Receipt
            </Button>
          </div>
        </PageHeader>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Demo Environment: warehouse receipts and stock movements are synthetic. Supplier available KG now reflects warehouse receipts minus sample and processing deductions.
        </div>

        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by supplier, coffee code, GRN..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1300px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {['#', 'Coffee Code', 'Supplier', 'GRN Code', 'Received Date', 'Dispatch KG', 'Received KG', 'Shortage KG', 'Available KG', 'Commission Impact', 'Status', 'Actions', 'History'].map((label) => (
                    <TableHead key={label} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiptsQuery.isLoading ? (
                  Array(4).fill(0).map((_, rowIndex) => (
                    <TableRow key={rowIndex}>{Array(13).fill(0).map((__, cellIndex) => <TableCell key={cellIndex}><Skeleton className="h-4 w-16" /></TableCell>)}</TableRow>
                  ))
                ) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={13} className="text-center py-12 text-muted-foreground">No warehouse receipts found.</TableCell></TableRow>
                ) : paginated.map((receipt, index) => {
                  const commissionImpact = (Number(receipt.received_kg || 0) / 17) * Number(purchases.find((purchase) => purchase.id === receipt.purchase_record_id)?.unit_price_etb_per_feresula || 0) * (Number(purchases.find((purchase) => purchase.id === receipt.purchase_record_id)?.commission_percent || 0) / 100);
                  return (
                    <React.Fragment key={receipt.id}>
                      <TableRow className={`hover:bg-muted/30 ${receipt.archived_at ? 'bg-muted/40 text-muted-foreground' : ''}`}>
                        <TableCell className="text-muted-foreground text-xs">{(page - 1) * pageSize + index + 1}</TableCell>
                        <TableCell className="font-mono text-xs font-medium text-primary whitespace-nowrap">{receipt.coffee_code}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{receipt.supplier_name}</TableCell>
                        <TableCell className="whitespace-nowrap">{receipt.receipt_number || '-'}</TableCell>
                        <TableCell className="whitespace-nowrap">{receipt.received_date ? format(new Date(receipt.received_date), 'd MMM yyyy') : '-'}</TableCell>
                        <TableCell className="text-right">{fmt(receipt.dispatch_kg)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(receipt.received_kg)}</TableCell>
                        <TableCell className={`text-right font-medium ${Number(receipt.shortage_kg) === 0 ? 'text-green-700' : 'text-amber-700'}`}>{fmt(receipt.shortage_kg)}</TableCell>
                        <TableCell className="text-right font-semibold text-accent">{fmt(availabilityBySupplier[receipt.supplier_id] || 0)}</TableCell>
                        <TableCell className="text-right">{fmt(commissionImpact)} ETB</TableCell>
                        <TableCell>{receipt.archived_at ? 'Archived' : 'Received'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!receipt.archived_at && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => { setEditRecord(receipt); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setArchiveTarget(receipt)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </>
                            )}
                            {receipt.archived_at && (
                              <Button size="sm" variant="ghost" onClick={() => restoreMutation.mutate(receipt.id)} disabled={restoreMutation.isPending}><RotateCcw className="w-3.5 h-3.5" /></Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setExpandedHistoryId((value) => value === receipt.id ? null : receipt.id)}>
                            <Clock className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedHistoryId === receipt.id && (
                        <TableRow>
                          <TableCell colSpan={13} className="bg-muted/20">
                            <div className="space-y-1 text-xs">
                              {(historyQuery.data || []).map((history) => (
                                <div key={history.id} className="flex justify-between gap-3">
                                  <span className="font-medium">{history.action_type}</span>
                                  <span className="text-muted-foreground">{history.reason || 'No reason'}</span>
                                  <span>{history.created_at ? format(new Date(history.created_at), 'd MMM yyyy HH:mm') : '-'}</span>
                                </div>
                              ))}
                              {historyQuery.isLoading && <div className="text-muted-foreground">Loading history...</div>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSize={setPageSize} />

        <ReceiptDialog
          open={dialogOpen}
          onOpenChange={(value) => { setDialogOpen(value); if (!value) setEditRecord(null); }}
          initialData={editRecord}
          purchases={purchases}
          onSubmit={(data) => {
            if (editRecord) updateMutation.mutate({ id: editRecord.id, data });
            else createMutation.mutate(data);
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />

        <RichArchiveDialog
          open={Boolean(archiveTarget)}
          onOpenChange={(value) => { if (!value) setArchiveTarget(null); }}
          title="Archive Warehouse Receipt?"
          requireConfirm={true}
          mainRecord={archiveTarget ? { label: `Warehouse Receipt: ${archiveTarget.receipt_number || archiveTarget.coffee_code}`, ref: `${fmt(archiveTarget.received_kg)} KG received` } : null}
          linkedRecords={[]}
          impacts={['Supplier available KG', 'Purchase commission', 'Purchase balance', 'Stock movement']}
          isPending={archiveMutation.isPending}
          onConfirm={(reason) => archiveMutation.mutate({ id: archiveTarget.id, reason })}
        />
      </div>
    </RoleGuard>
  );
}
