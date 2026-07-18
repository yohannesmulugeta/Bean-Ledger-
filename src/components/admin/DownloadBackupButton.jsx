import React from 'react';
import { DatabaseBackup } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function DownloadBackupButton() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
      <div className="flex items-center gap-2 font-semibold">
        <DatabaseBackup className="w-4 h-4" />
        Backup Center
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-2" asChild><Link to="/backup-center">Open backup exports</Link></Button>
    </div>
  );
}
