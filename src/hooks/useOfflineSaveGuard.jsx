import { useState, useCallback } from 'react';
import React from 'react';
import { WifiOff } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * useOfflineSaveGuard — protects write operations when offline.
 *
 * Usage:
 *   const { isOnline, guardSave } = useOfflineSaveGuard();
 *
 *   const handleSubmit = (data) => {
 *     guardSave(() => {
 *       createMutation.mutate(data);
 *     });
 *   };
 *
 * If offline: shows a dialog telling the user, keeps form open, does NOT call the callback.
 * If online: calls the callback immediately.
 */
export default function useOfflineSaveGuard() {
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const guardSave = useCallback(
    (callback) => {
      if (navigator.onLine) {
        callback();
      } else {
        setShowOfflineDialog(true);
      }
    },
    [],
  );

  const OfflineDialog = useCallback(
    () => (
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
    ),
    [showOfflineDialog],
  );

  return { isOnline, guardSave, OfflineDialog };
}