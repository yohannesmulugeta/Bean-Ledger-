// @ts-nocheck
import React from 'react';
import { Lock } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { DEFAULT_ROLE_ROUTES, ROLE_LABELS } from '@/lib/role-hooks';

export default function PermissionsPage() {
  const visibleRoles = ['admin', 'purchaser', 'warehouse_keeper', 'process_manager', 'export_manager', 'auditor'];

  return (
    <div className="space-y-6">
      <PageHeader title="Permissions" description="Read-only demo permission overview" />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Permission editing is disabled in this demo. The route guard uses local default role maps only; real RLS-backed role management is future Supabase Auth work.
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Demo routes</th>
            </tr>
          </thead>
          <tbody>
            {visibleRoles.map((role) => (
              <tr key={role} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{ROLE_LABELS[role] || role}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{(DEFAULT_ROLE_ROUTES[role] || []).join(', ') || 'No routes'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <Lock className="mt-1 h-5 w-5 text-amber-600" />
          <div>
            <p className="font-semibold">Permission writes disabled</p>
            <p className="mt-1 text-sm text-muted-foreground">No demo UI can change credentials, user roles, RLS policies, or production permissions.</p>
            <Button type="button" variant="outline" size="sm" disabled className="mt-3">
              Save permissions unavailable in demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
