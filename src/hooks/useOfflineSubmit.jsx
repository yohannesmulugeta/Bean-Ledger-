import { useState, useCallback } from 'react';
import React from 'react';
import { WifiOff } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { enqueueOfflineAction } from '@/lib/offlineQueue';

/**
 * useOfflineSubmit — handles form submission with offline queueing for low-risk modules.
 *
 * Usage:
 *   const { offlineSubmit, OfflineDialog } = useOfflineSubmit({
 *     entityName: 'SampleLog',
 *     userEmail: user?.email,
 *     onQueued: () => { /* refresh UI * / },
 *   });
 *
 *   const handleSubmit = (data) => {
 *     offlineSubmit(data, {
 *       online: () => createMutation.mutate(data),
 *     });
 *   };
 *
 * When offline: queues the action and shows a "draft saved" toast.
 * When online: calls the provided online handler.
 */
export default function useOfflineSubmit(options = {}) {
  const { entityName, userEmail, onQueued } = /** @type {any} */ (options);
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);
  const [showQueueSuccess, setShowQueueSuccess] = useState(false);

  const offlineSubmit = useCallback(
    (data, { online, actionType = /** @type {'create'|'update'} */ ('create') }) => {
      if (navigator.onLine) {
        online();
      } else {
        // Queue the action locally
        enqueueOfflineAction({
          action_type: actionType,
          entity_name: entityName,
          payload: data,
          local_temp_id: `temp_${Date.now()}`,
          user_email: userEmail || 'unknown',
        });
        setShowQueueSuccess(true);
        onQueued?.();
      }
    },
    [entityName, userEmail, onQueued],
  );

  const OfflineDialog = useCallback(
    () => (
      <>
        <AlertDialog open={showOfflineDialog} onOpenChange={setShowOfflineDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <WifiOff className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <AlertDialogTitle>You are offline</AlertDialogTitle>
              <AlertDialogDescription className="text-sm space-y-2">
                <p>This record cannot be saved until connection is restored.</p>
                <p className="text-muted-foreground">Your form data is preserved — you can retry when you're back online.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowOfflineDialog(false)}>
                I understand
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showQueueSuccess} onOpenChange={setShowQueueSuccess}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <WifiOff className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <AlertDialogTitle>Draft saved for sync</AlertDialogTitle>
              <AlertDialogDescription className="text-sm space-y-2">
                <p>Your {entityName?.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} has been saved locally and will sync automatically when your connection returns.</p>
                <p className="text-muted-foreground">You'll see it in your list with a "Pending Sync" badge.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowQueueSuccess(false)}>
                Got it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    ),
    [showOfflineDialog, showQueueSuccess, entityName],
  );

  return { offlineSubmit, OfflineDialog };
}
