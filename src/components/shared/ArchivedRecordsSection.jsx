import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Archive, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useRole } from '@/lib/role-hooks';
import { archiveService } from '@/services/archiveService';

export default function ArchivedRecordsSection({ entityName, screenName, queryKey, columns, describeRecord, onExtraInvalidate }) {
  const { isAdminOrSupervisor } = useRole();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: archived = [], isLoading } = useQuery({
    queryKey: [`${entityName}-archived`],
    queryFn: () => archiveService.list(entityName),
    enabled: isAdminOrSupervisor && open,
  });

  const restoreMutation = useMutation({
    /** @param {any} record */
    mutationFn: (record) => archiveService.restore(
      entityName,
      record,
      `Demo restore from ${screenName || entityName}: ${describeRecord ? describeRecord(record) : record.id}`
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${entityName}-archived`] });
      if (queryKey) queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
      queryClient.invalidateQueries({ queryKey: ['phase9-report-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['phase9-dashboard-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['phase9-stock-snapshot'] });
      if (onExtraInvalidate) onExtraInvalidate(queryClient);
    },
  });

  if (!isAdminOrSupervisor) return null;

  return (
    <div className="mt-8 rounded-xl border border-border bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Archived Records</span>
          <span className="text-xs text-muted-foreground">(admin / supervisor only)</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="border-t border-border">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading archived records...</p>
          ) : archived.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No archived records.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {columns.map(c => (
                      <TableHead key={c.label} className="text-xs">{c.label}</TableHead>
                    ))}
                    <TableHead className="text-xs">Archived By</TableHead>
                    <TableHead className="text-xs">Archived At</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archived.map(rec => (
                    <TableRow key={rec.id} className="hover:bg-muted/20">
                      {columns.map(c => (
                        <TableCell key={c.label} className="text-xs">{c.render(rec)}</TableCell>
                      ))}
                      <TableCell className="text-xs">{rec.archived_by || 'Demo System'}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {rec.archived_at ? format(new Date(rec.archived_at), 'dd/MM/yyyy HH:mm') : '---'}
                      </TableCell>
                      <TableCell className="text-xs italic text-muted-foreground max-w-[200px] truncate" title={rec.archive_reason || rec.reason}>
                        {rec.archive_reason || rec.reason || 'Synthetic demo archive'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={restoreMutation.isPending}
                          onClick={() => restoreMutation.mutate(rec)}
                          className="gap-1.5 h-7"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
