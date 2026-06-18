import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2, List } from 'lucide-react';
import { getPendingCount } from '@/lib/offlineQueue';

/**
 * OfflineIndicator — shows connection status and pending sync count.
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [justRestored, setJustRestored] = useState(false);
  const [pendingCount, setPendingCount] = useState(getPendingCount());

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setJustRestored(true);
      setTimeout(() => setJustRestored(false), 5000);
    };
    const goOffline = () => {
      setOnline(false);
      setJustRestored(false);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Periodic pending count check
    const interval = setInterval(() => setPendingCount(getPendingCount()), 3000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(interval);
    };
  }, []);

  if (online && !justRestored && pendingCount === 0) return null;

  if (!online) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-medium animate-pulse">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline — showing saved data</span>
        {pendingCount > 0 && (
          <span className="bg-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
            <List className="w-3 h-3" />{pendingCount} pending
          </span>
        )}
      </div>
    );
  }

  if (justRestored && pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 border border-green-300 text-green-800 text-xs font-medium">
        <Wifi className="w-3.5 h-3.5" />
        <span>Back online</span>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Syncing {pendingCount} item{pendingCount > 1 ? 's' : ''}…</span>
      </div>
    );
  }

  if (justRestored) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 border border-green-300 text-green-800 text-xs font-medium">
        <Wifi className="w-3.5 h-3.5" />
        <span>Back online</span>
      </div>
    );
  }

  return null;
}