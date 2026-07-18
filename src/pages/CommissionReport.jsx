// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, FileText } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportService, REPORT_QUERY_KEYS } from '@/services/reportService';
import { buildCommissionRows } from '@/lib/governanceCalculations';
import { exportPDF, exportXLSX } from '@/lib/exportUtils';
import ReportWorkspaceNav from '@/components/reports/ReportWorkspaceNav';

const fmt = (value, digits = 2) => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default function CommissionReport() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const { data: snapshot = {} } = useQuery({ queryKey: REPORT_QUERY_KEYS.snapshot, queryFn: () => reportService.snapshot() });
  const rows = useMemo(() => buildCommissionRows(snapshot, fromDate, toDate).filter((row) => {
    const query = search.trim().toLowerCase();
    return !query || [row.agent, row.supplierName, row.coffeeCode].some((value) => String(value || '').toLowerCase().includes(query));
  }), [snapshot, fromDate, toDate, search]);
  const total = rows.reduce((sum, row) => sum + row.expectedCommissionEtb, 0);
  const pending = rows.filter((row) => row.basis === 'Dispatch estimate').length;
  const exportRows = rows.map((row) => [row.purchaseDate, row.coffeeCode, row.supplierName, row.agent, row.basis, row.basisKg, row.commissionPercent, row.expectedCommissionEtb, row.warnings.join('; ')]);
  const headers = ['Date', 'Coffee Code', 'Supplier', 'Agent', 'Basis', 'Basis KG', 'Commission %', 'Commission ETB', 'Checks'];

  return (
    <div>
      <PageHeader title="Agent Commission Statement" description="Commission calculated from warehouse receipts, with dispatch estimates clearly identified">
        <Button variant="outline" className="gap-2" onClick={() => exportXLSX('BeanLedger-commission-report', 'Commission Report', headers, exportRows, ['Total', '', '', '', '', '', '', total, ''], fromDate || toDate ? `${fromDate || 'Start'} to ${toDate || 'Today'}` : '')}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
        <Button variant="outline" className="gap-2" onClick={() => exportPDF('Commission Report', headers, exportRows, ['Total', '', '', '', '', '', '', total, ''])}><FileText className="h-4 w-4" />PDF</Button>
      </PageHeader>
      <ReportWorkspaceNav />

      <div className="mb-6 grid grid-cols-1 gap-4 border-y border-border bg-muted/20 py-5 sm:grid-cols-4">
        <div className="space-y-1.5"><Label>From</Label><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></div>
        <div className="space-y-1.5"><Label>To</Label><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Search</Label><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Agent, supplier, or coffee code" /></div>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 text-sm"><span><strong>{rows.length}</strong> purchase lines</span><span><strong>{fmt(total)}</strong> ETB commission</span><span className={pending ? 'text-amber-700' : 'text-emerald-700'}><strong>{pending}</strong> pending receipt estimates</span></div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table><TableHeader><TableRow><TableHead>Date / Code</TableHead><TableHead>Supplier / Agent</TableHead><TableHead>Basis</TableHead><TableHead className="text-right">Basis KG</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Commission ETB</TableHead><TableHead>Checks</TableHead></TableRow></TableHeader><TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No commission records for this filter.</TableCell></TableRow>}
          {rows.map((row) => <TableRow key={row.id}><TableCell><p>{row.purchaseDate}</p><p className="font-mono text-xs text-muted-foreground">{row.coffeeCode}</p></TableCell><TableCell><p>{row.supplierName}</p><p className="text-xs text-muted-foreground">{row.agent}</p></TableCell><TableCell className={row.basis === 'Dispatch estimate' ? 'text-amber-700' : 'text-emerald-700'}>{row.basis}</TableCell><TableCell className="text-right">{fmt(row.basisKg, 3)}</TableCell><TableCell className="text-right">{fmt(row.commissionPercent)}%</TableCell><TableCell className="text-right font-semibold">{fmt(row.expectedCommissionEtb)}</TableCell><TableCell><div className="max-w-64 text-xs text-amber-800">{row.warnings.join('; ') || 'Passed'}</div></TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </div>
  );
}
