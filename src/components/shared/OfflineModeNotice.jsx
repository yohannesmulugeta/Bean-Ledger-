import React from 'react';
import { WifiOff, Info } from 'lucide-react';

/**
 * OfflineModeNotice — explains offline limitations to the user.
 * Shown in a collapsible info banner.
 */
export default function OfflineModeNotice({ compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-2 py-1 bg-muted/40 rounded-full">
        <WifiOff className="w-3 h-3" />
        <span>Offline — limited functionality</span>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-xs text-blue-800">
          <p className="font-semibold">Offline Mode — What You Can Do</p>
          <ul className="list-disc pl-4 space-y-0.5 text-blue-700">
            <li>View previously loaded records (cached for 24 hours)</li>
            <li>Draft new Sample Log, Processing Log, or Warehouse Receipt entries</li>
          </ul>
          <p className="text-blue-600">
            <strong>Requires internet:</strong> Financial actions, export contracts, bag settlements, user management, role permissions, payments, and batch codes.
          </p>
          <p className="text-blue-500">
            Pending drafts sync automatically when your connection returns.
          </p>
        </div>
      </div>
    </div>
  );
}