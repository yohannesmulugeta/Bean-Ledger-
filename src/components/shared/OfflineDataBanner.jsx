import React from 'react';
import { Clock, WifiOff } from 'lucide-react';
import { format } from 'date-fns';

/**
 * OfflineDataBanner — shows "Showing last saved data" when data is from cache.
 * Position at the top of a data table or card list.
 *
 * @param {{ visible?: boolean, lastUpdated?: number|null }} props
 */
export default function OfflineDataBanner({ visible = false, lastUpdated = null }) {
  if (!visible) return null;

  const timeStr = lastUpdated
    ? format(new Date(lastUpdated), 'MMM d, yyyy — HH:mm')
    : 'unknown time';

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium mb-4">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>Showing last saved data</span>
      <span className="text-amber-600 text-xs ml-auto flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {timeStr}
      </span>
    </div>
  );
}
