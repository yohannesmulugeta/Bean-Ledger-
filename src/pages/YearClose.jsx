// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, FileText, LockKeyhole, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportService, REPORT_QUERY_KEYS } from '@/services/reportService';
import { yearCloseService } from '@/services/governanceService';
import { buildAnnualReport } from '@/lib/governanceCalculations';
import { exportPDF, exportXLSX } from '@/lib/exportUtils';
import { usePermission } from '@/lib/role-hooks';
import ReportWorkspaceNav from '@/components/reports/ReportWorkspaceNav';
import ReasonDialog from '@/components/shared/ReasonDialog';

const year = new Date().getFullYear();
const fmt = (value, digits = 0) => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default function YearClose() {
  const queryClient = useQueryClient();
  const { canPerform } = usePermission();
  const canClose = canPerform('year_close', 'can_create');
  const [fromDate, setFromDate] = useState(`${year}-01-01`);
  const [toDate, setToDate] = useState(`${year}-12-31`);
  const [periodLabel, setPeriodLabel] = useState(`${year} Annual Coffee Report`);
  const [reopening, setReopening] = useState(null);
  const { data: snapshot = {}, isLoading } = useQuery({ queryKey: REPORT_QUERY_KEYS.snapshot, queryFn: () => reportService.snapshot() });
  const { data: periods = [] } = useQuery({ queryKey: ['annual-reporting-periods'], queryFn: () => yearCloseService.list() });
  const report = useMemo(() => buildAnnualReport(snapshot, fromDate, toDate), [snapshot, fromDate, toDate]);
  const totals = report.totals;

  const closeMutation = useMutation({
    mutationFn: () => yearCloseService.close({ periodLabel, startDate: fromDate, endDate: toDate, report }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['annual-reporting-periods'] }); toast.success('Annual reporting period closed'); },
    onError: (error) => toast.error(error.message || 'Year close failed'),
  });
  const reopenMutation = useMutation({
    mutationFn: ({ id, reason }) => yearCloseService.reopen(id, reason),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['annual-reporting-periods'] }); setReopening(null); toast.success('Reporting period reopened'); },
    onError: (error) => toast.error(error.message || 'Reopen failed'),
  });

  const reportRows = Object.entries(totals).map(([key, value]) => [key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()), value]);
  const exportReport = (format) => {
    const args = [periodLabel, ['Measure', 'Value'], reportRows, null];
    if (format === 'xlsx') exportXLSX(`BeanLedger-${year}-annual-report`, args[0], args[1], args[2], args[3], `${fromDate} to ${toDate}`);
    else exportPDF(args[0], args[1], args[2], args[3]);
  };
  return (
    <div>
      <PageHeader title="Fiscal Period Close" description="Review, export, and lock annual operating totals">
        <Button variant="outline" onClick={() => exportReport('xlsx')} className="gap-2"><FileSpreadsheet className="h-4 w-4" />Excel</Button>
        <Button variant="outline" onClick={() => exportReport('pdf')} className="gap-2"><FileText className="h-4 w-4" />PDF</Button>
      </PageHeader>
      <ReportWorkspaceNav />

      <div className="mb-6 grid grid-cols-1 gap-4 border-y border-border bg-muted/20 py-5 sm:grid-cols-3">
        <div className="space-y-1.5"><Label>From</Label><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></div>
        <div className="space-y-1.5"><Label>To</Label><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div>
        <div className="space-y-1.5"><Label>Period label</Label><Input value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} /></div>
      </div>

      <div className="mb-6 grid grid-cols-2 border border-border md:grid-cols-4">
        {[
          ['Purchases', totals.purchaseCount],
          ['Received KG', fmt(totals.receivedKg)],
          ['Processed KG', fmt(totals.processingKg)],
          ['Supplier Remaining KG', fmt(totals.remainingSupplierKg)],
          ['Export Output KG', fmt(totals.outputExportKg)],
          ['Contracted KG', fmt(totals.contractedKg)],
          ['Purchase Value ETB', fmt(totals.purchaseValueEtb, 2)],
          ['Outstanding ETB', fmt(totals.balanceEtb, 2)],
        ].map(([label, value]) => <div key={label} className="min-w-0 border-b border-r border-border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-lg font-bold">{isLoading ? 'Loading...' : value}</p></div>)}
      </div>

      {report.warnings.length > 0 && <div className="mb-6 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p className="font-semibold">Close checks</p>{report.warnings.map((warning) => <p key={warning} className="mt-1">{warning}</p>)}</div>}

      {canClose && <div className="mb-8 flex justify-end"><Button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending || !fromDate || !toDate} className="gap-2"><LockKeyhole className="h-4 w-4" />Close reporting period</Button></div>}

      <h2 className="mb-3 text-base font-semibold">Close history</h2>
      <div className="overflow-hidden rounded-lg border border-border">
        <Table><TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Date range</TableHead><TableHead>Status</TableHead><TableHead>Closed</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>
          {periods.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No closed periods.</TableCell></TableRow>}
          {periods.map((period) => <TableRow key={period.id}><TableCell className="font-medium">{period.period_label}</TableCell><TableCell>{period.start_date} to {period.end_date}</TableCell><TableCell className={period.status === 'closed' ? 'font-semibold text-emerald-700' : 'text-amber-700'}>{period.status}</TableCell><TableCell>{String(period.closed_at || '').slice(0, 10)}</TableCell><TableCell>{canClose && period.status === 'closed' && <Button variant="ghost" size="icon" title="Reopen period" aria-label={`Reopen ${period.period_label}`} onClick={() => setReopening(period)}><RotateCcw className="h-4 w-4" /></Button>}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
      <ReasonDialog
        open={Boolean(reopening)}
        onOpenChange={(open) => { if (!open) setReopening(null); }}
        title="Reopen fiscal period"
        description={reopening ? `Provide a business reason for reopening ${reopening.period_label}.` : ''}
        confirmLabel="Reopen period"
        pending={reopenMutation.isPending}
        onConfirm={(reason) => reopenMutation.mutate({ id: reopening.id, reason })}
      />
    </div>
  );
}
