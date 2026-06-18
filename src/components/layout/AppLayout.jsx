import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '@/components/notifications/NotificationBell';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import PWAUpdatePrompt from '@/components/shared/PWAUpdatePrompt';
import SyncStatusPanel from '@/components/shared/SyncStatusPanel';
import OfflineModeNotice from '@/components/shared/OfflineModeNotice';
import useOfflineSync from '@/hooks/useOfflineSync';
import { useRole, ROLES } from '@/lib/role-hooks';
import PendingApprovalScreen from '@/components/PendingApprovalScreen';

export default function AppLayout() {
  const { role } = useRole();
  const { queue, isSyncing, pendingCount, failedCount, retryAction, clearFailed, refresh: refreshSync } = useOfflineSync();

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
          <div className="flex-1" />
          <NotificationBell />
        </header>
        <main className="flex-1 min-w-0 max-w-full overflow-x-hidden">
          <div className="px-3 sm:p-4 lg:p-8 min-w-0">
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