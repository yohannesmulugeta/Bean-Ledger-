import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import DataTable, { StatusBadge } from '@/components/shared/DataTable';
import RecordFormDialog from '@/components/shared/RecordFormDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const FIELDS = [
  { name: 'contract_number', label: 'Contract Number', required: true, placeholder: 'e.g. EXP-2024-001' },
  { name: 'buyer_name', label: 'Buyer Name', required: true, placeholder: 'Buyer / importer name' },
  { name: 'buyer_country', label: 'Destination Country', required: true, placeholder: 'e.g. Germany' },
  { name: 'coffee_type', label: 'Coffee Type', type: 'select', options: ['Arabica', 'Robusta', 'Mixed'], required: true },
  { name: 'grade', label: 'Grade', type: 'select', options: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] },
  { name: 'quantity_kg', label: 'Quantity (kg)', type: 'number', required: true, placeholder: '0' },
  { name: 'price_per_kg_usd', label: 'Price per kg (USD)', type: 'number', placeholder: '0' },
  { name: 'total_value_usd', label: 'Total Value (USD)', type: 'number', readOnly: true, default: 0 },
  { name: 'shipment_date', label: 'Shipment Date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: ['Contract Signed', 'Preparing', 'In Transit', 'Delivered', 'Completed'], default: 'Contract Signed' },
  { name: 'shipping_method', label: 'Shipping Method', type: 'select', options: ['Sea Freight', 'Air Freight', 'Land Transport'] },
  { name: 'batch_numbers', label: 'Batch Numbers', placeholder: 'Comma-separated batch references' },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Export notes...' },
];

const COLUMNS = [
  { header: 'Contract', render: (row) => <span className="font-mono text-sm font-medium">{row.contract_number}</span> },
  { header: 'Buyer', render: (row) => (
    <div>
      <p className="font-medium text-sm">{row.buyer_name}</p>
      <p className="text-xs text-muted-foreground">{row.buyer_country}</p>
    </div>
  )},
  { header: 'Type', accessor: 'coffee_type' },
  { header: 'Grade', accessor: 'grade' },
  { header: 'Quantity', render: (row) => `${(row.quantity_kg || 0).toLocaleString()} kg` },
  { header: 'Value', render: (row) => row.total_value_usd ? `$${row.total_value_usd.toLocaleString()}` : '-' },
  { header: 'Ship Date', render: (row) => row.shipment_date ? format(new Date(row.shipment_date), 'MMM d, yyyy') : '-' },
  { header: 'Method', accessor: 'shipping_method', render: (row) => row.shipping_method || '-' },
  { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];

export default function Exports() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: exports = [], isLoading } = useQuery({
    queryKey: ['exports'],
    queryFn: () => base44.entities.Export.list('-created_date', 100),
  });

  const createMutation = useMutation({
    /** @param {any} data */
    mutationFn: (data) => base44.entities.Export.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exports'] }); setDialogOpen(false); },
  });

  const updateMutation = useMutation({
    /** @param {any} variables */
    mutationFn: (variables) => {
      const { id, data } = variables;
      return base44.entities.Export.update(id, data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exports'] }); setDialogOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    /** @param {any} id */
    mutationFn: (id) => base44.entities.Export.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exports'] }); setDeleteTarget(null); },
  });

  const handleSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
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
      <PageHeader title="Exports" description="Manage export contracts and shipments">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Export
        </Button>
      </PageHeader>

      <DataTable
        columns={[...COLUMNS, actionsColumn]}
        data={exports}
        isLoading={isLoading}
        onRowClick={() => {}}
        emptyMessage="No export contracts yet. Click 'New Export' to get started."
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit Export' : 'New Export Contract'}
        fields={FIELDS}
        initialData={editing}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Export</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete contract {deleteTarget?.contract_number}? This action cannot be undone.
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
