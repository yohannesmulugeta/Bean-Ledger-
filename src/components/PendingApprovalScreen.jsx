import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PendingApprovalScreen() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="flex justify-center mb-6">
          <div className="bg-amber-50 rounded-full p-5 border border-amber-200">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-3">Pending Approval</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Your account has been registered but is awaiting administrator approval.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          You will be notified once your access has been granted. If you believe this is an error, please contact your system administrator.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-4 py-2.5 border border-amber-200">
          <ShieldAlert className="w-4 h-4" />
          <span>Access to ERP features is restricted until approval</span>
        </div>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => window.location.href = '/login'}
        >
          Return to Login
        </Button>
      </div>
    </div>
  );
}