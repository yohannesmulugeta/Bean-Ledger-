import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';

export default function AuditRecordBanner({ issueTitle, recordId, onFindRecord, recordFound, onDismiss }) {
  if (!issueTitle && !recordId) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-800 leading-tight">
            Opened from Data Audit
          </p>
          {issueTitle && <p className="text-xs text-blue-700 mt-0.5 truncate">{issueTitle}</p>}
          {recordFound === false && (
            <p className="text-xs text-amber-700 mt-1 font-medium">
              Record not found. It may be archived, deleted, or hidden by current filters. Clear filters and search again.
            </p>
          )}
          {recordFound === true && (
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              Record found and highlighted below.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onFindRecord && (
          <Button
            size="sm"
            variant="outline"
            className="bg-white border-blue-300 text-blue-700 hover:bg-blue-100 h-7 text-xs gap-1"
            onClick={onFindRecord}
          >
            Find Record
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDismiss}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}