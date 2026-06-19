import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { frontendEnvValidation } from '@/lib/supabaseClient';

export default function EnvironmentWarning() {
  if (!frontendEnvValidation.messages.length) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Demo environment warning</p>
          <ul className="mt-1 list-disc pl-4">
            {frontendEnvValidation.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
