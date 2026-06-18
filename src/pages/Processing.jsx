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
  { name: 'batch_number', label: 'Batch Number', required: true, placeholder: 'e.g. BATCH-2024-001' },
  { name: 'lot_number', label: 'Source Lot Number', required: true, placeholder: 'Warehouse lot reference' },
  { name: 'coffee_type', label: 'Coffee Type', type: 'select', options: ['Arabica', 'Robusta', 'Mixed'], required: true },
  { name: 'process_type', label: 'Process Type', type: 'select', options: ['Washed', 'Natural', 'Honey', 'Semi-Washed'], required: true },
  { name: 'input_quantity_kg', label: 'Input Quantity (kg)', type: 'number', required: true, placeholder: '0' },
  { name: 'output_quantity_kg', label: 'Output Quantity (kg)', type: 'number', placeholder: '0' },
  { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Washing', 'Drying', 'Hulling', 'Grading', 'Completed'], default: 'Pending' },
  { name: 'start_date', label: 'Start Date', type: 'date' },
  { name: 'end_date', label: 'End Date', type: 'date' },
  { name: 'output_grade', label: 'Output Grade', type: 'select', options: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Processing notes...' },
];

const COLUMNS = [
  { header: 'Batch #', render: (row) => <span className="font-mono text-sm font-medium">{row.batch_number}</span> },
  { header: 'Lot #', render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.lot_number}</span> },
  { header: 'Type', accessor: 'coffee_type' },
  { header: 'Process', accessor: 'process_type' },
  { header: 'Input', render: (row) => `${(row.input_quantity_kg || 0).toLocaleString()} kg` },
  { header: 'Output', render: (row) => row.output_quantity_kg ? `${row.output_quantity_kg.toLocaleString()} kg` : '-' },
  { header: 'Yield', render: (row) => {
    if (!row.output_quantity_kg || !row.input_quantity_kg) return '-';
    return `${((row.output_quantity_kg / row.input_quantity_kg) * 100).toFixed(1)}%`;
  }},
  { header: 'Started', render: (row) => row.start_date ? format(new Date(row.start_date), 'MMM d, yyyy') : '-' },
  { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];

export default function Processing() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => base44.entities.ProcessingBatch.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProcessingBatch.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batches'] }); setDialogOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProcessingBatch.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batches'] }); setDialogOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProcessingBatch.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batches'] }); setDeleteTarget(null); },
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
      <PageHeader title="Processing" description="Track coffee processing batches and stages">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Batch
        </Button>
      </PageHeader>

      <DataTable
        columns={[...COLUMNS, actionsColumn]}
        data={batches}
        isLoading={isLoading}
        emptyMessage="No processing batches yet. Click 'New Batch' to get started."
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit Batch' : 'New Processing Batch'}
        fields={FIELDS}
        initialData={editing}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete batch {deleteTarget?.batch_number}? This action cannot be undone.
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