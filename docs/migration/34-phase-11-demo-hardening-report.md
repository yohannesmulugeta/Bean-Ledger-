# Phase 11 Demo Hardening Report

Phase 11 hardens the local demo for later Vercel preview preparation. It does not deploy, does not connect to production Supabase, and does not import real Base44 data.

## Implemented

- Added demo notifications schema and RPCs.
- Added synthetic notification seeds and local fallback fixtures.
- Replaced notification center/settings Base44 calls with `src/services/notificationService.js`.
- Added visible demo auth/environment warnings.
- Protected notification routes behind the demo app route shell and module guard.
- Redirected legacy placeholder aliases:
  - `/warehouse` -> `/warehouse-receipt`
  - `/processing` -> `/processing-log`
  - `/exports` -> `/export-contracts`
- Replaced active users/permissions management with read-only demo cleanup pages.
- Disabled the legacy Base44 full-backup button with the required warning.
- Replaced active demo logging/notification helpers so they no longer invoke Base44 or Telegram.
- Added frontend environment validation and `.env.example` warning.
- Added `vercel.json` SPA rewrite.
- Added `npm run test:phase11`.

## Demo Notification Behavior

Notifications are demo-only. The app can list notifications, show unread counts, mark a notification read, mark all read, and save local demo preferences. External delivery is not connected.

`sendTelegramMessage` remains only under `base44/functions` as future production migration reference.

## Settings/Admin Behavior

Users and permissions routes remain navigable for demo clarity, but actions that imply real security administration are disabled. Demo credentials cannot be changed from the UI.

Backup/export actions that implied production reliability are disabled and show:

> Real Base44 export is not connected in this demo.

## Environment Behavior

Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` displays a developer warning and the app can fall back to local synthetic demo data. Frontend service-role-like credentials are flagged as unsafe.

## Verification Plan

Run:

```powershell
npx supabase db reset
npm run build
npm run lint
npm run test:phase4
npm run test:phase5
npm run test:phase6
npm run test:phase7
npm run test:phase8
npm run test:phase9
npm run test:phase10
npm run test:phase11
npm run typecheck
```

The existing global type-check baseline before Phase 11 is 1248 diagnostics.
