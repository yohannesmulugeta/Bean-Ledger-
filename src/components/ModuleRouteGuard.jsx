import React from 'react';
import { usePermission } from '@/lib/role-hooks';
import AccessDenied from '@/components/AccessDenied';

// Maps route paths to module keys for can_view enforcement
const ROUTE_TO_MODULE = {
  '/': 'dashboard',
  '/purchase-registration': 'purchase_registration',
  '/warehouse-receipt': 'warehouse_receipt',
  '/sample-log': 'sample_log',
  '/processing-log': 'processing_log',
  '/output-report': 'output_report',
  '/export-contracts': 'export_contracts',
  '/buyer-inspections': 'buyer_inspections',
  '/stock-report': 'stock_report',
  '/materials-register': 'materials_register',
  '/bag-ledger': 'bag_ledger',
  '/reports': 'reports',
  '/purchase-orders-report': 'purchase_orders_report',
  '/warehouse-receipt-report': 'warehouse_receipt_report',
  '/user-report': 'user_activity_report',
  '/activity-log': 'activity_log',
  '/notification-history': 'notification_history',
  '/notification-settings': 'notification_settings',
  '/master-data': 'master_data',
  '/users-management': 'users_roles',
  '/data-audit': 'data_audit',
  '/permissions': 'users_roles',
};

export default function ModuleRouteGuard({ children, path }) {
  const { isAdmin, isSupervisor, canManageUsers, canManagePermissions } = usePermission();
  const moduleKey = ROUTE_TO_MODULE[path];

  // Admin always passes
  if (isAdmin) return <>{children}</>;

  // Special routes
  if (path === '/users-management') {
    if (isSupervisor && canManageUsers) return <>{children}</>;
    return <AccessDenied message="You do not have permission to manage users." />;
  }
  if (path === '/permissions') {
    if (isSupervisor && canManagePermissions) return <>{children}</>;
    return <AccessDenied message="You do not have permission to manage role permissions." />;
  }
  if (path === '/data-audit') {
    // Auditor can access data audit
    return <>{children}</>;
  }

  // Module-based check
  if (moduleKey) {
    return <ModuleGuard moduleKey={moduleKey}>{children}</ModuleGuard>;
  }

  // System paths: allow
  return <>{children}</>;
}

function ModuleGuard({ moduleKey, children }) {
  const { canPerform } = usePermission();

  if (!canPerform(moduleKey, 'can_view')) {
    return <AccessDenied message={`You do not have permission to access this module.`} />;
  }

  return <>{children}</>;
}