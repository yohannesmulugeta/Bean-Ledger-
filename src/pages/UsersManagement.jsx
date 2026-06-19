// @ts-nocheck
import React from 'react';
import { ShieldAlert, UserCheck } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';

export default function UsersManagement() {
  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Demo-only admin surface" />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Demo login uses one local admin account only. Supabase Auth, real invitations, role assignment, and credential changes are not connected in this demo.
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <UserCheck className="mt-1 h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Demo Admin</p>
            <p className="text-sm text-muted-foreground">demo-admin@kkgt.local</p>
            <p className="mt-2 text-xs text-muted-foreground">Role: Admin. Source: local demo session.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-1 h-5 w-5 text-amber-600" />
          <div className="space-y-2">
            <p className="font-semibold">Management actions disabled</p>
            <p className="text-sm text-muted-foreground">
              Real user creation, invites, role changes, approval flows, and security settings are blocked until Supabase Auth replaces the local demo login.
            </p>
            <Button type="button" variant="outline" size="sm" disabled>
              User management unavailable in demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
