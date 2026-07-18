// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { notificationService } from '@/services/notificationService';
import { useUser } from '@/lib/useUser';

const ALL_TYPES = [
  { key: 'new_purchase', label: 'New purchase registered', critical: false },
  { key: 'warehouse_confirmed', label: 'Warehouse receipt confirmed', critical: false },
  { key: 'export_contract', label: 'Export contract updates', critical: false },
  { key: 'weekly_payment_summary', label: 'Weekly payment summary', critical: false },
  { key: 'low_stock', label: 'Low stock warning', critical: false },
  { key: 'stock_empty', label: 'Stock empty alert', critical: true },
];

export default function NotificationSettings() {
  const user = useUser();
  const [disabled, setDisabled] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    notificationService.getPreferences(user?.email).then((preferences) => {
      if (!cancelled) setDisabled(preferences?.disabled_types || []);
    });
    return () => { cancelled = true; };
  }, [user?.email]);

  const toggle = (key, isCritical) => {
    if (isCritical) return;
    setSaved(false);
    setDisabled((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const save = async () => {
    setSaving(true);
    await notificationService.savePreferences(user?.email || 'demo-admin@kkgt.local', disabled);
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Notification Preferences" description="Local demo notification preferences" />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        These settings affect only the demo notification center. Telegram, email, Supabase Auth users, and production notification delivery are not connected.
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold">Demo environment</p>
          <p className="text-xs text-muted-foreground mt-1">
            Signed in as {user?.full_name || 'Demo Admin'} using local demo credentials. Credentials cannot be changed from this screen.
          </p>
        </div>
        {ALL_TYPES.map((type) => {
          const isDisabled = disabled.includes(type.key);
          return (
            <div key={type.key} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium">{type.label}</p>
                {type.critical && <p className="text-xs text-destructive mt-0.5">Critical demo alert remains enabled.</p>}
              </div>
              <button
                onClick={() => toggle(type.key, type.critical)}
                disabled={type.critical}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  !isDisabled ? 'bg-primary' : 'bg-muted-foreground/30'
                } ${type.critical ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label={`${type.label} notification toggle`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${!isDisabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-muted-foreground">Demo settings saved locally.</span>}
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
