# Phase 11 Remaining Base44 Dependency Audit

Phase 11 goal: keep the demo navigation path from calling Base44 while preserving legacy source needed for future reconciliation.

## Classification Key

- `DEMO_PATH_BLOCKER`: would be called from the current demo route/navigation path and must be removed or disabled.
- `LEGACY_UNUSED`: source remains in the repo but is not imported by current demo navigation.
- `FUTURE_PRODUCTION_MIGRATION`: needed as reference for a later real Base44-to-Supabase migration.
- `SAFE_TO_KEEP_FOR_NOW`: not called by demo runtime or is documentation/reference only.
- `MUST_DISABLE_BEFORE_VERCEL`: cannot remain active in any Vercel preview path.

## Current Result

No known `DEMO_PATH_BLOCKER` remains after Phase 11.

## Remaining Dependencies

| Surface | Classification | Phase 11 action |
| --- | --- | --- |
| `src/api/base44Client.js` | `FUTURE_PRODUCTION_MIGRATION` | Kept as legacy reference only. Active demo route files no longer import it. |
| `@base44/sdk`, `@base44/vite-plugin`, `vite.config.js` | `MUST_DISABLE_BEFORE_VERCEL` | Still present. Demo builds pass, but preview prep should remove plugin/runtime dependency once aliases are proven stable. |
| `base44/entities/*` | `FUTURE_PRODUCTION_MIGRATION` | Kept as schema/reference files for later real export reconciliation. |
| `base44/functions/*`, including `sendTelegramMessage` | `FUTURE_PRODUCTION_MIGRATION` | Kept as reference only. Demo notification helper no longer invokes Telegram or Base44 functions. |
| `src/hooks/useOfflineSync.js` | `LEGACY_UNUSED` / `MUST_DISABLE_BEFORE_VERCEL` | Still imports Base44. Current demo save flows do not rely on it for production sync guarantees. Full offline queue replacement is Phase 12+. |
| `src/pages/WarehousePage.jsx`, `src/pages/Processing.jsx`, `src/pages/Exports.jsx`, `src/pages/Purchases.jsx` | `LEGACY_UNUSED` | Preserved legacy CRUD pages. Active routes now redirect to migrated demo modules or are not imported from navigation. |
| `src/pages/Register.jsx`, `src/pages/ForgotPassword.jsx`, `src/pages/ResetPassword.jsx` | `LEGACY_UNUSED` | Public routes redirect to `/login`; full auth remains future Supabase Auth work. |
| `src/components/admin/DownloadBackupButton.jsx` | `MUST_DISABLE_BEFORE_VERCEL` resolved | Replaced with disabled demo message: "Real Base44 export is not connected in this demo." |
| `src/pages/NotificationHistory.jsx`, `src/pages/NotificationSettings.jsx`, `src/hooks/useNotifications.js` | `DEMO_PATH_BLOCKER` resolved | Rewired to Phase 11 notification service and demo tables/local store. |
| `src/lib/activityLogger.js`, `src/lib/notificationService.js`, `src/lib/PageNotFound.jsx`, `src/lib/role-hooks.js` | `DEMO_PATH_BLOCKER` resolved | Removed Base44 calls from active demo helper paths. |
| `src/lib/archiveService.js`, `src/lib/warehouseHistoryService.js`, `src/components/warehouse/*History*.jsx`, `src/components/purchases/DuplicateReport.jsx`, `src/components/UserNotRegisteredError.jsx` | `LEGACY_UNUSED` / `FUTURE_PRODUCTION_MIGRATION` | Not imported by current demo navigation path. Keep for future cleanup or replacement. |
| Existing migration docs mentioning Base44 | `SAFE_TO_KEEP_FOR_NOW` | Historical audit and reconciliation evidence. |
| `exports/base44/*` | `SAFE_TO_KEEP_FOR_NOW` | Local export folder is ignored except README/.gitkeep. No real exports committed. |

## Demo Path Check

Phase 11 automated test checks the active demo route/import surface:

- App routing and auth shell
- Login/session helpers
- Notification center/settings
- Dashboard/reports/activity paths
- Supplier/purchase/warehouse/sample/processing/output/export/buyer/material/bag pages
- Admin cleanup pages
- Backup disabled component

The test fails if those files import `@/api/base44Client`, `@base44/sdk`, or call `base44.entities`.

## Required Before Vercel Preview

Before a public preview, remove or quarantine the Base44 Vite plugin and package dependency if possible. If it must remain temporarily for historical files, document that the preview route surface does not import the legacy client and keep real Base44 credentials out of the environment.
