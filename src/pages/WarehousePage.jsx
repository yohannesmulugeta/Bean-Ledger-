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
  { name: 'lot_number', label: 'Lot Number', required: true, placeholder: 'e.g. LOT-2024-001' },
  { name: 'coffee_type', label: 'Coffee Type', type: 'select', options: ['Arabica', 'Robusta', 'Mixed'], required: true },
  { name: 'grade', label: 'Grade', type: 'select', options: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Ungraded'] },
  { name: 'quantity_kg', label: 'Quantity (kg)', type: 'number', required: true, placeholder: '0' },
  { name: 'warehouse_location', label: 'Warehouse / Section', required: true, placeholder: 'e.g. Warehouse A, Section 3' },
  { name: 'status', label: 'Status', type: 'select', options: ['In Storage', 'In Processing', 'Ready for Export', 'Exported'], default: 'In Storage' },
  { name: 'received_date', label: 'Received Date', type: 'date' },
  { name: 'moisture_content', label: 'Moisture Content (%)', type: 'number', placeholder: 'e.g. 11.5' },
  { name: 'source_purchase_id', label: 'Source Purchase Reference', placeholder: 'Optional reference' },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' },
];

const COLUMNS = [
  { header: 'Lot #', render: (row) => <span className="font-mono text-sm font-medium">{row.lot_number}</span> },
  { header: 'Type', accessor: 'coffee_type' },
  { header: 'Grade', accessor: 'grade' },
  { header: 'Quantity', render: (row) => `${(row.quantity_kg || 0).toLocaleString()} kg` },
  { header: 'Location', accessor: 'warehouse_location' },
  { header: 'Moisture', render: (row) => row.moisture_content ? `${row.moisture_content}%` : '-' },
  { header: 'Received', render: (row) => row.received_date ? format(new Date(row.received_date), 'MMM d, yyyy') : '-' },
  { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];

export default function WarehousePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading, fromCache, lastUpdated } = useOfflineQuery('inventory', {
    queryKey: ['inventory'],
    queryFn: () => base44.entities.WarehouseInventory.list('-received_date', 100),
    staleTime: 60000,
  });

  const { isOnline, guardSave, OfflineDialog } = useOfflineSaveGuard();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WarehouseInventory.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setDialogOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WarehouseInventory.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setDialogOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WarehouseInventory.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setDeleteTarget(null); },
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
      <PageHeader title="Warehouse" description="Manage coffee inventory and storage">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Inventory
        </Button>
      </PageHeader>

      <OfflineDataBanner visible={fromCache} lastUpdated={lastUpdated} />

      <DataTable
        columns={[...COLUMNS, actionsColumn]}
        data={inventory}
        isLoading={isLoading}
        emptyMessage="No inventory records. Click 'Add Inventory' to get started."
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit Inventory' : 'Add Inventory'}
        fields={FIELDS}
        initialData={editing}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <OfflineDialog />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete lot {deleteTarget?.lot_number}? This action cannot be undone.
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