import React from 'react';
import { Clock, WifiOff } from 'lucide-react';

/**
 * PendingSyncBadge — shows "Pending Sync" on locally queued records.
 */
export default function PendingSyncBadge({ compact = false }) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
        <Clock className="w-2.5 h-2.5" />
        Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300">
      <WifiOff className="w-3 h-3" />
      Pending Sync
    </span>
  );
}