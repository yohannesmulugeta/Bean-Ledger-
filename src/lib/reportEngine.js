// ─── BeanLedger Coffee ERP — Unified Report Engine ──────────────────────────────────
// Provides: exportReportPDF(), exportReportExcel(), and helper utilities
// All exports use consistent BeanLedger branding, formatting, and layout.

import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// ═══ CONSTANTS ══════════════════════════════════════════════════════════════════
const COMPANY_NAME = 'BeanLedger Import Export';
const COMPANY_TAGLINE = 'Coffee Supply Chain ERP';
const BRAND_PRIMARY = [31, 42, 36];         // #1F2A24 - dark green-black
const BRAND_BRASS = [176, 141, 87];        // #B08D57 - brass accent
const BRAND_LIGHT_GREEN = [240, 247, 240]; // #F0F7F0 - alternating row bg
const BRAND_DARK_GREEN_HEX = '126433';
const BRAND_BRASS_HEX = 'F06721';

// ═══ FORMATTING HELPERS ════════════════════════════════════════════════════════

export function fmtMoney(val, currency = 'ETB') {
  if (val == null || isNaN(val)) return '';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtKg(val) {
  if (val == null || isNaN(val)) return '';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtBags(val) {
  if (val == null || isNaN(val)) return '';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtPercent(val) {
  if (val == null || isNaN(val)) return '';
  return Number(val).toFixed(1) + '%';
}

export function fmtDate(val) {
  if (!val) return '';
  try { return format(new Date(val), 'dd/MM/yyyy'); } catch { return String(val); }
}

export function fmtDateTime(val) {
  if (!val) return '';
  try { return format(new Date(val), 'dd/MM/yyyy HH:mm'); } catch { return String(val); }
}

function fmtCell(val, colIndex, options = {}) {
  const { moneyCols = [], kgCols = [], bagCols = [], pctCols = [], dateCols = [] } = options;
  if (val == null || val === '') return '';
  if (moneyCols.includes(colIndex)) return fmtMoney(val);
  if (kgCols.includes(colIndex)) return fmtKg(val);
  if (bagCols.includes(colIndex)) return fmtBags(val);
  if (pctCols.includes(colIndex)) return fmtPercent(val);
  if (dateCols.includes(colIndex)) return fmtDate(val);
  return String(val);
}

// ═══ COLUMN DETECTION ══════════════════════════════════════════════════════════

export function isNonSummableHeader(header) {
  const h = String(header || '').toLowerCase();
  const skipPatterns = ['#', 'no', 'code', 'date', 'reference', 'ref', 'name', 'unit price', 'price/', 'rate', 'margin', 'percent', '%', 'status', 'type', 'remark', 'note', 'country', 'grade', 'buyer', 'buyer name', 'supplier name', 'agent', 'region', 'coffee type', 'payment terms', 'registrar', 'period', 'duration', 'phone', 'email', 'role', 'action', 'docs', 'history', 'grn', 'dispatch no', 'pi number', 'contract no'];
  return skipPatterns.some(p => h.includes(p));
}

export function isNumericColumn(header, sampleValues) {
  if (isNonSummableHeader(header)) return false;
  const numericCount = sampleValues.filter(v => v != null && v !== '' && !isNaN(parseFloat(v))).length;
  return numericCount >= sampleValues.length * 0.7;
}

// ═══ FILENAME & FILTER SUMMARY ═════════════════════════════════════════════════

export function sanitizeFilename(name) {
  return String(name || 'report')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

export function buildReportFilename(title, dateRange) {
  const base = sanitizeFilename(title);
  const date = format(new Date(), 'yyyy-MM-dd');
  return `BeanLedger_${base}_${date}`;
}

export function buildFilterSummary(filters = {}) {
  const parts = [];
  if (filters.dateFrom && filters.dateTo) parts.push(`Period: ${filters.dateFrom} — ${filters.dateTo}`);
  else if (filters.dateFrom) parts.push(`From: ${filters.dateFrom}`);
  else if (filters.dateTo) parts.push(`To: ${filters.dateTo}`);
  if (filters.supplier && filters.supplier !== 'all') parts.push(`Supplier: ${filters.supplier}`);
  if (filters.buyer) parts.push(`Buyer: ${filters.buyer}`);
  if (filters.coffeeType) parts.push(`Coffee: ${filters.coffeeType}`);
  if (filters.status && filters.status !== 'all') parts.push(`Status: ${filters.status}`);
  if (filters.search) parts.push(`Search: "${filters.search}"`);
  if (filters.region) parts.push(`Region: ${filters.region}`);
  return parts.join('  |  ');
}

// ═══ CORE EXPORT ENGINE ════════════════════════════════════════════════════════

/**
 * @param {Object} config
 * @param {string} config.title - Report title
 * @param {string} [config.subtitle] - Subtitle / date range
 * @param {string} [config.filename] - Base filename (no ext)
 * @param {string[]} config.headers - Column headers
 * @param {Array[]} config.rows - Row data (each row is an array)
 * @param {Array} [config.totals] - Totals row array
 * @param {Object} [config.filters] - Active filters for summary line
 * @param {string} [config.generatedBy] - User name who generated
 * @param {string} [config.dateRange] - Human-readable date range
 * @param {'portrait'|'landscape'} [config.orientation] - PDF orientation (default: landscape for >6 cols)
 * @param {Object} [config.formatting] - Column format hints
 * @param {number[]} [config.formatting.moneyCols] - Money column indices
 * @param {number[]} [config.formatting.kgCols] - KG column indices
 * @param {number[]} [config.formatting.bagCols] - Bag column indices
 * @param {number[]} [config.formatting.pctCols] - Percent column indices
 * @param {number[]} [config.formatting.dateCols] - Date column indices
 */
export function exportReportPDF(config) {
  const {
    title, subtitle, filename, headers, rows, totals = null,
    filters = {}, generatedBy, dateRange, orientation,
    formatting = {},
  } = config;

  const hasManyCols = headers.length > 6;
  const orient = orientation || (hasManyCols ? 'landscape' : 'portrait');
  const doc = new jsPDF({ orientation: orient });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  // ── Page counter ref ──────────────────────────────────────────────────────
  const pageNums = { current: 1 };

  // ── Header band ───────────────────────────────────────────────────────────
  function drawPageHeader() {
    // Green top bar
    doc.setFillColor(...BRAND_PRIMARY);
    doc.rect(0, 0, pageW, 20, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('BeanLedger', margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(200, 230, 210);
    doc.text('IMPORT & EXPORT  ·  ETHIOPIA', margin + 18, 11);

    // Orange sub-bar
    doc.setFillColor(...BRAND_BRASS);
    doc.rect(0, 20, pageW, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    const titleText = title.length > 60 ? title.slice(0, 57) + '...' : title;
    doc.text(titleText.toUpperCase(), margin, 27);

    // Meta line (right side)
    const genDate = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 230, 210);
    doc.text(`Generated: ${genDate}`, pageW - margin, 27, { align: 'right' });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  function drawFooter() {
    doc.setFillColor(248, 248, 245);
    doc.rect(0, pageH - 9, pageW, 9, 'F');
    doc.setDrawColor(...BRAND_PRIMARY);
    doc.setLineWidth(0.4);
    doc.line(0, pageH - 9, pageW, pageH - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`${COMPANY_NAME} · ${COMPANY_TAGLINE} · Confidential`, margin, pageH - 4);
    doc.text(`Page ${pageNums.current}`, pageW - margin, pageH - 4, { align: 'right' });
  }

  // ── Subtitle section ──────────────────────────────────────────────────────
  let y = 38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);

  if (subtitle) {
    doc.text(subtitle, margin, y);
    y += 5;
  }
  if (dateRange) {
    doc.text(`Period: ${dateRange}`, margin, y);
    y += 5;
  }
  const filterText = buildFilterSummary(filters);
  if (filterText) {
    doc.text(`Filters: ${filterText}`, margin, y);
    y += 5;
  }
  if (generatedBy) {
    doc.text(`Generated by: ${generatedBy}`, margin, y);
    y += 5;
  }

  y += 3;

  // ── Table ─────────────────────────────────────────────────────────────────
  const colCount = headers.length;
  const colWidth = (pageW - margin * 2) / colCount;
  const rowH = 6.5;
  const { moneyCols = [], kgCols = [], pctCols = [], bagCols = [], dateCols = [] } = formatting;

  function isNumCol(idx) {
    return idx > 0 && !isNonSummableHeader(headers[idx]);
  }

  function drawTableHeader() {
    doc.setFillColor(...BRAND_PRIMARY);
    doc.rect(margin, y, pageW - margin * 2, rowH + 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    headers.forEach((h, i) => {
      const align = isNumCol(i) ? 'right' : 'left';
      const x = align === 'right' ? margin + (i + 1) * colWidth - 2 : margin + i * colWidth + 1.5;
      doc.text(String(h).toUpperCase(), x, y + 5, { align });
    });
    y += rowH + 1;
  }

  drawTableHeader();

  // ── Data rows + optional totals ───────────────────────────────────────────
  const allRows = totals ? [...rows, totals] : rows;
  allRows.forEach((row, ri) => {
    // Page break check
    if (y > pageH - 20) {
      drawFooter();
      pageNums.current++;
      doc.addPage();
      drawPageHeader();
      y = 38;
      drawTableHeader();
    }

    const isTotalsRow = totals && ri === allRows.length - 1;

    // Row background
    if (isTotalsRow) {
      doc.setFillColor(...BRAND_BRASS);
      doc.rect(margin, y, pageW - margin * 2, rowH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
    } else if (ri % 2 === 0) {
      doc.setFillColor(...BRAND_LIGHT_GREEN);
      doc.rect(margin, y, pageW - margin * 2, rowH, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 30, 30);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, pageW - margin * 2, rowH, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 30, 30);
    }

    // Cells
    row.forEach((cell, ci) => {
      const align = isNumCol(ci) ? 'right' : 'left';
      const x = align === 'right' ? margin + (ci + 1) * colWidth - 2 : margin + ci * colWidth + 1.5;
      const str = String(cell ?? '');
      // Truncate long strings
      const maxChars = align === 'right' ? 18 : 22;
      const display = str.length > maxChars ? str.slice(0, maxChars - 1) + '…' : str;
      doc.text(display, x, y + 4.5, { align });
    });

    // Separator line
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.1);
    doc.line(margin, y + rowH, margin + (pageW - margin * 2), y + rowH);
    y += rowH;
  });

  drawFooter();
  pageNums.current++;

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveName = filename ? sanitizeFilename(filename) : buildReportFilename(title, dateRange);
  doc.save(`${saveName}.pdf`);
}

// ═══ EXCEL EXPORT ══════════════════════════════════════════════════════════════

export function exportReportExcel(config) {
  const {
    title, subtitle, filename, headers, rows, totals = null,
    filters = {}, generatedBy, dateRange,
    formatting = {},
  } = config;

  const genDate = format(new Date(), 'dd/MM/yyyy HH:mm');
  const filterText = buildFilterSummary(filters);
  const { moneyCols = [], kgCols = [], bagCols = [], pctCols = [] } = formatting;

  // Build header rows
  const titleRows = [
    [COMPANY_NAME.toUpperCase()],
    [title],
  ];
  if (subtitle) titleRows.push([subtitle]);
  if (dateRange) titleRows.push([`Period: ${dateRange}`]);
  if (filterText) titleRows.push([`Filters: ${filterText}`]);
  if (generatedBy) titleRows.push([`Generated by: ${generatedBy}`]);
  titleRows.push([`Generated: ${genDate}`]);
  titleRows.push([]);
  titleRows.push(headers);

  // Data rows — preserve codes as text
  const dataRows = rows.map(row =>
    row.map((cell, ci) => {
      const str = String(cell ?? '');
      // Detect codes/references: keep as text, never convert to number
      if (str.match(/[A-Za-z-]/) && str.length >= 2) return str;
      // Numeric values
      if (!isNaN(parseFloat(str)) && str !== '') return parseFloat(str);
      return str;
    })
  );

  // Totals row
  if (totals) {
    const totalsRow = totals.map((cell, ci) => {
      const str = String(cell ?? '');
      if (!isNaN(parseFloat(str)) && str !== '') return parseFloat(str);
      return str;
    });
    dataRows.push(totalsRow);
  }

  const aoa = [...titleRows, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ── Column widths ─────────────────────────────────────────────────────────
  const numCols = headers.length;
  ws['!cols'] = headers.map((h, ci) => {
    let max = String(h).length;
    rows.forEach(r => { const v = r[ci]; if (v != null) max = Math.max(max, String(v).length); });
    if (totals) { const v = totals[ci]; if (v != null) max = Math.max(max, String(v).length); }
    return { wch: Math.min(Math.max(max + 3, 12), 55) };
  });

  // ── Freeze header row ─────────────────────────────────────────────────────
  const headerRowIdx = titleRows.length;
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx, topLeftCell: XLSX.utils.encode_cell({ r: headerRowIdx, c: 0 }), activePane: 'bottomLeft' };

  // ── Styling ───────────────────────────────────────────────────────────────
  const totalRows = aoa.length;
  const totalsRowIdx = totals ? totalRows - 1 : -1;

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };

      const isNumCol = !isNonSummableHeader(headers[c]);

      if (r === headerRowIdx) {
        // Header row — dark green bg, white text
        ws[ref].s = {
          fill: { fgColor: { rgb: BRAND_DARK_GREEN_HEX } },
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        };
      } else if (r < headerRowIdx - 1) {
        // Title rows
        ws[ref].s = {
          font: { bold: r === 0, sz: r === 0 ? 13 : r === 1 ? 11 : 9, color: { rgb: r === 0 ? BRAND_DARK_GREEN_HEX : r <= 3 ? '333333' : '888888' } },
        };
      } else if (r === headerRowIdx - 1) {
        // Spacer row
        ws[ref].s = { font: { sz: 4 } };
      } else if (r === totalsRowIdx) {
        // Totals row — orange
        ws[ref].s = {
          fill: { fgColor: { rgb: BRAND_BRASS_HEX } },
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
          alignment: { horizontal: isNumCol ? 'right' : 'left' },
        };
      } else {
        // Data rows
        const dataRowNum = r - headerRowIdx;
        const isAlt = dataRowNum % 2 === 1;
        ws[ref].s = {
          fill: { fgColor: { rgb: isAlt ? 'F0F7F0' : 'FFFFFF' } },
          alignment: { horizontal: isNumCol && typeof ws[ref].v === 'number' ? 'right' : 'left' },
        };
        // Number formatting for numeric columns
        if (typeof ws[ref].v === 'number') {
          if (moneyCols.includes(c)) ws[ref].z = '#,##0.00';
          else if (kgCols.includes(c)) ws[ref].z = '#,##0.00';
          else if (bagCols.includes(c)) ws[ref].z = '#,##0';
          else if (pctCols.includes(c)) ws[ref].z = '0.0%';
          else ws[ref].z = '#,##0.00';
        }
      }
    }
  }

  // ── Sheet & save ──────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const sheetName = (title || 'Report').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const saveName = filename ? sanitizeFilename(filename) : buildReportFilename(title, dateRange);
  XLSX.writeFile(wb, `${saveName}.xlsx`);
}

// ═══ CONVENIENCE: Single export call ═══════════════════════════════════════════

/**
 * Unified export dispatcher
 * @param {Object} config - Report configuration
 * @param {'pdf' | 'xlsx' | 'both'} format
 */
export function exportReport(config, format = 'both') {
  if (format === 'pdf' || format === 'both') {
    try { exportReportPDF(config); } catch (e) {
      console.error('PDF export failed:', e);
      throw new Error('Could not export PDF report. Please try again.');
    }
  }
  if (format === 'xlsx' || format === 'both') {
    try { exportReportExcel(config); } catch (e) {
      console.error('Excel export failed:', e);
      throw new Error('Could not export Excel report. Please try again.');
    }
  }
}

// ═══ BACKWARD COMPAT: wrappers matching old exportUtils API ════════════════════

export function exportXLSX(filename, reportTitle, headers, rows, totalsRow, dateRange) {
  exportReportExcel({
    title: reportTitle,
    filename: filename,
    headers: headers,
    rows: rows,
    totals: totalsRow,
    dateRange: dateRange,
    formatting: detectFormatting(headers, rows),
  });
}

export function exportPDF(title, headers, rows, totalsRow) {
  exportReportPDF({
    title: title,
    filename: title.replace(/\s+/g, '_'),
    headers: headers,
    rows: rows,
    totals: totalsRow,
    formatting: detectFormatting(headers, rows),
  });
}

// ── Auto-detect formatting from headers ─────────────────────────────────────
function detectFormatting(headers, rows) {
  const moneyCols = [];
  const kgCols = [];
  const bagCols = [];
  const pctCols = [];
  const dateCols = [];

  headers.forEach((h, i) => {
    const hl = String(h || '').toLowerCase();
    if (hl.includes('etb') || hl.includes('price') || hl.includes('cost') || hl.includes('revenue') || hl.includes('profit') || hl.includes('paid') || hl.includes('balance') || hl.includes('total') || hl.includes('amount') || hl.includes('sales') || hl.includes('expense')) {
      moneyCols.push(i);
    } else if ((hl.includes('kg') || hl.includes('weight')) && !hl.includes('price') && !hl.includes('unit')) {
      kgCols.push(i);
    } else if (hl.includes('bag') && !hl.includes('price') && !hl.includes('cost')) {
      bagCols.push(i);
    } else if (hl.includes('%') || hl.includes('margin') || hl.includes('rate')) {
      pctCols.push(i);
    } else if (hl.includes('date') && !hl.includes('expected')) {
      dateCols.push(i);
    }
  });

  return { moneyCols, kgCols, bagCols, pctCols, dateCols };
}