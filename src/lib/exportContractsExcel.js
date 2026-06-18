import * as XLSX from 'xlsx';
import { format } from 'date-fns';

function fmtDate(s) { if (!s) return ''; try { return format(new Date(s), 'dd/MM/yyyy'); } catch { return s; } }
function fmtNum(n) { return (n == null || isNaN(n)) ? '' : Number(n); }
function safeJson(str) { if (!str) return []; try { const p = JSON.parse(str); return Array.isArray(p) ? p : []; } catch { return []; } }

function buildSheet(title, headers, rows) {
  const aoa = [
    ['BEANLEDGER EXPORT'],
    [title],
    [`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
    [],
    headers,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = headers.map((h, ci) => {
    let max = String(h).length;
    rows.forEach(r => { const v = r[ci]; if (v != null) max = Math.max(max, String(v).length); });
    return { wch: Math.min(Math.max(max + 2, 12), 55) };
  });
  return ws;
}

export function exportContractsToExcel(contracts) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Main Contract Details ──────────────────────────────────────────
  const mainHeaders = [
    'Contract No', 'PI Number', 'Cert no', 'Contract Date', 'Export Date', 'Status', 'Stock Pool',
    'Coffee Type', 'Coffee Grade', 'Destination', 'Buyer', 'Commodity',
    'Payment Terms', 'Custom Payment Terms', 'Expected Payment Date',
    'Pricing Method', 'Price/LB USD', 'Price/KG USD',
    'Export KG', 'Export Sample KG', 'Actual Shipped KG', 'Export Bags', 'Total LB',
    'Contract Rate ETB', 'Rate Status', 'Rate Confirmed Date',
    'Total Export Value USD', 'Total Export Value ETB',
    // Fixed cost fields
    'Purchase Cost ETB', 'Commission on Purchase ETB', 'Cleaning Charges ETB', 'Recleaning Charges ETB',
    'Packing Bag (Green Pro) ETB', 'Bag Mark Craft ETB', 'Bag Printing ETB',
    'Loading/Unloading ETB', 'Warehouse Expenses ETB', 'Local Transportation ETB',
    'EDR/Train Fee ETB', 'Demurrage ETB', 'Freight ETB', 'Commission on Sales ETB',
    'BL/Container Fee ETB', 'Fumigation ETB', 'COO ETB', 'Container Picking ETB',
    'ICO ETB', 'Private CO/Weight/Quality ETB', 'Coffee Association ETB', 'Plomp Payment ETB',
    'Other Costs ETB',
    // Totals
    'Total Costs ETB', 'Total Materials ETB', 'Reject Sales ETB',
    'Grand Total Revenue ETB', 'Profit ETB', 'Profit USD', 'Profit Margin %',
    // Payments
    'Total Received USD', 'Total Received ETB', 'Payment Status',
    'Remark',
  ];

  const mainRows = contracts.map(c => [
    c.contract_no || '', c.contract_pi_number || '', c.certificate_no || '',
    fmtDate(c.contract_date), fmtDate(c.export_date),
    c.status || '', c.stock_pool || '',
    c.coffee_type || '', c.coffee_grade || '', c.destination_country || '',
    c.buyer_name || '', c.commodity || '',
    c.payment_terms === 'Other' ? 'Other' : (c.payment_terms || ''),
    c.custom_payment_terms || '', fmtDate(c.expected_payment_date),
    c.pricing_method || '', fmtNum(c.price_per_lb_usd), fmtNum(c.price_per_kg_usd),
    fmtNum(c.export_kg), fmtNum(c.export_sample_kg), fmtNum(c.actual_shipped_kg),
    fmtNum(c.export_bags), fmtNum(c.total_lb),
    fmtNum(c.contract_rate_etb), c.rate_status || '', fmtDate(c.rate_confirmed_date),
    fmtNum(c.total_export_value_usd), fmtNum(c.total_export_value_etb),
    fmtNum(c.purchase_cost_etb), fmtNum(c.commission_on_purchase_etb),
    fmtNum(c.cleaning_charges_etb), fmtNum(c.recleaning_charges_etb),
    fmtNum(c.packing_bag_green_pro_etb), fmtNum(c.bag_mark_craft_etb),
    fmtNum(c.bag_printing_etb), fmtNum(c.loading_unloading_etb),
    fmtNum(c.warehouse_expenses_etb), fmtNum(c.local_transportation_etb),
    fmtNum(c.edr_clearance_train_fee_etb), fmtNum(c.demurrage_etb),
    fmtNum(c.freight_etb), fmtNum(c.commission_on_sales_etb),
    fmtNum(c.bl_container_fee_etb), fmtNum(c.fumigation_etb),
    fmtNum(c.coo_etb), fmtNum(c.container_picking_etb),
    fmtNum(c.ico_etb), fmtNum(c.private_co_weight_quality_etb),
    fmtNum(c.coffee_association_etb), fmtNum(c.plomp_payment_etb),
    fmtNum(c.other_costs_etb),
    fmtNum(c.total_costs_etb), fmtNum(c.total_materials_etb),
    fmtNum(c.reject_sales_etb ?? c.total_reject_sales_etb),
    fmtNum(c.grand_total_revenue_etb ?? c.grand_total_sales_etb),
    fmtNum(c.profit_etb ?? c.total_profit_etb),
    fmtNum(c.profit_usd),
    c.profit_margin_pct != null ? +Number(c.profit_margin_pct).toFixed(2) : '',
    fmtNum(c.total_received_usd), fmtNum(c.total_received_etb),
    c.payment_status || 'Unpaid',
    c.remark || '',
  ]);

  XLSX.utils.book_append_sheet(wb, buildSheet('Export Contracts', mainHeaders, mainRows), 'Contracts');

  // ── Sheet 2: Payment History (flattened) ─────────────────────────────────────
  const payHeaders = ['Contract No', 'PI Number', 'Buyer', 'Payment #', 'Date', 'Amount USD', 'Actual Rate ETB', 'Amount ETB', 'Bank', 'Reference No'];
  const payRows = [];
  contracts.forEach(c => {
    safeJson(c.payment_history).forEach((p, idx) => {
      const amountEtb = (parseFloat(p.amount_usd) || 0) * (parseFloat(p.actual_rate_etb) || 0);
      payRows.push([
        c.contract_no || '', c.contract_pi_number || '', c.buyer_name || '',
        idx + 1, fmtDate(p.payment_date),
        fmtNum(parseFloat(p.amount_usd)), fmtNum(parseFloat(p.actual_rate_etb)),
        fmtNum(amountEtb || parseFloat(p.amount_etb)),
        p.bank_name || '', p.reference_no || '',
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, buildSheet('Payment History', payHeaders, payRows), 'Payments');

  // ── Sheet 3: Cost Rows (flattened) ───────────────────────────────────────────
  const costHeaders = ['Contract No', 'PI Number', 'Buyer', 'Cost #', 'Cost Name', 'Amount ETB'];
  const costRows = [];
  contracts.forEach(c => {
    safeJson(c.cost_rows).forEach((r, idx) => {
      costRows.push([
        c.contract_no || '', c.contract_pi_number || '', c.buyer_name || '',
        idx + 1, r.name || '', fmtNum(parseFloat(r.amount_etb)),
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, buildSheet('Cost Breakdown', costHeaders, costRows), 'Cost Breakdown');

  // ── Sheet 4: Material Rows (flattened) ───────────────────────────────────────
  const matHeaders = ['Contract No', 'PI Number', 'Buyer', 'Material #', 'Material Name', 'Quantity', 'Unit Cost ETB', 'Total ETB'];
  const matRows = [];
  contracts.forEach(c => {
    safeJson(c.material_rows).forEach((r, idx) => {
      const total = (parseFloat(r.quantity) || 0) * (parseFloat(r.unit_cost_etb) || 0);
      matRows.push([
        c.contract_no || '', c.contract_pi_number || '', c.buyer_name || '',
        idx + 1, r.name || '',
        fmtNum(parseFloat(r.quantity)), fmtNum(parseFloat(r.unit_cost_etb)), fmtNum(total),
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, buildSheet('Material Rows', matHeaders, matRows), 'Materials');

  // ── Sheet 5: Arrival Inputs (flattened) ──────────────────────────────────────
  const arrHeaders = ['Contract No', 'PI Number', 'Buyer', 'Row #', 'Bags', 'Price ETB/Feresula', 'Feresula', 'Amount ETB'];
  const arrRows = [];
  contracts.forEach(c => {
    safeJson(c.arrival_inputs).forEach((r, idx) => {
      const bags = parseFloat(r.bags) || 0;
      const price = parseFloat(r.price_etb) || 0;
      const fer = bags * 85 / 17;
      arrRows.push([
        c.contract_no || '', c.contract_pi_number || '', c.buyer_name || '',
        idx + 1, fmtNum(bags), fmtNum(price), fmtNum(fer), fmtNum(fer * price),
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, buildSheet('Arrival Inputs', arrHeaders, arrRows), 'Arrival Inputs');

  // ── Download ─────────────────────────────────────────────────────────────────
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BeanLedger-Export-Contracts-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}