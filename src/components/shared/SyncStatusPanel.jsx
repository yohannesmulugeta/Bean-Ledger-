import React from 'react';
import { Clock, AlertTriangle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SyncStatusPanel — shows the offline sync queue status.
 * Pending / Syncing / Failed / Synced items.
 */
export default function SyncStatusPanel({ queue = [], isSyncing, onRetry, onClearFailed }) {
  if (queue.length === 0) return null;

  const pending = queue.filter(a => a.status === 'pending');
  const syncing = queue.filter(a => a.status === 'syncing');
  const failed = queue.filter(a => a.status === 'failed');

  return (
    <div className="bg-card border-2 border-amber-200 rounded-xl shadow-sm p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        {isSyncing ? (
          <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
        ) : failed.length > 0 ? (
          <XCircle className="w-4 h-4 text-destructive" />
        ) : (
          <Clock className="w-4 h-4 text-amber-600" />
        )}
        <h3 className="text-sm font-semibold text-foreground">Offline Sync Queue</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {pending.length} pending · {syncing.length} syncing · {failed.length} failed
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {queue.filter(a => a.status !== 'synced').map(action => {
          const isPending = action.status === 'pending';
          const isSyncing = action.status === 'syncing';
          const isFailed = action.status === 'failed';

          return (
            <div
              key={action.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${
                isFailed ? 'bg-destructive/5 border-destructive/20' :
                isSyncing ? 'bg-amber-50 border-amber-200' :
                'bg-muted/30 border-border'
              }`}
            >
              {isPending && <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
              {isSyncing && <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin flex-shrink-0" />}
              {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {action.action_type === 'create' ? 'New' : 'Edit'} {action.entity_name?.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                {action.payload?.supplier_name && (
                  <p className="text-muted-foreground truncate">{action.payload.supplier_name}</p>
                )}
                {isFailed && action.error_message && (
                  <p className="text-destructive text-[10px] mt-0.5">{action.error_message}</p>
                )}
              </div>

              {isFailed && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => onRetry && onRetry(action.id)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-destructive"
                    onClick={() => {
                      if (window.confirm('Discard this failed record?')) {
                        onClearFailed && onClearFailed(action.id);
                      }
                    }}
                  >
                    <XCircle className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {isSyncing && (
                <span className="text-[10px] text-amber-600 font-medium flex-shrink-0">Syncing…</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}