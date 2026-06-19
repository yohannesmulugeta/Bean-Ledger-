import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import DataTable, { StatusBadge } from '@/components/shared/DataTable';
import RecordFormDialog from '@/components/shared/RecordFormDialog';
import OfflineDataBanner from '@/components/shared/OfflineDataBanner';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import useOfflineSaveGuard from '@/hooks/useOfflineSaveGuard';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const FIELDS = [
  { name: 'supplier_name', label: 'Supplier Name', required: true, placeholder: 'Enter supplier name' },
  { name: 'supplier_location', label: 'Supplier Location', placeholder: 'Region or town' },
  { name: 'coffee_type', label: 'Coffee Type', type: 'select', options: ['Arabica', 'Robusta', 'Mixed'], required: true },
  { name: 'grade', label: 'Grade', type: 'select', options: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Ungraded'] },
  { name: 'quantity_kg', label: 'Quantity (kg)', type: 'number', required: true, placeholder: '0' },
  { name: 'price_per_kg', label: 'Price per kg (ETB)', type: 'number', required: true, placeholder: '0' },
  { name: 'total_cost', label: 'Total Cost (ETB)', type: 'number', readOnly: true, default: 0 },
  { name: 'purchase_date', label: 'Purchase Date', type: 'date', required: true },
  { name: 'payment_status', label: 'Payment Status', type: 'select', options: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' },
];

const COLUMNS = [
  { header: 'Supplier', accessor: 'supplier_name', render: (row) => (
    <div>
      <p className="font-medium text-sm">{row.supplier_name}</p>
      <p className="text-xs text-muted-foreground">{row.supplier_location}</p>
    </div>
  )},
  { header: 'Type', accessor: 'coffee_type' },
  { header: 'Grade', accessor: 'grade' },
  { header: 'Quantity', render: (row) => `${(row.quantity_kg || 0).toLocaleString()} kg` },
  { header: 'Price/kg', render: (row) => `${(row.price_per_kg || 0).toLocaleString()} ETB` },
  { header: 'Total', render: (row) => `${(row.total_cost || 0).toLocaleString()} ETB` },
  { header: 'Date', render: (row) => row.purchase_date ? format(new Date(row.purchase_date), 'MMM d, yyyy') : '-' },
  { header: 'Payment', render: (row) => <StatusBadge status={row.payment_status} /> },
];

export default function Purchases() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: purchases = [], isLoading, fromCache, lastUpdated } = useOfflineQuery('purchases', {
    queryKey: ['purchases'],
    queryFn: () => base44.entities.Purchase.list('-purchase_date', 100),
    staleTime: 60000,
  });

  const { isOnline, guardSave, OfflineDialog } = useOfflineSaveGuard();

  const createMutation = useMutation({
    /** @param {any} data */
    mutationFn: (data) => base44.entities.Purchase.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases'] }); setDialogOpen(false); },
  });

  const updateMutation = useMutation({
    /** @param {any} variables */
    mutationFn: (variables) => {
      const { id, data } = variables;
      return base44.entities.Purchase.update(id, data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases'] }); setDialogOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    /** @param {any} id */
    mutationFn: (id) => base44.entities.Purchase.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases'] }); setDeleteTarget(null); },
  });

  const handleSubmit = (data) => {
    guardSave(() => {
      if (editing) {
        updateMutation.mutate({ id: editing.id, data });
      } else {
        createMutation.mutate(data);
      }
    });
  };

  const actionsColumn = {
    header: '',
    render: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditing(row); setDialogOpen(true); }}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Purchases" description="Track coffee purchases from suppliers">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Purchase
        </Button>
      </PageHeader>

      <OfflineDataBanner visible={fromCache} lastUpdated={lastUpdated} />

      <DataTable
        columns={[...COLUMNS, actionsColumn]}
        data={purchases}
        isLoading={isLoading}
        onRowClick={() => {}}
        emptyMessage="No purchases recorded yet. Click 'New Purchase' to get started."
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit Purchase' : 'New Purchase'}
        fields={FIELDS}
        initialData={editing}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <OfflineDialog />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this purchase from {deleteTarget?.supplier_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
