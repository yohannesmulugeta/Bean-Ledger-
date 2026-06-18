import React, { useState } from 'react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { parsePayments } from '@/components/purchases/PaymentHistoryPanel';
import { calcTotalPaid, calcBalance, calcPaymentStatus } from '@/lib/paymentUtils';
import { toast } from 'sonner';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtNum(n) { return (n == null || isNaN(n)) ? '' : Number(n); }
function fmtDate(s) { if (!s) return ''; try { return format(new Date(s), 'dd/MM/yyyy'); } catch { return s; } }
function fmtDT(s) { if (!s) return ''; try { return format(new Date(s), 'dd/MM/yyyy HH:mm:ss'); } catch { return s; } }
function safeJson(str) { if (!str) return null; try { return JSON.parse(str); } catch { return null; } }

function buildSheet(title, headers, rows) {
  const aoa = [
    ['BeanLedger IMPORT & EXPORT'],
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
    return { wch: Math.min(Math.max(max + 2, 12), 60) };
  });
  return ws;
}

function wbToBlob(ws, sheetName) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Download a single file — try direct fetch first, then signed URL for private files
async function downloadFile(fileUrl) {
  if (!fileUrl) return null;
  // Try direct (public URL)
  try {
    const res = await fetch(fileUrl);
    if (res.ok) return await res.arrayBuffer();
  } catch { /* not public or CORS blocked */ }
  // Fallback: treat as private file_uri and create a signed URL
  try {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUrl, expires_in: 600 });
    if (signed_url) {
      const res = await fetch(signed_url);
      if (res.ok) return await res.arrayBuffer();
    }
  } catch { /* not a private URI either */ }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DownloadBackupButton() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  const handleDownload = async () => {
    setBusy(true);
    const toastId = toast.loading('Preparing backup…', { duration: Infinity });
    const upd = (msg) => { setProgress(msg); toast.loading(msg, { id: toastId, duration: Infinity }); };

    try {
      // ── Phase 1: Fetch all entities in parallel ──────────────────────────
      upd('Fetching all records…');
      const [
        suppliers, purchases, receipts, sampleLogs, processingLogs, outputReports,
        exportContracts, buyerInspections, bagReceipts, rejectUsages,
        bagReturns, bagPayments, bagSettlements, materials,
        activityLogs, wrhHistory, notifications, rolePerms, attachments,
      ] = await Promise.all([
        base44.entities.Supplier.list('supplier_name', 5000),
        base44.entities.PurchaseRecord.list('-created_date', 5000),
        base44.entities.WarehouseReceipt.list('-created_date', 5000),
        base44.entities.SampleLog.list('-created_date', 5000),
        base44.entities.ProcessingLog.list('-created_date', 5000),
        base44.entities.OutputReport.list('-date', 5000),
        base44.entities.ExportContract.list('-created_date', 5000),
        base44.entities.BuyerInspection.list('-created_date', 5000),
        base44.entities.BagReceipt.list('-date', 5000),
        base44.entities.RejectBagUsage.list('-date', 5000),
        base44.entities.SupplierBagReturn.list('-return_date', 5000),
        base44.entities.SupplierBagPayment.list('-payment_date', 5000),
        base44.entities.SupplierBagSettlement.list('supplier_name', 5000),
        base44.entities.MaterialRegisterEntry.list('-date', 5000),
        base44.entities.ActivityLog.list('-created_date', 5000),
        base44.entities.WarehouseReceiptHistory.list('-action_at', 5000),
        base44.entities.Notification.list('-created_date', 5000),
        base44.entities.RolePermission.list('role', 500),
        base44.entities.Attachment.list('-created_date', 5000),
      ]);

      const zip = new JSZip();
      const data = zip.folder('data');

      // ── Phase 2: Build Excel sheets ──────────────────────────────────────
      upd('Building Excel sheets…');

      // 01 Suppliers
      data.file('01_Suppliers.xlsx', wbToBlob(buildSheet('Suppliers', [
        'ID', 'Supplier Name', 'Region', 'Agent', 'Coffee Type', 'Opening Stock KG',
        'Phone', 'Coffee Origin', 'Station Name', 'Agreement Date', 'Expiry Date',
      ], suppliers.map(s => [
        s.id, s.supplier_name || '', s.region || '', s.agent || '', s.coffee_type || '',
        fmtNum(s.opening_stock_kg), s.phone_number || '', s.coffee_origin || '',
        s.station_name || '', fmtDate(s.agreement_date), fmtDate(s.agreement_expiry_date),
      ])), 'Suppliers'));

      // 02 Purchase Records
      data.file('02_Purchase_Records.xlsx', wbToBlob(buildSheet('Purchase Records', [
        'ID', 'Coffee Code', 'Date', 'Supplier', 'Region', 'Agent', 'Coffee Type',
        'Net Dispatch KG', 'Net Feresula', 'Unit Price ETB/Feresula', 'Commission %',
        'Commission ETB', 'Total Purchase Price', 'Other Cost ETB', 'Grand Total ETB',
        'Total Paid ETB', 'Balance ETB', 'Payment Status', 'Additional Costs (JSON)', 'Remark', 'Archived',
      ], purchases.map(p => {
        const paid = calcTotalPaid(p);
        return [
          p.id, p.coffee_code || '', fmtDate(p.purchase_date), p.supplier_name || '',
          p.region || '', p.agent || '', p.coffee_type || '',
          fmtNum(p.net_dispatch_weight_kg), fmtNum(p.net_feresula),
          fmtNum(p.unit_price_etb_per_feresula), p.commission_percent ?? '',
          fmtNum(p.commission_etb), fmtNum(p.total_purchase_price),
          fmtNum(p.other_cost_etb), fmtNum(p.grand_total_etb),
          fmtNum(paid), fmtNum(calcBalance(p.grand_total_etb, paid)),
          calcPaymentStatus(p.grand_total_etb, paid) || 'Unpaid',
          p.additional_costs || '', p.remark || '', p.archived ? 'Yes' : 'No',
        ];
      })), 'Purchase Records'));

      // 03 Purchase Payments — flattened from payment_history
      {
        const rows = [];
        purchases.forEach(p => {
          parsePayments(p).forEach(pay => rows.push([
            p.id, p.coffee_code || '', p.supplier_name || '',
            pay.payment_no || '', fmtDate(pay.payment_date),
            pay.bank_name || '', pay.branch_account || '', pay.cpv_reference || '',
            pay.payment_type || '', fmtNum(parseFloat(pay.amount_etb)), pay.note || '',
          ]));
        });
        data.file('03_Purchase_Payments.xlsx', wbToBlob(buildSheet('Purchase Payments', [
          'Purchase ID', 'Coffee Code', 'Supplier', 'Payment No', 'Date',
          'Bank', 'Branch/Account', 'CPV Ref', 'Type', 'Amount ETB', 'Note',
        ], rows), 'Purchase Payments'));
      }

      // 04 Warehouse Receipts
      data.file('04_Warehouse_Receipts.xlsx', wbToBlob(buildSheet('Warehouse Receipts', [
        'ID', 'Coffee Code', 'Purchase Record ID', 'Supplier', 'GRN Code', 'Dispatch No',
        'Received Date', 'Net Dispatch KG', 'Received Net KG', 'Bags Received', 'Remark', 'Archived',
      ], receipts.map(r => [
        r.id, r.coffee_code || '', r.purchase_record_id || '', r.supplier_name || '',
        r.grn_code || '', r.dispatch_no || '', fmtDate(r.received_date),
        fmtNum(r.net_dispatch_weight_kg), fmtNum(r.warehouse_received_net_kg),
        fmtNum(r.bags_received), r.remark || '', r.archived ? 'Yes' : 'No',
      ])), 'WH Receipts'));

      // 05 Sample Logs
      data.file('05_Sample_Logs.xlsx', wbToBlob(buildSheet('Sample Logs', [
        'ID', 'Type', 'Date', 'Supplier', 'Coffee Type', 'Buyer', 'Sample KG',
        'Company Recipient', 'Keeper Name', 'Export Contract No', 'Coffee Code', 'Notes', 'Archived',
      ], sampleLogs.map(s => [
        s.id, s.sample_type || '', fmtDate(s.sample_date), s.supplier_name || '',
        s.coffee_type || '', s.buyer_name || '', fmtNum(s.sample_kg),
        s.company_recipient || '', s.keeper_name || '', s.export_contract_no || '',
        s.coffee_code || '', s.notes || '', s.archived ? 'Yes' : 'No',
      ])), 'Sample Logs'));

      // 06 Processing Logs
      data.file('06_Processing_Logs.xlsx', wbToBlob(buildSheet('Processing Logs', [
        'ID', 'Type', 'Entry Mode', 'Date', 'Supplier', 'Buyer', 'Coffee Type',
        'Coffee Code', 'Batch No', 'Bags Sent', 'KG Sent', 'Actual Weighed KG',
        'Variance KG', 'Inspection Ref', 'Remark', 'Archived',
      ], processingLogs.map(p => [
        p.id, p.entry_type || 'Standard', p.entry_mode || '', fmtDate(p.date),
        p.supplier_name || '', p.buyer_name || '', p.coffee_type || '',
        p.coffee_code || '', p.batch_no || '',
        fmtNum(p.bags_sent), fmtNum(p.kg_sent), fmtNum(p.actual_weighed_kg),
        fmtNum(p.batch_variance_kg), p.inspection_ref || '',
        p.remark || '', p.archived ? 'Yes' : 'No',
      ])), 'Processing Logs'));

      // 07 Output Reports
      data.file('07_Output_Reports.xlsx', wbToBlob(buildSheet('Output Reports', [
        'ID', 'Type', 'Start Date', 'End Date', 'Supplier', 'Coffee Type',
        'Total KG Processed', 'Extra Pool1 KG', 'Export Bags', 'Export KG',
        'Reject Bags', 'Reject KG', 'Waste KG', 'Reject %', 'Waste %',
        'Export Status', 'Registrar', 'Remark', 'Archived',
      ], outputReports.map(r => [
        r.id, r.entry_type || 'Standard', fmtDate(r.start_date), fmtDate(r.end_date),
        r.supplier_name || '', r.coffee_type || '',
        fmtNum(r.total_kg_processed), fmtNum(r.additional_pool1_kg || 0),
        fmtNum(r.export_bags), fmtNum(r.export_kg),
        fmtNum(r.reject_bags), fmtNum(r.reject_kg), fmtNum(r.waste_kg),
        r.reject_pct != null ? +Number(r.reject_pct).toFixed(2) : '',
        r.waste_pct != null ? +Number(r.waste_pct).toFixed(2) : '',
        r.export_status || '', r.registrar_name || '', r.remark || '', r.archived ? 'Yes' : 'No',
      ])), 'Output Reports'));

      // 08 Export Contracts (main, all scalar fields + raw JSON for complex ones)
      data.file('08_Export_Contracts.xlsx', wbToBlob(buildSheet('Export Contracts', [
        'ID', 'Contract No', 'PI Number', 'Date', 'Export Date', 'Status', 'Stock Pool',
        'Coffee Type', 'Coffee Grade', 'Destination', 'Buyer', 'Commodity',
        'Payment Terms', 'Custom Payment Terms', 'Expected Payment Date', 'Pricing Method',
        'Export KG', 'Export Sample KG', 'Actual Shipped KG', 'Export Bags', 'Total LB',
        'Price/LB USD', 'Price/KG USD', 'Contract Rate ETB', 'Rate Status', 'Rate Confirmed Date',
        'Total Export Value USD', 'Total Export Value ETB',
        'Purchase Cost ETB', 'Commission ETB', 'Cleaning ETB', 'Recleaning ETB',
        'Packing Bag ETB', 'Bag Mark ETB', 'Bag Printing ETB', 'Loading ETB',
        'Warehouse ETB', 'Transport ETB', 'EDR/Train ETB', 'Demurrage ETB',
        'Freight ETB', 'Commission Sales ETB', 'BL/Container ETB', 'Fumigation ETB',
        'COO ETB', 'Container Picking ETB', 'ICO ETB', 'Private CO ETB',
        'Coffee Association ETB', 'Plomp ETB', 'Other Costs ETB',
        'Total Costs ETB', 'Total Materials ETB', 'Total Reject Sales ETB',
        'Grand Total Revenue ETB', 'Profit ETB', 'Profit USD', 'Profit Margin %',
        'Total Received USD', 'Total Received ETB', 'Payment Status',
        'Cost Rows (JSON)', 'Material Rows (JSON)', 'Arrival Inputs (JSON)', 'Remark',
      ], exportContracts.map(c => [
        c.id, c.contract_no || '', c.contract_pi_number || '',
        fmtDate(c.contract_date), fmtDate(c.export_date), c.status || '', c.stock_pool || '',
        c.coffee_type || '', c.coffee_grade || '', c.destination_country || '',
        c.buyer_name || '', c.commodity || '',
        c.payment_terms || '', c.custom_payment_terms || '', fmtDate(c.expected_payment_date), c.pricing_method || '',
        fmtNum(c.export_kg), fmtNum(c.export_sample_kg), fmtNum(c.actual_shipped_kg),
        fmtNum(c.export_bags), fmtNum(c.total_lb),
        fmtNum(c.price_per_lb_usd), fmtNum(c.price_per_kg_usd),
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
        fmtNum(c.coo_etb), fmtNum(c.container_picking_etb), fmtNum(c.ico_etb),
        fmtNum(c.private_co_weight_quality_etb), fmtNum(c.coffee_association_etb),
        fmtNum(c.plomp_payment_etb), fmtNum(c.other_costs_etb),
        fmtNum(c.total_costs_etb), fmtNum(c.total_materials_etb), fmtNum(c.total_reject_sales_etb),
        fmtNum(c.grand_total_revenue_etb), fmtNum(c.profit_etb), fmtNum(c.profit_usd),
        c.profit_margin_pct != null ? +Number(c.profit_margin_pct).toFixed(2) : '',
        fmtNum(c.total_received_usd), fmtNum(c.total_received_etb), c.payment_status || '',
        c.cost_rows || '', c.material_rows || '', c.arrival_inputs || '', c.remark || '',
      ])), 'Export Contracts'));

      // 09 Export Contract Payments — flattened
      {
        const rows = [];
        exportContracts.forEach(c => {
          const payments = safeJson(c.payment_history);
          if (Array.isArray(payments)) {
            payments.forEach(pay => rows.push([
              c.id, c.contract_no || '', c.buyer_name || '',
              fmtDate(pay.payment_date || pay.date || ''),
              fmtNum(parseFloat(pay.amount_usd || 0)),
              fmtNum(parseFloat(pay.amount_etb || 0)),
              pay.bank_name || pay.bank || '',
              pay.reference || pay.cpv_reference || '',
              pay.note || '',
            ]));
          }
        });
        data.file('09_Export_Payments.xlsx', wbToBlob(buildSheet('Export Payments', [
          'Contract ID', 'Contract No', 'Buyer', 'Date', 'Amount USD', 'Amount ETB', 'Bank', 'Reference', 'Note',
        ], rows), 'Export Payments'));
      }

      // 10 Export Contract Cost Rows — flattened
      {
        const rows = [];
        exportContracts.forEach(c => {
          const items = safeJson(c.cost_rows);
          if (Array.isArray(items)) {
            items.forEach((item, idx) => rows.push([
              c.id, c.contract_no || '', idx + 1, item.name || '', fmtNum(parseFloat(item.amount_etb || 0)),
            ]));
          }
        });
        data.file('10_Export_Cost_Rows.xlsx', wbToBlob(buildSheet('Export Cost Rows', [
          'Contract ID', 'Contract No', 'Row #', 'Cost Name', 'Amount ETB',
        ], rows), 'Cost Rows'));
      }

      // 11 Export Contract Material Rows — flattened
      {
        const rows = [];
        exportContracts.forEach(c => {
          const items = safeJson(c.material_rows);
          if (Array.isArray(items)) {
            items.forEach((item, idx) => rows.push([
              c.id, c.contract_no || '', idx + 1,
              item.name || '', fmtNum(parseFloat(item.quantity || 0)),
              fmtNum(parseFloat(item.unit_cost_etb || 0)),
              fmtNum((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost_etb) || 0)),
            ]));
          }
        });
        data.file('11_Export_Material_Rows.xlsx', wbToBlob(buildSheet('Export Material Rows', [
          'Contract ID', 'Contract No', 'Row #', 'Material Name', 'Quantity', 'Unit Cost ETB', 'Total ETB',
        ], rows), 'Material Rows'));
      }

      // 12 Buyer Inspections
      data.file('12_Buyer_Inspections.xlsx', wbToBlob(buildSheet('Buyer Inspections', [
        'ID', 'Date', 'Buyer', 'Coffee Type', 'KG to Inspect', 'Sample KG Taken',
        'Result', 'KG Approved', 'KG Rejected', 'Rejection Reason', 'Action Taken',
        'Linked Contract No', 'Notes',
      ], buyerInspections.map(b => [
        b.id, fmtDate(b.inspection_date), b.buyer_name || '', b.coffee_type || '',
        fmtNum(b.kg_to_inspect), fmtNum(b.sample_kg_taken), b.result || '',
        fmtNum(b.kg_approved), fmtNum(b.kg_rejected),
        b.rejection_reason || '', b.action_taken || '', b.linked_contract_no || '', b.notes || '',
      ])), 'Buyer Inspections'));

      // 13 Bag Receipts
      data.file('13_Bag_Receipts.xlsx', wbToBlob(buildSheet('Bag Receipts', [
        'ID', 'Mode', 'Date', 'Agent', 'Supplier', 'Bags Received', 'WH Received KG', 'Source', 'Note', 'Archived',
      ], bagReceipts.map(r => [
        r.id, r.receipt_mode || '', fmtDate(r.date), r.agent_name || '', r.supplier_name || '',
        fmtNum(r.bags_received), fmtNum(r.warehouse_received_kg), r.source || '',
        r.note || '', r.archived ? 'Yes' : 'No',
      ])), 'Bag Receipts'));

      // 14 Reject Bag Usages
      data.file('14_Reject_Bag_Usages.xlsx', wbToBlob(buildSheet('Reject Bag Usages', [
        'ID', 'Mode', 'Date', 'Agent', 'Supplier', 'Bags Used', 'Amount ETB', 'Note',
      ], rejectUsages.map(r => [
        r.id, r.reject_mode || '', fmtDate(r.date), r.agent_name || '', r.supplier_name || '',
        fmtNum(r.bags_used), fmtNum(r.amount_etb), r.note || '',
      ])), 'Reject Usages'));

      // 15 Bag Returns
      data.file('15_Bag_Returns.xlsx', wbToBlob(buildSheet('Bag Returns', [
        'ID', 'Return Date', 'Supplier', 'Agent', 'Bags Returned', 'Note',
      ], bagReturns.map(r => [
        r.id, fmtDate(r.return_date), r.supplier_name || '', r.agent_name || '',
        fmtNum(r.bags_returned), r.note || '',
      ])), 'Bag Returns'));

      // 16 Bag Payments
      data.file('16_Bag_Payments.xlsx', wbToBlob(buildSheet('Bag Payments', [
        'ID', 'Date', 'Supplier', 'Agent', 'Bank', 'Branch/Account', 'Reference', 'Type', 'Amount ETB', 'Note',
      ], bagPayments.map(p => [
        p.id, fmtDate(p.payment_date), p.supplier_name || '', p.agent_name || '',
        p.bank_name || '', p.branch_account || '', p.reference_no || '',
        p.payment_type || '', fmtNum(p.amount_etb), p.note || '',
      ])), 'Bag Payments'));

      // 17 Bag Settlements
      data.file('17_Bag_Settlements.xlsx', wbToBlob(buildSheet('Bag Settlements', [
        'ID', 'Supplier', 'Bags Received Adj', 'Bags Used Adj', 'Loss % Override',
        'Bags Returned', 'Bags Returned Date', 'Bags Returned Count', 'Note',
      ], bagSettlements.map(s => [
        s.id, s.supplier_name || '',
        fmtNum(s.bags_received_adjustment), fmtNum(s.bags_used_adjustment),
        fmtNum(s.loss_percent_override),
        s.bags_returned ? 'Yes' : 'No', fmtDate(s.bags_returned_date),
        fmtNum(s.bags_returned_count), s.note || '',
      ])), 'Bag Settlements'));

      // 18 Materials Register
      data.file('18_Materials_Register.xlsx', wbToBlob(buildSheet('Materials Register', [
        'ID', 'Category', 'Date', 'Entry Type', 'Item Type', 'Bag Size',
        'Item Name', 'Quantity', 'Unit Cost ETB', 'Total Cost ETB', 'Purpose', 'Note',
      ], materials.map(m => [
        m.id, m.category || '', fmtDate(m.date), m.entry_type || '',
        m.item_type || '', m.bag_size || '', m.item_name || '',
        fmtNum(m.quantity), fmtNum(m.unit_cost_etb), fmtNum(m.total_cost_etb),
        m.purpose || '', m.note || '',
      ])), 'Materials'));

      // 19 Activity Log
      data.file('19_Activity_Log.xlsx', wbToBlob(buildSheet('Activity Log', [
        'ID', 'Date/Time', 'User', 'Action', 'Screen', 'Entity Type', 'Entity ID', 'Description', 'Reason', 'Changes (JSON)',
      ], activityLogs.map(l => [
        l.id, fmtDT(l.created_date), l.user_email || '', l.action_type || '',
        l.screen_name || '', l.entity_type || '', l.entity_id || '',
        l.record_description || '', l.reason || '', l.changes || '',
      ])), 'Activity Log'));

      // 20 Warehouse Receipt History
      data.file('20_WH_Receipt_History.xlsx', wbToBlob(buildSheet('WH Receipt History', [
        'ID', 'Receipt ID', 'Coffee Code', 'Supplier', 'GRN Code', 'Action', 'User', 'User Role', 'Action At', 'Reason', 'Changes (JSON)',
      ], wrhHistory.map(h => [
        h.id, h.receipt_id || '', h.coffee_code || '', h.supplier_name || '', h.grn_code || '',
        h.action_type || '', h.user_email || '', h.user_role || '', fmtDT(h.action_at),
        h.reason || '', h.changes || '',
      ])), 'WH Receipt History'));

      // 21 Notifications
      data.file('21_Notifications.xlsx', wbToBlob(buildSheet('Notifications', [
        'ID', 'Created', 'Recipient Email', 'Recipient Role', 'Type', 'Title', 'Message', 'Severity', 'Is Read', 'Link Path',
      ], notifications.map(n => [
        n.id, fmtDT(n.created_date), n.recipient_email || '', n.recipient_role || '',
        n.type || '', n.title || '', n.message || '', n.severity || '',
        n.is_read ? 'Yes' : 'No', n.link_path || '',
      ])), 'Notifications'));

      // 22 Role Permissions
      data.file('22_Role_Permissions.xlsx', wbToBlob(buildSheet('Role Permissions', [
        'ID', 'Role', 'Allowed Paths (JSON)',
      ], rolePerms.map(r => [r.id, r.role || '', r.allowed_paths || ''])), 'Role Permissions'));

      // 23 Attachments Index
      data.file('23_Attachments_Index.xlsx', wbToBlob(buildSheet('Attachments Index', [
        'ID', 'Entity Type', 'Entity ID', 'Section', 'Section Ref', 'File Name', 'File URL', 'Uploaded By', 'Created',
      ], attachments.map(a => [
        a.id, a.entity_type || '', a.entity_id || '', a.section || '',
        a.section_ref || '', a.file_name || '', a.file_url || '',
        a.uploaded_by || '', fmtDT(a.created_date),
      ])), 'Attachments'));

      // ── Phase 3: Download actual files ──────────────────────────────────
      const filesFolder = zip.folder('files');
      let downloaded = 0, skipped = 0;

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (!att.file_url) { skipped++; continue; }
        upd(`Downloading files (${i + 1} / ${attachments.length})…`);

        const fileData = await downloadFile(att.file_url);
        if (fileData) {
          const entityType = (att.entity_type || 'unknown').replace(/[^a-zA-Z0-9_\-]/g, '_');
          const recordId = (att.entity_id || 'unknown').replace(/[^a-zA-Z0-9_\-]/g, '_');
          const safeName = (att.file_name || `file_${att.id}`)
            .replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 200);
          filesFolder.folder(entityType).folder(recordId).file(safeName, fileData);
          downloaded++;
        } else {
          skipped++;
        }
      }

      // ── README ───────────────────────────────────────────────────────────
      zip.file('README.txt', [
        'BeanLedger IMPORT & EXPORT — Full Data Backup',
        `Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`,
        '',
        'CONTENTS',
        '  data/   — All database records as Excel (.xlsx) files (one sheet per entity)',
        '  files/  — Attached documents and images, organized as files/{entity_type}/{record_id}/filename',
        '',
        'SHEETS',
        '  01 Suppliers                   22 Role Permissions',
        '  02 Purchase Records            23 Attachments Index',
        '  03 Purchase Payments (flat)',
        '  04 Warehouse Receipts',
        '  05 Sample Logs',
        '  06 Processing Logs',
        '  07 Output Reports',
        '  08 Export Contracts',
        '  09 Export Payments (flat)',
        '  10 Export Cost Rows (flat)',
        '  11 Export Material Rows (flat)',
        '  12 Buyer Inspections',
        '  13 Bag Receipts',
        '  14 Reject Bag Usages',
        '  15 Bag Returns',
        '  16 Bag Payments',
        '  17 Bag Settlements',
        '  18 Materials Register',
        '  19 Activity Log',
        '  20 WH Receipt History',
        '  21 Notifications',
        '',
        'STATISTICS',
        `  Suppliers:           ${suppliers.length}`,
        `  Purchase Records:    ${purchases.length}`,
        `  Warehouse Receipts:  ${receipts.length}`,
        `  Processing Logs:     ${processingLogs.length}`,
        `  Output Reports:      ${outputReports.length}`,
        `  Export Contracts:    ${exportContracts.length}`,
        `  Buyer Inspections:   ${buyerInspections.length}`,
        `  Materials Entries:   ${materials.length}`,
        `  Attachments:         ${attachments.length} total — ${downloaded} files downloaded, ${skipped} skipped`,
        '',
        'NOTES',
        '  - JSON fields (payment_history, cost_rows, material_rows) are both flattened into',
        '    dedicated sheets (sheets 03, 09, 10, 11) AND preserved as raw JSON in the main sheet.',
        '  - Archived records are included and marked in the "Archived" column.',
        '  - Files that could not be downloaded (network/permission errors) are listed by URL',
        '    in the Attachments Index sheet for manual recovery.',
      ].join('\n'));

      // ── Generate ZIP ──────────────────────────────────────────────────────
      upd('Compressing ZIP…');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BeanLedger-FullBackup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Backup complete — ${attachments.length} records across 23 sheets · ${downloaded} files downloaded`,
        { id: toastId, duration: 6000 }
      );
    } catch (err) {
      console.error('Backup error:', err);
      toast.error(`Backup failed: ${err.message || 'unknown error'}`, { id: toastId, duration: 8000 });
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <Button variant="outline" onClick={handleDownload} disabled={busy} className="gap-2 min-w-[180px]">
      {busy ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Download className="w-4 h-4 shrink-0" />}
      <span className="truncate">{busy ? (progress || 'Preparing…') : 'Download Full Backup'}</span>
    </Button>
  );
}