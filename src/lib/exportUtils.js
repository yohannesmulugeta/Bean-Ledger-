// ── BeanLedger Export — Export Utilities ───────────────────────────────────────
// Thin wrapper over lib/reportEngine.js for backward compatibility.
// All existing pages using exportPDF / exportXLSX will automatically
// use the unified branded report engine.

import { exportReportPDF, exportReportExcel, exportReport } from './reportEngine';

export { exportReport, exportReportPDF, exportReportExcel };

// ── Backward-compatible wrappers ──────────────────────────────────────────────

export function exportXLSX(filename, reportTitle, headers, rows, totalsRow, dateRange) {
  exportReportExcel({
    title: reportTitle,
    filename: filename,
    headers: headers,
    rows: rows,
    totals: totalsRow,
    dateRange: dateRange,
  });
}

export function exportPDF(title, headers, rows, totalsRow) {
  exportReportPDF({
    title: title,
    filename: title.replace(/\s+/g, '_'),
    headers: headers,
    rows: rows,
    totals: totalsRow,
  });
}