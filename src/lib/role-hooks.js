/**
 * BeanLedger Export — Role-based access control hooks.
 * Uses plain React state; no TanStack Query dependency.
 */
import { useAuth } from '@/lib/AuthContext';

// ── Role constants ──────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  PURCHASER: 'purchaser',
  WAREHOUSE_KEEPER: 'warehouse_keeper',
  PROCESS_MANAGER: 'process_manager',
  FINAL_REGISTRAR: 'final_registrar',
  EXPORT_MANAGER: 'export_manager',
  ACCOUNTANT: 'accountant',
  AUDITOR: 'auditor',
  VIEWER: 'viewer',
  UNASSIGNED: 'unassigned',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  purchaser: 'Purchaser',
  warehouse_keeper: 'Warehouse Keeper',
  process_manager: 'Process Manager',
  final_registrar: 'Final Registrar',
  export_manager: 'Export Manager',
  accountant: 'Accountant',
  auditor: 'Auditor',
  viewer: 'Viewer',
  unassigned: 'Unassigned',
};

// ── Modules and their permission types ──────────────────────────────────────
export const MODULES = {
  dashboard: { key: 'dashboard', label: 'Dashboard', category: 'Operations', path: '/' },
  purchase_registration: { key: 'purchase_registration', label: 'Purchase Registration', category: 'Operations', path: '/purchase-registration' },
  warehouse_receipt: { key: 'warehouse_receipt', label: 'Warehouse Receipt', category: 'Operations', path: '/warehouse-receipt' },
  sample_log: { key: 'sample_log', label: 'Sample Log', category: 'Operations', path: '/sample-log' },
  processing_log: { key: 'processing_log', label: 'Processing Log', category: 'Operations', path: '/processing-log' },
  output_report: { key: 'output_report', label: 'Output Report', category: 'Operations', path: '/output-report' },
  export_contracts: { key: 'export_contracts', label: 'Export Contracts', category: 'Export & Stock', path: '/export-contracts' },
  buyer_inspections: { key: 'buyer_inspections', label: 'Buyer Inspections', category: 'Export & Stock', path: '/buyer-inspections' },
  stock_report: { key: 'stock_report', label: 'Stock Report', category: 'Export & Stock', path: '/stock-report' },
  materials_register: { key: 'materials_register', label: 'Materials Register', category: 'Export & Stock', path: '/materials-register' },
  bag_ledger: { key: 'bag_ledger', label: 'Bag Ledger', category: 'Export & Stock', path: '/bag-ledger' },
  reports: { key: 'reports', label: 'Summary Reports', category: 'Reports', path: '/reports' },
  purchase_orders_report: { key: 'purchase_orders_report', label: 'Purchase Orders Report', category: 'Reports', path: '/purchase-orders-report' },
  warehouse_receipt_report: { key: 'warehouse_receipt_report', label: 'Warehouse Receipt Report', category: 'Reports', path: '/warehouse-receipt-report' },
  user_activity_report: { key: 'user_activity_report', label: 'User Activity Report', category: 'Reports', path: '/user-report' },
  activity_log: { key: 'activity_log', label: 'Activity Log', category: 'Reports', path: '/activity-log' },
  notification_history: { key: 'notification_history', label: 'Notification History', category: 'Notifications', path: '/notification-history' },
  notification_settings: { key: 'notification_settings', label: 'Notification Settings', category: 'Notifications', path: '/notification-settings' },
  master_data: { key: 'master_data', label: 'Master Data', category: 'Admin', path: '/master-data' },
  users_roles: { key: 'users_roles', label: 'Users & Roles', category: 'Admin', path: '/users-management' },
  data_audit: { key: 'data_audit', label: 'Data Audit', category: 'Admin', path: '/data-audit' },
};

const ALL_MODULE_KEYS = Object.keys(MODULES);

export const PERMISSION_TYPES = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_archive', 'can_restore', 'can_export', 'can_import', 'can_approve', 'can_manage_payments', 'can_view_financials', 'can_manage_attachments'];

// ── Admin full access ──────────────────────────────────────────────────────
const FULL_PERMS = {};
PERMISSION_TYPES.forEach(p => { FULL_PERMS[p] = true; });

export const ADMIN_ROUTES = Object.values(MODULES).map(m => m.path);

const SYSTEM_PATHS = ['/notification-history', '/notification-settings'];

// ── Default permission presets per role ─────────────────────────────────────
export const DEFAULT_ROLE_PERMISSIONS = {
  admin: Object.fromEntries(ALL_MODULE_KEYS.map(k => [k, { ...FULL_PERMS }])),
  supervisor: Object.fromEntries(ALL_MODULE_KEYS.map(k => [k, { ...FULL_PERMS }])),
  purchaser: {
    dashboard: { can_view: true },
    purchase_registration: { can_view: true, can_create: true, can_edit: true, can_archive: true },
    warehouse_receipt: { can_view: true },
    sample_log: { can_view: true },
    stock_report: { can_view: true },
    bag_ledger: { can_view: true },
    reports: { can_view: true },
    purchase_orders_report: { can_view: true },
    warehouse_receipt_report: { can_view: true },
    master_data: { can_view: true },
  },
  warehouse_keeper: {
    dashboard: { can_view: true },
    warehouse_receipt: { can_view: true, can_create: true, can_edit: true },
    stock_report: { can_view: true },
    warehouse_receipt_report: { can_view: true, can_export: true },
    bag_ledger: { can_view: true },
    materials_register: { can_view: true },
  },
  process_manager: {
    dashboard: { can_view: true },
    sample_log: { can_view: true, can_create: true, can_edit: true },
    processing_log: { can_view: true, can_create: true, can_edit: true },
    output_report: { can_view: true, can_create: true, can_edit: true },
    stock_report: { can_view: true },
    reports: { can_view: true },
  },
  final_registrar: {
    dashboard: { can_view: true },
    output_report: { can_view: true, can_create: true, can_edit: true },
    buyer_inspections: { can_view: true, can_create: true },
    stock_report: { can_view: true },
    export_contracts: { can_view: true },
    reports: { can_view: true },
  },
  export_manager: {
    dashboard: { can_view: true },
    export_contracts: { can_view: true, can_create: true, can_edit: true, can_archive: true },
    buyer_inspections: { can_view: true, can_create: true, can_edit: true },
    stock_report: { can_view: true },
    materials_register: { can_view: true, can_create: true, can_edit: true },
    bag_ledger: { can_view: true },
    reports: { can_view: true, can_export: true },
    master_data: { can_view: true },
  },
  accountant: {
    dashboard: { can_view: true, can_view_financials: true },
    purchase_registration: { can_view: true, can_view_financials: true },
    export_contracts: { can_view: true, can_view_financials: true },
    stock_report: { can_view: true },
    reports: { can_view: true, can_export: true, can_view_financials: true },
    purchase_orders_report: { can_view: true, can_export: true },
    warehouse_receipt_report: { can_view: true, can_export: true },
    bag_ledger: { can_view: true },
  },
  auditor: {
    dashboard: { can_view: true },
    purchase_registration: { can_view: true },
    stock_report: { can_view: true },
    reports: { can_view: true, can_export: true },
    purchase_orders_report: { can_view: true, can_export: true },
    warehouse_receipt_report: { can_view: true, can_export: true },
    user_activity_report: { can_view: true, can_export: true },
    activity_log: { can_view: true },
    data_audit: { can_view: true, can_export: true },
  },
  viewer: {
    dashboard: { can_view: true },
    stock_report: { can_view: true },
    reports: { can_view: true },
  },
  unassigned: {},
};

// ── Default allowed paths per role (for sidebar) ───────────────────────────
export const DEFAULT_ROLE_ROUTES = {
  admin: ADMIN_ROUTES,
  supervisor: ADMIN_ROUTES,
  purchaser: ['/', '/purchase-registration', '/warehouse-receipt', '/sample-log', '/stock-report', '/master-data', '/bag-ledger', '/reports', '/purchase-orders-report', '/warehouse-receipt-report'],
  warehouse_keeper: ['/', '/warehouse-receipt', '/sample-log', '/stock-report', '/bag-ledger', '/materials-register', '/warehouse-receipt-report'],
  process_manager: ['/', '/sample-log', '/processing-log', '/output-report', '/stock-report', '/reports'],
  final_registrar: ['/', '/output-report', '/stock-report', '/export-contracts', '/buyer-inspections', '/reports'],
  export_manager: ['/', '/export-contracts', '/buyer-inspections', '/stock-report', '/materials-register', '/bag-ledger', '/master-data', '/reports'],
  accountant: ['/', '/purchase-registration', '/export-contracts', '/stock-report', '/reports', '/purchase-orders-report', '/warehouse-receipt-report', '/bag-ledger'],
  auditor: ['/', '/purchase-registration', '/stock-report', '/reports', '/purchase-orders-report', '/warehouse-receipt-report', '/user-report', '/activity-log', '/data-audit'],
  viewer: ['/', '/stock-report', '/reports'],
  unassigned: [],
};

// ── Demo user fallback (public demo — no real auth) ────────────────────────
const DEMO_USER = {
  id: 'demo-user-001',
  full_name: 'Demo Admin',
  email: 'demo@beanledgerexport.com',
  role: 'admin',
};

// ── useRole hook (no QueryClient needed — plain useState/useEffect) ────────
export function useRole() {
  const { user: authUser } = useAuth();
  const user = authUser || DEMO_USER;
  const role = user?.role || ROLES.UNASSIGNED;
  const isAdmin = role === ROLES.ADMIN;
  const isSupervisor = role === ROLES.SUPERVISOR;
  const isAdminOrSupervisor = isAdmin || isSupervisor;

  const allowedRoutes = (() => {
    if (!role) return [];
    if (isAdmin) return [...ADMIN_ROUTES, '/users-management'];
    const defaults = DEFAULT_ROLE_ROUTES[role] || [];
    return [...new Set([...defaults, ...SYSTEM_PATHS])];
  })();

  const canAccess = (path) => {
    if (!role) return false;
    return allowedRoutes.includes(path);
  };

  return {
    role,
    isAdmin,
    isSupervisor,
    isAdminOrSupervisor,
    canAccess,
    allowedRoutes,
    user,
    ready: true,
  };
}

// ── usePermission hook ─────────────────────────────────────────────────────
export function usePermission() {
  const { user: authUser } = useAuth();
  const user = authUser || DEMO_USER;
  const role = user?.role || ROLES.UNASSIGNED;
  const isAdmin = role === ROLES.ADMIN;
  const isSupervisor = role === ROLES.SUPERVISOR;

  const getSecuritySetting = (key, def = 'false') => {
    const demoSettings = {
      allow_supervisor_manage_users: 'false',
      allow_supervisor_manage_permissions: 'false',
    };
    return demoSettings[key] || def;
  };

  const getModulePerms = (moduleKey) => {
    if (!moduleKey) return {};
    if (isAdmin) return { ...FULL_PERMS };
    return DEFAULT_ROLE_PERMISSIONS[role]?.[moduleKey] || {};
  };

  const canPerform = (moduleKey, action) => {
    if (isAdmin) return true;
    const perms = getModulePerms(moduleKey);
    return !!perms[action];
  };

  const hasGlobalPermission = (perm) => {
    if (isAdmin) return true;
    if (perm === 'can_manage_users') {
      if (isSupervisor) return getSecuritySetting('allow_supervisor_manage_users') === 'true';
      return false;
    }
    if (perm === 'can_manage_permissions') {
      if (isSupervisor) return getSecuritySetting('allow_supervisor_manage_permissions') === 'true';
      return false;
    }
    if (perm === 'can_view_activity_log') {
      return isSupervisor || role === ROLES.AUDITOR;
    }
    return false;
  };

  const canManageUsers = hasGlobalPermission('can_manage_users');
  const canManagePermissions = hasGlobalPermission('can_manage_permissions');

  return {
    canPerform,
    getModulePerms,
    hasGlobalPermission,
    role,
    isAdmin,
    isSupervisor,
    canManageUsers,
    canManagePermissions,
  };
}
