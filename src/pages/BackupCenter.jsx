// @ts-nocheck
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportService, REPORT_QUERY_KEYS } from '@/services/reportService';
import { backupExportService, yearCloseService } from '@/services/governanceService';
import { downloadDemoBackup } from '@/lib/backupExport';

const today = () => new Date().toISOString().slice(0, 10);

export default function BackupCenter() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState('daily');
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const { data: snapshot = {} } = useQuery({ queryKey: REPORT_QUERY_KEYS.snapshot, queryFn: () => reportService.snapshot() });
  const { data: periods = [] } = useQuery({ queryKey: ['annual-reporting-periods'], queryFn: () => yearCloseService.list() });
  const { data: history = [] } = useQuery({ queryKey: ['backup-exports'], queryFn: () => backupExportService.list() });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const range = scope === 'daily' ? { fromDate: today(), toDate: today() } : scope === 'full' ? { fromDate: null, toDate: null } : { fromDate, toDate };
      if (scope === 'date_range' && (!fromDate || !toDate || toDate < fromDate)) throw new Error('Enter a valid date range');
      const result = downloadDemoBackup({ snapshot, periods, scope, ...range });
      await backupExportService.log({ export_scope: scope, from_date: range.fromDate, to_date: range.toDate, file_name: result.fileName, row_count: result.rowCount, status: 'completed' });
      return result;
    },
    onSuccess: async (result) => { await queryClient.invalidateQueries({ queryKey: ['backup-exports'] }); toast.success(`${result.fileName} downloaded`); },
    onError: (error) => toast.error(error.message || 'Backup export failed'),
  });

  return (
    <div>
      <PageHeader title="Data Export & Recovery" description="Demo data exports and database recovery status" />

      <section className="mb-8 border-y border-border bg-muted/20 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5"><Label>Export scope</Label><Select value={scope} onValueChange={setScope}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Today</SelectItem><SelectItem value="date_range">Date range</SelectItem><SelectItem value="full">Full demo dataset</SelectItem></SelectContent></Select></div>
          {scope === 'date_range' && <><div className="space-y-1.5"><Label>From</Label><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></div><div className="space-y-1.5"><Label>To</Label><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div></>}
          <div className="flex items-end sm:ml-auto"><Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending} className="w-full gap-2"><Download className="h-4 w-4" />Download Excel backup</Button></div>
        </div>
      </section>

      <h2 className="mb-3 text-base font-semibold">Export history</h2>
      <div className="overflow-hidden rounded-lg border border-border">
        <Table><TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Scope</TableHead><TableHead>Date range</TableHead><TableHead>File</TableHead><TableHead className="text-right">Rows</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {history.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No backup exports recorded.</TableCell></TableRow>}
          {history.map((row) => <TableRow key={row.id}><TableCell>{String(row.created_at || '').replace('T', ' ').slice(0, 16)}</TableCell><TableCell>{row.export_scope.replace('_', ' ')}</TableCell><TableCell>{row.from_date ? `${row.from_date} to ${row.to_date}` : 'All demo data'}</TableCell><TableCell className="max-w-72 truncate font-mono text-xs">{row.file_name}</TableCell><TableCell className="text-right">{row.row_count}</TableCell><TableCell className="font-semibold text-emerald-700">{row.status}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </div>
  );
}
