import React from 'react';
import { usePermission } from '@/lib/role-hooks';
import AccessDenied from '@/components/AccessDenied';
import { ROUTE_TO_MODULE } from '@/lib/appModules';

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
