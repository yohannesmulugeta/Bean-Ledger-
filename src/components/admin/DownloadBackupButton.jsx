import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DownloadBackupButton() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="w-4 h-4" />
        Demo backup disabled
      </div>
      <p>Real Base44 export is not connected in this demo.</p>
      <Button type="button" variant="outline" size="sm" disabled className="gap-2">
        Download backup unavailable
      </Button>
    </div>
  );
}
