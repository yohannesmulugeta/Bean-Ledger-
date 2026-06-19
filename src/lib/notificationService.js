// @ts-nocheck
import { notificationService } from '@/services/notificationService';

async function createDemoNotification(payload) {
  // Phase 11 intentionally does not send Telegram/email or call Base44 functions.
  // Real external delivery belongs to a later production notification phase.
  const existing = await notificationService.list({ includeArchived: true });
  if (payload.entity_id && existing.some((item) => item.type === payload.type && item.entity_id === payload.entity_id)) {
    return null;
  }
  return null;
}

export async function notifyNewPurchase(record) {
  return createDemoNotification({
    type: 'new_purchase',
    title: `New purchase - ${record.coffee_code || ''}`,
    message: `${record.supplier_name || 'Supplier'} purchase was recorded in demo mode.`,
    link_path: '/purchase-registration',
    severity: 'info',
    entity_type: 'PurchaseRecord',
    entity_id: record.id,
  });
}

export async function notifyPaymentRecorded(record, payment) {
  return createDemoNotification({
    type: 'payment_recorded',
    title: `Payment recorded - ${record.supplier_name || ''}`,
    message: `${Number(payment.amount_etb || 0).toLocaleString()} ETB recorded in demo mode.`,
    link_path: '/reports',
    severity: 'info',
    entity_type: 'PurchaseRecord',
    entity_id: record.id,
  });
}

export async function notifyFullyPaid(record) {
  return createDemoNotification({
    type: 'fully_paid',
    title: `${record.supplier_name || 'Supplier'} fully paid`,
    message: 'Demo payment balance reached paid status.',
    link_path: '/reports',
    severity: 'info',
    entity_type: 'PurchaseRecord',
    entity_id: record.id,
  });
}

export async function notifyWarehouseReceipt(receipt, shrinkage) {
  return createDemoNotification({
    type: 'warehouse_confirmed',
    title: `Warehouse confirmed - ${receipt.coffee_code || ''}`,
    message: `Demo receipt recorded. Shrinkage: ${Number(shrinkage || 0).toLocaleString()} KG.`,
    link_path: '/warehouse-receipt',
    severity: shrinkage < -500 ? 'warning' : 'info',
    entity_type: 'WarehouseReceipt',
    entity_id: receipt.id,
  });
}

export async function notifyLowStock(supplierName, remainingKg) {
  return createDemoNotification({
    type: remainingKg <= 0 ? 'stock_empty' : 'low_stock',
    title: remainingKg <= 0 ? `Stock empty - ${supplierName}` : `Low stock - ${supplierName}`,
    message: `${supplierName} has ${Number(remainingKg || 0).toLocaleString()} KG remaining in demo mode.`,
    link_path: '/stock-report',
    severity: remainingKg <= 0 ? 'critical' : 'warning',
  });
}

export async function notifyOutputReport(report) {
  return createDemoNotification({
    type: 'output_report',
    title: `Output report - ${report.supplier_name || report.date || ''}`,
    message: `${Number(report.total_kg_processed || 0).toLocaleString()} KG processed in demo mode.`,
    link_path: '/output-report',
    severity: Number(report.reject_pct || 0) > 25 ? 'warning' : 'info',
    entity_type: 'OutputReport',
    entity_id: report.id,
  });
}

export async function notifyExportContract(contract) {
  return createDemoNotification({
    type: 'export_contract',
    title: `Export contract - ${contract.contract_no || ''}`,
    message: 'Demo export contract notification recorded locally only.',
    link_path: '/export-contracts',
    severity: Number(contract.profit_etb || 0) < 0 ? 'critical' : 'info',
    entity_type: 'ExportContract',
    entity_id: contract.id,
  });
}
