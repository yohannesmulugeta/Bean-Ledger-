import * as XLSX from 'xlsx';
import { countSnapshotRows, filterSnapshotByDate } from './governanceCalculations.js';

function flatRows(rows) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    value && typeof value === 'object' ? JSON.stringify(value) : value,
  ])));
}

export function downloadDemoBackup({ snapshot, periods = [], scope, fromDate, toDate }) {
  const data = scope === 'full' ? snapshot : filterSnapshotByDate(snapshot, fromDate, toDate);
  const workbook = XLSX.utils.book_new();
  const sheets = {
    Suppliers: data.suppliers || [],
    Purchases: data.purchases || [],
    Warehouse: data.receipts || [],
    Samples: data.sampleLogs || [],
    Processing: data.processingLogs || [],
    Output: data.outputReports || [],
    ExportContracts: data.exportContracts || [],
    BuyerInspections: data.buyerInspections || [],
    StockAdjustments: data.stockAdjustments || [],
    AnnualPeriods: periods,
  };
  Object.entries(sheets).forEach(([name, rows]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(flatRows(rows).length ? flatRows(rows) : [{ status: 'No rows in selected period' }]), name.slice(0, 31));
  });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `BeanLedger-demo-${scope}-${stamp}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return { fileName, rowCount: countSnapshotRows(data) + periods.length };
}
