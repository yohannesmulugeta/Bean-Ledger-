export const MODULES = Object.freeze({
  dashboard: { key: 'dashboard', label: 'Dashboard', category: 'Operations', path: '/' },
  purchase_registration: { key: 'purchase_registration', label: 'Coffee Purchase Intake', category: 'Operations', path: '/purchase-registration' },
  warehouse_receipt: { key: 'warehouse_receipt', label: 'Warehouse Receiving', category: 'Operations', path: '/warehouse-receipt' },
  sample_log: { key: 'sample_log', label: 'Quality Sample Register', category: 'Operations', path: '/sample-log' },
  processing_log: { key: 'processing_log', label: 'Coffee Processing Register', category: 'Operations', path: '/processing-log' },
  output_report: { key: 'output_report', label: 'Processing Yield Report', category: 'Operations', path: '/output-report' },
  export_contracts: { key: 'export_contracts', label: 'Export Contracts', category: 'Export & Inventory', path: '/export-contracts' },
  buyer_inspections: { key: 'buyer_inspections', label: 'Buyer Quality Inspections', category: 'Export & Inventory', path: '/buyer-inspections' },
  stock_report: {
    key: 'stock_report',
    label: 'Inventory & Stock',
    category: 'Export & Inventory',
    path: '/stock-report',
    aliases: ['/supplier-remaining-explanation'],
  },
  materials_register: { key: 'materials_register', label: 'Packaging & Materials Inventory', category: 'Export & Inventory', path: '/materials-register' },
  bag_ledger: { key: 'bag_ledger', label: 'Bag Inventory Ledger', category: 'Export & Inventory', path: '/bag-ledger' },
  reports: { key: 'reports', label: 'Reporting & Analytics', category: 'Reports', path: '/reports' },
  purchase_orders_report: { key: 'purchase_orders_report', label: 'Purchase Analysis', category: 'Reports', path: '/purchase-orders-report' },
  warehouse_receipt_report: { key: 'warehouse_receipt_report', label: 'Warehouse Receipt Analysis', category: 'Reports', path: '/warehouse-receipt-report' },
  activity_log: {
    key: 'activity_log',
    label: 'Audit & User Activity',
    category: 'Reports',
    path: '/activity-log',
    aliases: ['/user-report'],
  },
  notification_history: { key: 'notification_history', label: 'Notification History', category: 'Notifications', path: '/notification-history' },
  notification_settings: { key: 'notification_settings', label: 'Notification Preferences', category: 'Notifications', path: '/notification-settings' },
  master_data: { key: 'master_data', label: 'Supplier & Reference Data', category: 'Administration', path: '/master-data' },
  users_roles: {
    key: 'users_roles',
    label: 'Users & Access',
    category: 'Administration',
    path: '/users-management',
    aliases: ['/permissions'],
  },
  data_audit: { key: 'data_audit', label: 'Data Quality Audit', category: 'Administration', path: '/data-audit' },
  adjustment_center: { key: 'adjustment_center', label: 'Inventory Adjustments', category: 'Administration', path: '/adjustment-center' },
  year_close: { key: 'year_close', label: 'Fiscal Period Close', category: 'Reports', path: '/year-close' },
  commission_report: { key: 'commission_report', label: 'Agent Commission Statement', category: 'Reports', path: '/commission-report' },
  backup_center: { key: 'backup_center', label: 'Data Export & Recovery', category: 'Administration', path: '/backup-center' },
});

export const ROUTE_TO_MODULE = Object.freeze(Object.fromEntries(
  Object.values(MODULES).flatMap((module) => [module.path, ...('aliases' in module ? module.aliases : [])].map((path) => [path, module.key])),
));

export const NAV_GROUPS = Object.freeze([
  { id: 'home', label: 'Dashboard', icon: 'LayoutDashboard', direct: '/', items: [] },
  {
    id: 'purchase', label: 'Operations', icon: 'ClipboardList', title: 'Coffee Operations', items: [
      ['purchase_registration', 'ClipboardList'],
      ['warehouse_receipt', 'PackageCheck'],
      ['sample_log', 'FlaskConical'],
      ['processing_log', 'Factory'],
      ['output_report', 'BarChart3'],
    ],
  },
  {
    id: 'export', label: 'Inventory', icon: 'Ship', title: 'Export & Inventory', items: [
      ['export_contracts', 'Ship'],
      ['buyer_inspections', 'ShieldCheck'],
      ['stock_report', 'Boxes'],
      ['bag_ledger', 'Layers'],
      ['materials_register', 'Package'],
    ],
  },
  {
    id: 'reports', label: 'Reports', icon: 'FileBarChart2', title: 'Reports & Controls', items: [
      ['reports', 'FileBarChart2'],
      ['purchase_orders_report', 'ClipboardList'],
      ['warehouse_receipt_report', 'PackageCheck'],
      ['commission_report', 'HandCoins'],
      ['year_close', 'CalendarCheck'],
      ['activity_log', 'Activity'],
    ],
  },
  {
    id: 'admin', label: 'Settings', icon: 'Database', title: 'Administration', items: [
      ['master_data', 'Database'],
      ['users_roles', 'Users'],
      ['users_roles', 'Lock', 'Role Permissions', '/permissions'],
      ['data_audit', 'ShieldCheck'],
      ['adjustment_center', 'Scale'],
      ['backup_center', 'DatabaseBackup'],
      ['notification_settings', 'Bell'],
    ],
  },
]);

export const REPORT_WORKSPACE_MODULES = Object.freeze([
  'reports',
  'purchase_orders_report',
  'warehouse_receipt_report',
  'commission_report',
  'year_close',
]);

export function modulePaths(module) {
  return [module.path, ...('aliases' in module ? module.aliases : [])];
}
