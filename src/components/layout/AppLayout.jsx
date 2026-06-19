import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import PWAUpdatePrompt from '@/components/shared/PWAUpdatePrompt';
import SyncStatusPanel from '@/components/shared/SyncStatusPanel';
import OfflineModeNotice from '@/components/shared/OfflineModeNotice';
import useOfflineSync from '@/hooks/useOfflineSync';
import { useRole, ROLES } from '@/lib/role-hooks';
import PendingApprovalScreen from '@/components/PendingApprovalScreen';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import EnvironmentWarning from '@/components/shared/EnvironmentWarning';

export default function AppLayout() {
  const { role } = useRole();
  const { logout } = useAuth();
  const { queue, isSyncing, pendingCount, retryAction, clearFailed } = useOfflineSync();

  if (role === ROLES.UNASSIGNED) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <PendingApprovalScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 min-w-0 max-w-full flex flex-col pb-16 lg:pb-0 overflow-x-hidden" style={{ isolation: 'isolate' }}>
        {/* Top header bar */}
        <header className="sticky top-0 z-30 h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-8 gap-3 shadow-sm">
          <OfflineIndicator />
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Demo only
            <span className="font-normal text-amber-700">not production auth</span>
          </div>
          <div className="flex-1" />
          <NotificationBell />
          <Button variant="outline" size="sm" onClick={() => logout(true)} className="h-8 gap-1">
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </Button>
        </header>
        <main className="flex-1 min-w-0 max-w-full overflow-x-hidden">
          <div className="px-3 sm:p-4 lg:p-8 min-w-0">
            <EnvironmentWarning />
            {pendingCount > 0 && (
              <SyncStatusPanel
                queue={queue}
                isSyncing={isSyncing}
                onRetry={retryAction}
                onClearFailed={clearFailed}
              />
            )}
            {!navigator.onLine && <OfflineModeNotice compact={pendingCount === 0} />}
            <Outlet />
          </div>
        </main>
        <PWAUpdatePrompt />
        <footer className="border-t border-border bg-card px-6 py-3 text-center text-xs text-muted-foreground">
          BeanLedger Export — Coffee Export Operations Platform
        </footer>
      </div>
    </div>
  );
}
