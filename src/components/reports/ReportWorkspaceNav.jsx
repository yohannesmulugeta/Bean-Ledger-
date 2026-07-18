import React from 'react';
import { NavLink } from 'react-router-dom';
import { MODULES, REPORT_WORKSPACE_MODULES } from '@/lib/appModules';
import { useRole } from '@/lib/role-hooks';
import { cn } from '@/lib/utils';

export default function ReportWorkspaceNav() {
  const { allowedRoutes } = useRole();
  const items = REPORT_WORKSPACE_MODULES
    .map((key) => MODULES[key])
    .filter((module) => allowedRoutes.includes(module.path));

  if (items.length < 2) return null;

  return (
    <nav aria-label="Reporting workspace" className="mb-6 overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-1">
        {items.map((module) => (
          <NavLink
            key={module.key}
            to={module.path}
            className={({ isActive }) => cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {module.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
