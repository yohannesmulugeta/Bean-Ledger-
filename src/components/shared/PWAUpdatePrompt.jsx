import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * PWAUpdatePrompt — shows banner when a new app version is detected.
 * Uses the service worker's waiting state.
 */
export default function PWAUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onUpdateFound = (registration) => {
      const worker = registration.waiting;
      if (worker) {
        setWaitingWorker(worker);
        setUpdateAvailable(true);
      }
    };

    // Check for existing waiting worker on load
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setUpdateAvailable(true);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setUpdateAvailable(true);
          }
        });
      });
    });

    return () => {};
  }, []);

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload after a brief delay
    setTimeout(() => window.location.reload(), 300);
  }, [waitingWorker]);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-card border-2 border-primary/30 rounded-xl shadow-lg p-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 rounded-full p-2 flex-shrink-0">
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">A new version is available.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Update now for the latest features and fixes.</p>
          <Button
            size="sm"
            className="mt-3 h-8 text-xs"
            onClick={handleUpdate}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Update
          </Button>
        </div>
        <button
          onClick={() => setUpdateAvailable(false)}
          className="text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}