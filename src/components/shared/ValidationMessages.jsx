import React from 'react';
import { AlertTriangle, Ban, Info, X } from 'lucide-react';

// ── Severity styling ──────────────────────────────────────────────────────────
const SEV = {
  error: { icon: Ban, bg: 'bg-red-50 border-red-300 text-red-800', iconColor: 'text-red-500', label: 'Error' },
  critical: { icon: Ban, bg: 'bg-red-50 border-red-300 text-red-800', iconColor: 'text-red-500', label: 'Critical' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-300 text-amber-800', iconColor: 'text-amber-500', label: 'Warning' },
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200 text-blue-700', iconColor: 'text-blue-400', label: 'Info' },
};

// Map severity to unified key
function normalize(severity) {
  if (!severity) return 'info';
  if (severity === 'critical') return 'critical'; // same bg as error
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'info';
}

// ── Single validation message ─────────────────────────────────────────────────
export function ValidationMessage({ msg }) {
  if (!msg) return null;
  const s = SEV[msg.severity] || SEV.info;
  const Icon = s.icon;
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-sm ${s.bg}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${s.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{msg.message}</p>
        {(msg.expected_value || msg.actual_value) && (
          <div className="flex gap-3 mt-1 text-xs opacity-80">
            {msg.expected_value && <span>Expected: <strong>{msg.expected_value}</strong></span>}
            {msg.actual_value && <span>Actual: <strong>{msg.actual_value}</strong></span>}
          </div>
        )}
        {msg.suggested_fix && (
          <p className="text-xs mt-1 opacity-70">💡 {msg.suggested_fix}</p>
        )}
      </div>
      {msg.field && (
        <span className="text-[10px] font-mono bg-black/5 rounded px-1.5 py-0.5 flex-shrink-0">{msg.field}</span>
      )}
    </div>
  );
}

// ── Inline list (field-level, one per affected input) ────────────────────────
export function ValidationList({ messages, className = '' }) {
  if (!messages || messages.length === 0) return null;
  // Group by severity, errors first
  const sorted = [...messages].sort((a, b) => {
    const order = { error: 0, critical: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });
  return (
    <div className={`space-y-2 ${className}`}>
      {sorted.map((msg, idx) => (
        <ValidationMessage key={idx} msg={msg} />
      ))}
    </div>
  );
}

// ── Summary bar (errors count + warnings count) ──────────────────────────────
export function ValidationSummary({ messages, onDismiss }) {
  if (!messages || messages.length === 0) return null;
  const errors = messages.filter(m => m.severity === 'error' || m.severity === 'critical');
  const warnings = messages.filter(m => m.severity === 'warning');
  const infos = messages.filter(m => m.severity === 'info');

  return (
    <div className={`rounded-lg border px-4 py-3 ${errors.length > 0 ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {errors.length > 0 ? (
            <Ban className="w-5 h-5 text-red-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          )}
          <span className="text-sm font-semibold">
            {errors.length > 0
              ? `${errors.length} error${errors.length > 1 ? 's' : ''} — save blocked`
              : `${warnings.length} warning${warnings.length > 1 ? 's' : ''} — review before saving`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {errors.length > 0 && <span className="text-red-700 font-semibold">{errors.length} errors</span>}
          {warnings.length > 0 && <span className="text-amber-700 font-semibold">{warnings.length} warnings</span>}
          {infos.length > 0 && <span className="text-blue-600">{infos.length} info</span>}
          {onDismiss && (
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}