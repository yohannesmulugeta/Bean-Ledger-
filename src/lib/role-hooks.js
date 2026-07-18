/**
 * BeanLedger Export — Role-based access control hooks.
 * Uses plain React state; no TanStack Query dependency.
 */
import { useAuth } from '@/lib/AuthContext';
import { MODULES, modulePaths } from '@/lib/appModules';

export { MODULES } from '@/lib/appModules';

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
  admin: 'Administrator',
  supervisor: 'Supervisor',
  purchaser: 'Purchaser',
  warehouse_keeper: 'Warehouse Officer',
  process_manager: 'Processing Manager',
  final_registrar: 'Output Registrar',
  export_manager: 'Export Manager',
  accountant: 'Accountant',
  auditor: 'Auditor',
  viewer: 'Viewer',
  unassigned: 'Unassigned',
};

// ── Modules and their permission types ──────────────────────────────────────
const ALL_MODULE_KEYS = Object.keys(MODULES);

export const PERMISSION_TYPES = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_archive', 'can_restore', 'can_export', 'can_import', 'can_approve', 'can_manage_payments', 'can_view_financials', 'can_manage_attachments'];

// ── Admin full access ──────────────────────────────────────────────────────
const FULL_PERMS = {};
PERMISSION_TYPES.forEach(p => { FULL_PERMS[p] = true; });

export const ADMIN_ROUTES = Object.values(MODULES).flatMap(modulePaths);

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
    adjustment_center: { can_view: true, can_export: true },
    year_close: { can_view: true, can_export: true },
    commission_report: { can_view: true, can_export: true, can_view_financials: true },
  },
  auditor: {
    dashboard: { can_view: true },
    purchase_registration: { can_view: true },
    stock_report: { can_view: true },
    reports: { can_view: true, can_export: true },
    purchase_orders_report: { can_view: true, can_export: true },
    warehouse_receipt_report: { can_view: true, can_export: true },
    activity_log: { can_view: true },
    data_audit: { can_view: true, can_export: true },
    adjustment_center: { can_view: true, can_export: true },
    year_close: { can_view: true, can_export: true },
    commission_report: { can_view: true, can_export: true },
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
  accountant: ['/', '/purchase-registration', '/export-contracts', '/stock-report', '/reports', '/purchase-orders-report', '/warehouse-receipt-report', '/bag-ledger', '/adjustment-center', '/year-close', '/commission-report'],
  auditor: ['/', '/purchase-registration', '/stock-report', '/reports', '/purchase-orders-report', '/warehouse-receipt-report', '/activity-log', '/data-audit', '/adjustment-center', '/year-close', '/commission-report'],
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
