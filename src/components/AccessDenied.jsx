import React from 'react';
import { ShieldOff } from 'lucide-react';

export default function AccessDenied({ message = "You do not have permission to access this page.", compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/20 bg-destructive/5 text-sm text-destructive">
        <ShieldOff className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-destructive/10 rounded-full p-4">
            <ShieldOff className="w-8 h-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
    </div>
  );
}