import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEMO_DATA_VERSION,
  DEMO_META,
  freshDemoStore,
  seedAdditionalCosts,
  seedAnnualReportingPeriods,
  seedAttachments,
  seedAuditLogs,
  seedBackupExports,
  seedBagReceipts,
  seedBuyerInspections,
  seedExportContractCosts,
  seedExportContractMaterials,
  seedExportContractPayments,
  seedExportContracts,
  seedMaterialMovements,
  seedMaterialRegisterEntries,
  seedNotificationPreferences,
  seedNotifications,
  seedOutputReports,
  seedPayments,
  seedProcessingLogs,
  seedPurchases,
  seedRejectBagUsages,
  seedSampleLogs,
  seedStockAdjustments,
  seedSupplierBagPayments,
  seedSupplierBagReturns,
  seedSupplierBagSettlements,
  seedSuppliers,
  seedWarehouseHistory,
  seedWarehouseReceipts,
  seedYearEndStockAdjustments,
} from '../src/services/demoData.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = path.join(root, 'supabase', 'seed.sql');
const profileId = DEMO_META.profileId;
const organizationId = DEMO_META.organizationId;

function sqlValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Cannot serialize non-finite number: ${value}`);
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "'{}'::text[]";
    return `array[${value.map((item) => sqlValue(String(item))).join(', ')}]::text[]`;
  }
  if (typeof value === 'object') {
    return `${sqlValue(JSON.stringify(value))}::jsonb`;
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function insertRows(table, rows, columns, jsonColumns = []) {
  if (!rows.length) return '';
  const values = rows.map((row) => `  (${columns.map((column) => (
    jsonColumns.includes(column)
      ? `${sqlValue(JSON.stringify(row[column] ?? null))}::jsonb`
      : sqlValue(row[column])
  )).join(', ')})`).join(',\n');
  return `insert into public.${table} (\n  ${columns.join(', ')}\n) values\n${values};\n`;
}

const roles = [
  ['70000001-0000-4000-8000-000000000001', 'admin', 'System Administrator'],
  ['70000001-0000-4000-8000-000000000002', 'purchaser', 'Procurement Officer'],
  ['70000001-0000-4000-8000-000000000003', 'warehouse', 'Warehouse Controller'],
  ['70000001-0000-4000-8000-000000000004', 'export', 'Export Operations Officer'],
  ['70000001-0000-4000-8000-000000000005', 'finance', 'Finance Officer'],
];

const permissionDefinitions = [
  ['dashboard.view', 'View management dashboard', 'dashboard', 'view'],
  ['suppliers.view', 'View supplier master data', 'suppliers', 'view'],
  ['suppliers.manage', 'Manage supplier master data', 'suppliers', 'manage'],
  ['purchases.view', 'View purchase records', 'purchases', 'view'],
  ['purchases.manage', 'Manage purchase records', 'purchases', 'manage'],
  ['warehouse.view', 'View warehouse receipts', 'warehouse', 'view'],
  ['warehouse.manage', 'Manage warehouse receipts', 'warehouse', 'manage'],
  ['processing.view', 'View processing operations', 'processing', 'view'],
  ['processing.manage', 'Manage processing operations', 'processing', 'manage'],
  ['exports.view', 'View export contracts', 'exports', 'view'],
  ['exports.manage', 'Manage export contracts', 'exports', 'manage'],
  ['finance.view', 'View financial reports', 'finance', 'view'],
  ['finance.manage', 'Manage payments and costs', 'finance', 'manage'],
  ['reports.view', 'View operational reports', 'reports', 'view'],
  ['governance.manage', 'Manage fiscal close and adjustments', 'governance', 'manage'],
  ['administration.manage', 'Manage users and system settings', 'administration', 'manage'],
];

const permissions = permissionDefinitions.map((definition, index) => ({
  id: `70000002-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  key: definition[0],
  label: definition[1],
  module_key: definition[2],
  action_key: definition[3],
}));

const store = freshDemoStore();
const stockMovements = store.stockMovements;

const sections = [];
sections.push(`-- BeanLedger Export PLC realistic fictional demo dataset.\n-- Dataset version: ${DEMO_DATA_VERSION}\n-- Coverage: January 2024 through July 2026. All business rows are marked is_demo=true.\n\nbegin;\n`);
sections.push(`insert into auth.users (\n  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data\n) values (\n  ${sqlValue(profileId)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',\n  ${sqlValue(DEMO_META.profileEmail)}, extensions.crypt('password', extensions.gen_salt('bf')),\n  '2024-01-01T06:00:00Z', '2024-01-01T06:00:00Z', '2024-01-01T06:00:00Z',\n  '{"provider":"email","providers":["email"],"is_demo":true}'::jsonb,\n  ${sqlValue(JSON.stringify({ full_name: 'Selamawit Bekele', is_demo: true }))}::jsonb\n);\n`);
sections.push(`insert into public.organizations (id, name, slug, base44_id, is_demo, created_at, updated_at) values\n  (${sqlValue(organizationId)}, ${sqlValue(DEMO_META.companyName)}, 'beanledger-export-plc', null, true, '2024-01-01T06:00:00Z', '2024-01-01T06:00:00Z');\n`);
sections.push(`insert into public.profiles (id, email, full_name, role_key, is_active, status, base44_id, is_demo, created_at, updated_at) values\n  (${sqlValue(profileId)}, ${sqlValue(DEMO_META.profileEmail)}, 'Selamawit Bekele', 'admin', true, 'active', null, true, '2024-01-01T06:00:00Z', '2024-01-01T06:00:00Z');\n`);
sections.push(`insert into public.roles (id, organization_id, key, label, is_demo, created_at, updated_at) values\n${roles.map((role) => `  (${sqlValue(role[0])}, ${sqlValue(organizationId)}, ${sqlValue(role[1])}, ${sqlValue(role[2])}, true, '2024-01-01T06:00:00Z', '2024-01-01T06:00:00Z')`).join(',\n')};\n`);
sections.push(insertRows('permissions', permissions.map((permission) => ({ ...permission, is_demo: true, created_at: '2024-01-01T06:00:00Z', updated_at: '2024-01-01T06:00:00Z' })), ['id', 'key', 'label', 'module_key', 'action_key', 'is_demo', 'created_at', 'updated_at']));
sections.push(`insert into public.role_permissions (id, organization_id, role_id, permission_id, allowed, created_at, updated_at) values\n${permissions.map((permission, index) => `  ('70000003-0000-4000-8000-${String(index + 1).padStart(12, '0')}', ${sqlValue(organizationId)}, '${roles[0][0]}', '${permission.id}', true, '2024-01-01T06:00:00Z', '2024-01-01T06:00:00Z')`).join(',\n')};\n`);
sections.push(`insert into public.organization_memberships (id, organization_id, profile_id, role_id, status, is_demo, created_at, updated_at) values\n  ('70000004-0000-4000-8000-000000000001', ${sqlValue(organizationId)}, ${sqlValue(profileId)}, '${roles[0][0]}', 'active', true, '2024-01-01T06:00:00Z', '2024-01-01T06:00:00Z');\n`);
sections.push(`insert into public.app_settings (id, organization_id, key, value, description, created_at, updated_at) values\n  ('70000005-0000-4000-8000-000000000001', ${sqlValue(organizationId)}, 'demo_dataset_version', ${sqlValue(JSON.stringify(DEMO_DATA_VERSION))}::jsonb, 'Canonical realistic fictional dataset version', '2024-01-01T06:00:00Z', '2024-01-01T06:00:00Z');\n`);

sections.push(insertRows('suppliers', seedSuppliers, ['id', 'organization_id', 'base44_id', 'is_demo', 'supplier_name', 'region', 'agent', 'coffee_type', 'opening_stock_kg', 'phone_number', 'coffee_origin', 'station_name', 'agreement_date', 'agreement_expiry_date', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('purchase_records', seedPurchases, ['id', 'organization_id', 'supplier_id', 'base44_id', 'is_demo', 'coffee_code', 'purchase_date', 'supplier_name', 'agent', 'region', 'coffee_type', 'net_dispatch_weight_kg', 'warehouse_received_kg', 'unit_price_etb_per_feresula', 'commission_percent', 'remark', 'archive_reason', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('purchase_additional_costs', seedAdditionalCosts, ['id', 'purchase_record_id', 'base44_id', 'is_demo', 'name', 'amount_etb', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('purchase_payments', seedPayments, ['id', 'purchase_record_id', 'base44_id', 'is_demo', 'payment_no', 'payment_date', 'amount_etb', 'bank_name', 'cpv_reference', 'created_at', 'updated_at', 'archived_at']));
sections.push(`${seedPurchases.map((purchase) => `select public.recalculate_purchase_record('${purchase.id}');`).join('\n')}\n`);
sections.push(insertRows('warehouse_receipts', seedWarehouseReceipts, ['id', 'organization_id', 'purchase_record_id', 'supplier_id', 'base44_id', 'receipt_number', 'coffee_code', 'supplier_name', 'received_date', 'dispatch_kg', 'received_kg', 'shortage_kg', 'warehouse_name', 'status', 'notes', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('warehouse_receipt_history', seedWarehouseHistory, ['id', 'warehouse_receipt_id', 'organization_id', 'action_type', 'changes', 'reason', 'is_demo', 'created_at']));
sections.push(insertRows('sample_logs', seedSampleLogs, ['id', 'organization_id', 'supplier_id', 'purchase_record_id', 'warehouse_receipt_id', 'base44_id', 'sample_type', 'supplier_name', 'coffee_type', 'coffee_code', 'sample_date', 'sample_datetime', 'sample_kg', 'company_recipient', 'keeper_name', 'remark', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('processing_logs', seedProcessingLogs, ['id', 'organization_id', 'supplier_id', 'purchase_record_id', 'warehouse_receipt_id', 'base44_id', 'entry_type', 'entry_mode', 'processing_date', 'supplier_name', 'coffee_type', 'coffee_code', 'bags_sent', 'kg_sent', 'actual_weighed_kg', 'batch_variance_kg', 'batch_no', 'remark', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('output_reports', seedOutputReports, ['id', 'organization_id', 'processing_log_id', 'supplier_id', 'base44_id', 'entry_type', 'start_date', 'end_date', 'supplier_name', 'coffee_type', 'total_kg_processed', 'export_bags', 'export_kg', 'reject_bags', 'reject_kg', 'waste_kg', 'reject_pct', 'waste_pct', 'export_status', 'registrar_name', 'remark', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('export_contracts', seedExportContracts, ['id', 'organization_id', 'output_report_id', 'supplier_id', 'base44_id', 'contract_no', 'contract_pi_number', 'certificate_no', 'contract_date', 'stock_pool', 'coffee_type', 'coffee_grade', 'destination_country', 'buyer_name', 'payment_terms', 'custom_payment_terms', 'expected_payment_date', 'export_bags', 'export_kg', 'export_sample_kg', 'actual_shipped_kg', 'pricing_method', 'price_per_lb_usd', 'price_per_kg_usd', 'total_lb', 'contract_rate_etb', 'rate_status', 'rate_confirmed_date', 'total_export_value_usd', 'total_export_value_etb', 'total_materials_etb', 'total_costs_etb', 'reject_sales_etb', 'grand_total_revenue_etb', 'profit_etb', 'profit_usd', 'profit_margin_pct', 'total_received_usd', 'total_received_etb', 'balance_etb', 'payment_status', 'status', 'remark', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('export_contract_costs', seedExportContractCosts, ['id', 'organization_id', 'export_contract_id', 'base44_id', 'name', 'amount_etb', 'is_demo']));
sections.push(insertRows('export_contract_materials', seedExportContractMaterials, ['id', 'organization_id', 'export_contract_id', 'base44_id', 'name', 'quantity', 'unit_cost_etb', 'total_cost_etb', 'is_demo']));
sections.push(insertRows('export_contract_payments', seedExportContractPayments, ['id', 'organization_id', 'export_contract_id', 'base44_id', 'payment_date', 'amount_usd', 'actual_rate_etb', 'amount_etb', 'bank_name', 'reference_no', 'note', 'is_demo']));
sections.push(insertRows('buyer_inspections', seedBuyerInspections, ['id', 'organization_id', 'export_contract_id', 'base44_id', 'inspection_date', 'buyer_name', 'coffee_type', 'kg_to_inspect', 'sample_kg_taken', 'result', 'kg_approved', 'linked_contract_no', 'rejection_reason', 'kg_rejected', 'action_taken', 'notes', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('bag_receipts', seedBagReceipts, ['id', 'organization_id', 'supplier_id', 'purchase_record_id', 'warehouse_receipt_id', 'base44_id', 'receipt_mode', 'agent_name', 'supplier_name', 'date', 'warehouse_received_kg', 'bags_received', 'source', 'note', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('reject_bag_usages', seedRejectBagUsages, ['id', 'organization_id', 'supplier_id', 'base44_id', 'reject_mode', 'agent_name', 'supplier_name', 'date', 'bags_used', 'amount_etb', 'note', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('supplier_bag_returns', seedSupplierBagReturns, ['id', 'organization_id', 'supplier_id', 'base44_id', 'agent_name', 'supplier_name', 'return_date', 'bags_returned', 'note', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('supplier_bag_payments', seedSupplierBagPayments, ['id', 'organization_id', 'supplier_id', 'base44_id', 'agent_name', 'supplier_name', 'payment_date', 'bank_name', 'branch_account', 'reference_no', 'payment_type', 'amount_etb', 'note', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('supplier_bag_settlements', seedSupplierBagSettlements, ['id', 'organization_id', 'supplier_id', 'base44_id', 'agent_name', 'supplier_name', 'settlement_date', 'bags_received_adjustment', 'bags_used_adjustment', 'loss_percent_override', 'bags_returned', 'bags_returned_date', 'bags_returned_count', 'bags_returned_note', 'cash_paid', 'cash_paid_date', 'note', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('material_register_entries', seedMaterialRegisterEntries, ['id', 'organization_id', 'export_contract_id', 'base44_id', 'category', 'date', 'item_type', 'bag_size', 'entry_type', 'item_name', 'quantity', 'unit_cost_etb', 'total_cost_etb', 'purpose', 'note', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('material_movements', seedMaterialMovements, ['id', 'organization_id', 'material_register_entry_id', 'export_contract_id', 'item_key', 'movement_type', 'quantity', 'unit_cost_etb', 'total_cost_etb', 'occurred_at', 'notes', 'is_demo', 'created_at', 'archived_at']));
sections.push(insertRows('attachments', seedAttachments, ['id', 'organization_id', 'base44_id', 'entity_type', 'entity_id', 'section', 'section_ref', 'original_filename', 'storage_bucket', 'storage_path', 'mime_type', 'file_size_bytes', 'description', 'uploaded_by', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('notifications', seedNotifications, ['id', 'organization_id', 'base44_id', 'is_demo', 'recipient_profile_id', 'recipient_email', 'recipient_role', 'title', 'message', 'type', 'severity', 'link_path', 'read_at', 'created_at', 'archived_at']));
sections.push(insertRows('notification_preferences', seedNotificationPreferences, ['id', 'organization_id', 'profile_id', 'user_email', 'disabled_types', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('stock_adjustments', seedStockAdjustments, ['id', 'organization_id', 'adjustment_no', 'adjustment_date', 'target_type', 'supplier_id', 'supplier_name', 'coffee_type', 'quantity_kg', 'reason', 'notes', 'status', 'is_demo', 'created_at', 'updated_at', 'archived_at']));
sections.push(insertRows('annual_reporting_periods', seedAnnualReportingPeriods, ['id', 'organization_id', 'period_label', 'start_date', 'end_date', 'status', 'snapshot', 'warnings', 'closed_at', 'closed_by', 'is_demo', 'created_at', 'updated_at', 'archived_at'], ['warnings']));
sections.push(insertRows('year_end_stock_adjustments', seedYearEndStockAdjustments, ['id', 'organization_id', 'annual_reporting_period_id', 'stock_adjustment_id', 'target_type', 'supplier_name', 'coffee_type', 'quantity_kg', 'is_demo', 'created_at', 'created_by']));
sections.push(insertRows('backup_exports', seedBackupExports, ['id', 'organization_id', 'export_scope', 'from_date', 'to_date', 'file_name', 'row_count', 'status', 'is_demo', 'created_at', 'created_by']));
sections.push(insertRows('stock_movements', stockMovements, ['id', 'organization_id', 'supplier_id', 'purchase_record_id', 'warehouse_receipt_id', 'source_type', 'source_id', 'movement_type', 'stock_pool', 'coffee_type', 'quantity_kg', 'occurred_at', 'notes', 'is_demo', 'created_at', 'archived_at']));
sections.push(insertRows('audit_logs', seedAuditLogs, ['id', 'organization_id', 'profile_id', 'base44_id', 'is_demo', 'action_type', 'entity_table', 'entity_id', 'record_description', 'reason', 'changes', 'created_at', 'archived_at']));
sections.push('\ncommit;\n');

const generated = sections.filter(Boolean).join('\n').replaceAll('\r\n', '\n');
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const existing = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf8').replaceAll('\r\n', '\n') : '';
  if (existing !== generated) {
    console.error(`Supabase seed is out of date. Run: npm run demo:seed:generate`);
    process.exit(1);
  }
  console.log(`Supabase seed matches ${DEMO_DATA_VERSION}.`);
} else {
  fs.writeFileSync(seedPath, generated, 'utf8');
  console.log(`Generated ${path.relative(root, seedPath)} for ${DEMO_DATA_VERSION}.`);
}
