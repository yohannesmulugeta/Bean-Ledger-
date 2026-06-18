import React from 'react';
import { useRole, usePermission } from '@/lib/role-hooks';
import AccessDenied from '@/components/AccessDenied';

export default function RoleGuard({ allowedRoles, moduleKey, action, fallback, children }) {
  const { role, isAdmin } = useRole();
  const { canPerform } = usePermission();

  if (!role) return null;

  // Role-based check (takes priority)
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (fallback) return fallback;
    return <AccessDenied />;
  }

  // Module + action permission check
  if (moduleKey && action) {
    if (!canPerform(moduleKey, action)) {
      if (fallback) return fallback;
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}

// Permission-aware wrapper for buttons/actions — hides when user lacks permission
export function PermissionGuard({ moduleKey, action, children, fallback = null }) {
  const { isAdmin } = useRole();
  const { canPerform } = usePermission();

  if (isAdmin) return <>{children}</>;
  if (!moduleKey || !action) return <>{children}</>;

  if (!canPerform(moduleKey, action)) {
    return fallback;
  }

  return <>{children}</>;
}

// Hide financial data when role lacks can_view_financials
export function FinancialGuard({ moduleKey, children, fallback }) {
  const { isAdmin } = useRole();
  const { canPerform } = usePermission();

  if (isAdmin) return <>{children}</>;

  if (moduleKey && !canPerform(moduleKey, 'can_view_financials')) {
    if (fallback) return fallback;
    return (
      <span className="text-muted-foreground/50 select-none" title="Financial data hidden">
        ••••••
      </span>
    );
  }

  return <>{children}</>;
}