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
import { computeAvailabilityBySupplier } from '@/lib/availabilityUtils';
import { exportPDF, exportXLSX } from '@/lib/exportUtils';

const fmt = (value) => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function SupplierRemainingExplanation({ embedded = false, snapshot: providedSnapshot = null }) {
  const [search, setSearch] = useState('');
  const { data: loadedSnapshot = {} } = useQuery({
    queryKey: REPORT_QUERY_KEYS.snapshot,
    queryFn: () => reportService.snapshot(),
    enabled: !providedSnapshot,
  });
  const snapshot = providedSnapshot || loadedSnapshot;
  const rows = useMemo(() => {
    const availability = computeAvailabilityBySupplier({
      receipts: snapshot.receipts || [],
      purchases: snapshot.purchases || [],
      sampleLogs: snapshot.sampleLogs || [],
      processingLogs: snapshot.processingLogs || [],
      adjustments: snapshot.stockAdjustments || [],
    });
    const query = search.trim().toLowerCase();
    return (snapshot.suppliers || []).filter((supplier) => !supplier.archived).map((supplier) => ({
      supplierName: supplier.supplier_name,
      coffeeType: supplier.coffee_type,
      ...(availability[supplier.supplier_name] || { netCoffeeKg: 0, samplesKg: 0, processedKg: 0, adjustmentKg: 0, calculatedKg: 0, availableKg: 0 }),
    })).filter((row) => !query || `${row.supplierName} ${row.coffeeType}`.toLowerCase().includes(query));
  }, [snapshot, search]);
  const total = rows.reduce((sum, row) => sum + row.availableKg, 0);
  const headers = ['Supplier', 'Coffee Type', 'Received KG', 'Samples KG', 'Processing KG', 'Adjustment KG', 'Remaining KG'];
  const exportRows = rows.map((row) => [row.supplierName, row.coffeeType, row.netCoffeeKg, row.samplesKg, row.processedKg, row.adjustmentKg, row.availableKg]);
  const exportActions = (
    <>
      <Button variant="outline" className="gap-2" onClick={() => exportXLSX('BeanLedger-supplier-reconciliation', 'Supplier Inventory Reconciliation', headers, exportRows, ['Total', '', '', '', '', '', total])}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
      <Button variant="outline" className="gap-2" onClick={() => exportPDF('Supplier Inventory Reconciliation', headers, exportRows, ['Total', '', '', '', '', '', total])}><FileText className="h-4 w-4" />PDF</Button>
    </>
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex flex-wrap justify-end gap-2">{exportActions}</div>
      ) : (
        <PageHeader title="Supplier Inventory Reconciliation" description="Received inventory less samples and processing, including approved adjustments">
          {exportActions}
        </PageHeader>
      )}

      <div className="mb-5 flex flex-col gap-4 border-y border-border bg-muted/20 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-md space-y-1.5"><Label>Search</Label><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Supplier or coffee type" /></div>
        <p className="text-sm"><span className="text-muted-foreground">Total remaining</span> <strong className="ml-2 text-lg">{fmt(total)} KG</strong></p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table className="min-w-[780px]"><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Coffee type</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Samples</TableHead><TableHead className="text-right">Processing</TableHead><TableHead className="text-right">Adjustment</TableHead><TableHead className="text-right">Remaining KG</TableHead></TableRow></TableHeader><TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No supplier inventory matches this search.</TableCell></TableRow>}
          {rows.map((row) => <TableRow key={row.supplierName}><TableCell className="font-medium">{row.supplierName}</TableCell><TableCell>{row.coffeeType}</TableCell><TableCell className="text-right">{fmt(row.netCoffeeKg)}</TableCell><TableCell className="text-right text-red-700">-{fmt(row.samplesKg)}</TableCell><TableCell className="text-right text-red-700">-{fmt(row.processedKg)}</TableCell><TableCell className={`text-right ${row.adjustmentKg < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{row.adjustmentKg > 0 ? '+' : ''}{fmt(row.adjustmentKg)}</TableCell><TableCell className="text-right font-bold">{fmt(row.availableKg)}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </div>
  );
}
