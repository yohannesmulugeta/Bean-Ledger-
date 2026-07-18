// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Lock, RefreshCw, ShieldAlert, KeyRound, CheckSquare, Settings } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DEFAULT_ROLE_ROUTES,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_LABELS,
  MODULES,
  PERMISSION_TYPES,
  useRole,
} from '@/lib/role-hooks';
import { toast } from 'sonner';

const ALL_ROUTES = [
  { path: '/', label: 'Dashboard', category: 'Operations' },
  { path: '/purchase-registration', label: 'Purchase Registration', category: 'Operations' },
  { path: '/warehouse-receipt', label: 'Warehouse Receipt', category: 'Operations' },
  { path: '/sample-log', label: 'Sample Log', category: 'Operations' },
  { path: '/processing-log', label: 'Processing Log', category: 'Operations' },
  { path: '/output-report', label: 'Output Report', category: 'Operations' },
  { path: '/export-contracts', label: 'Export Contracts', category: 'Export & Stock' },
  { path: '/buyer-inspections', label: 'Buyer Inspections', category: 'Export & Stock' },
  { path: '/stock-report', label: 'Stock Report', category: 'Export & Stock' },
  { path: '/bag-ledger', label: 'Bag Ledger', category: 'Export & Stock' },
  { path: '/materials-register', label: 'Materials Register', category: 'Export & Stock' },
  { path: '/adjustment-center', label: 'Adjustment Center', category: 'Admin' },
  { path: '/reports', label: 'Summary Reports', category: 'Reports' },
  { path: '/purchase-orders-report', label: 'Purchase Orders Report', category: 'Reports' },
  { path: '/warehouse-receipt-report', label: 'Warehouse Receipt Report', category: 'Reports' },
  { path: '/user-report', label: 'User Activity Report', category: 'Reports' },
  { path: '/activity-log', label: 'Activity Log', category: 'Reports' },
  { path: '/master-data', label: 'Master Data', category: 'Admin' },
  { path: '/permissions', label: 'Permissions Matrix', category: 'Admin' },
  { path: '/users-management', label: 'Users & Roles', category: 'Admin' },
  { path: '/data-audit', label: 'Data Audit', category: 'Admin' },
  { path: '/supplier-remaining-explanation', label: 'Supplier Balance Explanation', category: 'Reports' }
];

const ROLES = ['admin', 'supervisor', 'purchaser', 'warehouse_keeper', 'process_manager', 'final_registrar', 'export_manager', 'accountant', 'auditor', 'viewer'];

export default function PermissionsPage() {
  const { role: currentUserRole, isAdmin } = useRole();
  const [activeTab, setActiveTab] = useState('navigation');
  const [selectedRole, setSelectedRole] = useState('purchaser');
  const [routeSearch, setRouteSearch] = useState('');

  // Customized matrices
  const [customRoutes, setCustomRoutes] = useState({});
  const [customPermissions, setCustomPermissions] = useState({});
  const [customSecurity, setCustomSecurity] = useState({
    allow_supervisor_manage_users: false,
    allow_supervisor_manage_permissions: false,
  });

  // Load from localStorage or defaults
  useEffect(() => {
    try {
      const storedRoutes = localStorage.getItem('kkgt_custom_role_routes');
      if (storedRoutes) {
        setCustomRoutes(JSON.parse(storedRoutes));
      } else {
        setCustomRoutes(DEFAULT_ROLE_ROUTES);
      }

      const storedPerms = localStorage.getItem('kkgt_custom_role_permissions');
      if (storedPerms) {
        setCustomPermissions(JSON.parse(storedPerms));
      } else {
        setCustomPermissions(DEFAULT_ROLE_PERMISSIONS);
      }

      const storedSecurity = localStorage.getItem('kkgt_custom_security_settings');
      if (storedSecurity) {
        setCustomSecurity(JSON.parse(storedSecurity));
      }
    } catch (e) {
      console.error('Failed to load permissions matrices', e);
    }
  }, []);

  const handleRouteToggle = (roleKey, path) => {
    if (roleKey === 'admin') return; // Admin is locked

    setCustomRoutes((prev) => {
      const currentAllowed = prev[roleKey] || [];
      let nextAllowed;
      if (currentAllowed.includes(path)) {
        nextAllowed = currentAllowed.filter((p) => p !== path);
      } else {
        nextAllowed = [...currentAllowed, path];
      }
      const updated = { ...prev, [roleKey]: nextAllowed };
      localStorage.setItem('kkgt_custom_role_routes', JSON.stringify(updated));
      return updated;
    });
    toast.success(`Access updated for ${ROLE_LABELS[roleKey]}`);
  };

  const handlePermissionToggle = (roleKey, moduleKey, permKey) => {
    if (roleKey === 'admin') return; // Admin is locked

    setCustomPermissions((prev) => {
      const rolePerms = prev[roleKey] || {};
      const modulePerms = rolePerms[moduleKey] || {};
      const nextVal = !modulePerms[permKey];

      const updated = {
        ...prev,
        [roleKey]: {
          ...rolePerms,
          [moduleKey]: {
            ...modulePerms,
            [permKey]: nextVal,
          },
        },
      };
      localStorage.setItem('kkgt_custom_role_permissions', JSON.stringify(updated));
      return updated;
    });
    toast.success(`Permission updated for ${ROLE_LABELS[roleKey]}`);
  };

  const handleSecurityToggle = (key) => {
    setCustomSecurity((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };
      localStorage.setItem('kkgt_custom_security_settings', JSON.stringify(updated));
      return updated;
    });
    toast.success('Security setting updated');
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem('kkgt_custom_role_routes');
    localStorage.removeItem('kkgt_custom_role_permissions');
    localStorage.removeItem('kkgt_custom_security_settings');
    setCustomRoutes(DEFAULT_ROLE_ROUTES);
    setCustomPermissions(DEFAULT_ROLE_PERMISSIONS);
    setCustomSecurity({
      allow_supervisor_manage_users: false,
      allow_supervisor_manage_permissions: false,
    });
    toast.success('Permissions reset to system defaults!');
  };

  const filteredRoutes = ALL_ROUTES.filter((r) =>
    r.label.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.path.toLowerCase().includes(routeSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Permissions Matrix" description="Configure module routes and operational action privileges">
        <Button variant="outline" onClick={handleResetToDefaults} className="gap-2 border-red-200 text-red-700 hover:bg-red-50">
          <RefreshCw className="w-4 h-4" /> Reset Defaults
        </Button>
      </PageHeader>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2.5">
        <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-semibold">Interactive Demo Mode:</span> Adjusting switches updates the local workspace session configuration immediately. The sidebar navigation links and operation buttons will react in real time when simulating these user roles.
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="navigation" className="rounded-md gap-2">
            <KeyRound className="w-4 h-4" /> Navigation Access
          </TabsTrigger>
          <TabsTrigger value="operations" className="rounded-md gap-2">
            <CheckSquare className="w-4 h-4" /> Operations & Actions
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-md gap-2">
            <Settings className="w-4 h-4" /> Global Settings
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Navigation Access Routes Matrix */}
        <TabsContent value="navigation" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Role-Based Page Router Matrix</CardTitle>
              <CardDescription>Select which pages are visible in the left rail and allowed to load for each staff group.</CardDescription>
              <div className="pt-2 max-w-sm">
                <Input
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  placeholder="Filter pages..."
                  className="h-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground min-w-[200px]">Navigation Route / Page</th>
                      {ROLES.map((r) => (
                        <th key={r} className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap min-w-[100px]">
                          {ROLE_LABELS[r]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoutes.map((route) => (
                      <tr key={route.path} className="border-b border-border hover:bg-muted/35 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-foreground text-sm">{route.label}</div>
                          <div className="text-xs font-mono text-muted-foreground">{route.path}</div>
                          <Badge variant="secondary" className="mt-1 text-[9px] px-1 py-0 uppercase bg-muted/65 text-muted-foreground border-none">
                            {route.category}
                          </Badge>
                        </td>
                        {ROLES.map((r) => {
                          const isAllowed = r === 'admin' || (customRoutes[r] && customRoutes[r].includes(route.path));
                          const isDisabled = r === 'admin';
                          return (
                            <td key={r} className="px-3 py-3.5 text-center">
                              <Checkbox
                                checked={!!isAllowed}
                                onCheckedChange={() => handleRouteToggle(r, route.path)}
                                disabled={isDisabled}
                                className="mx-auto"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Operation Action Rules */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left selector */}
            <Card className="md:col-span-1">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Role to Edit</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0 space-y-1">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedRole === r
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {ROLE_LABELS[r]} {r === 'admin' && '🔑'}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Right edit grid */}
            <div className="md:col-span-3 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    Operational Permissions for <span className="text-primary font-semibold">{ROLE_LABELS[selectedRole]}</span>
                  </CardTitle>
                  <CardDescription>
                    Configure micro-action credentials for each dashboard module. Toggling switches will update form buttons and actions for this role immediately.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedRole === 'admin' ? (
                    <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
                      <KeyRound className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="font-semibold text-foreground">Admin Access is Absolute</p>
                      <p className="text-sm text-muted-foreground mt-1">Admin accounts possess master credentials. Permissions cannot be restricted.</p>
                    </div>
                  ) : (
                    Object.keys(MODULES).map((modKey) => {
                      const mod = MODULES[modKey];
                      const activePerms = customPermissions[selectedRole]?.[modKey] || {};

                      return (
                        <div key={modKey} className="border border-border rounded-xl p-4 space-y-3 bg-muted/15 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between pb-2 border-b border-border">
                            <div>
                              <span className="font-bold text-sm text-foreground">{mod.label}</span>
                              <span className="text-xs text-muted-foreground block font-mono">{mod.path}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                              {mod.category}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pt-1">
                            {PERMISSION_TYPES.map((permType) => {
                              const value = !!activePerms[permType];
                              const label = permType.replace('can_', '').replace(/_/g, ' ');

                              return (
                                <div key={permType} className="flex items-center justify-between text-xs py-1">
                                  <span className="capitalize text-muted-foreground font-medium">{label}</span>
                                  <Switch
                                    checked={value}
                                    onCheckedChange={() => handlePermissionToggle(selectedRole, modKey, permType)}
                                    size="sm"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Security & Global Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Global Policy Settings
              </CardTitle>
              <CardDescription>Enable custom policies for system administration, supervisor powers, and data locks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Allow Supervisor to Manage Users</p>
                  <p className="text-xs text-muted-foreground">Allows the supervisor role to approve, reject, deactivate, or invite staff members.</p>
                </div>
                <Switch
                  checked={customSecurity.allow_supervisor_manage_users}
                  onCheckedChange={() => handleSecurityToggle('allow_supervisor_manage_users')}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Allow Supervisor to Modify Permissions</p>
                  <p className="text-xs text-muted-foreground">Allows supervisor accounts to access this matrix page and rewrite role routes or action rules.</p>
                </div>
                <Switch
                  checked={customSecurity.allow_supervisor_manage_permissions}
                  onCheckedChange={() => handleSecurityToggle('allow_supervisor_manage_permissions')}
                />
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Note: Security overrides configured here will automatically bind to the hook contexts for active page guards.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
