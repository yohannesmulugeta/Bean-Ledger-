# Phase 12 Base44 Build Dependency Audit

Phase 12 prepares a demo-only Vercel preview build. It does not deploy, connect production Supabase, push database migrations, import real Base44 data, or remove legacy migration references blindly.

## Summary

| Area | Status | Classification | Decision |
| --- | --- | --- | --- |
| `vite.config.js` Base44 plugin | Removed from active build config | REMOVE_NOW | Replaced with standard Vite React plugin and explicit `@` alias. |
| `@base44/vite-plugin` package | Removed from `package.json` and lockfile | REMOVE_NOW | The demo build no longer needs the plugin. |
| `src/hooks/useOfflineSync.js` | Rewritten as demo-local queue status | DEMO_BUILD_BLOCKER | Active layout imported this hook, so the Base44 flush path was removed from the route graph. |
| `src/App.jsx` routes | Supabase demo pages only | SAFE_TO_KEEP_TEMPORARILY | Legacy `/warehouse`, `/processing`, and `/exports` paths redirect to migrated demo pages. |
| `src/api/base44Client.js` | Retained but not imported by active demo routes | LEGACY_ONLY_NOT_IMPORTED | Kept as migration reference for final cutover planning. |
| `@base44/sdk` package | Retained for legacy-only source files | LEGACY_ONLY_NOT_IMPORTED | Keep temporarily because retained legacy pages/functions still reference the SDK. It is not used by the active demo route graph. |
| `base44/functions/*` | Retained as historical function source | FUTURE_PRODUCTION_MIGRATION | Useful for later parity checks, export planning, and notification/backup migration. |
| `base44/entities/*` | Retained as historical schema source | FUTURE_PRODUCTION_MIGRATION | Required for future Base44 reconciliation and final import mapping. |
| `exports/base44/manual-drop/` and `exports/base44/runs/` | Ignored local data folders | SAFE_TO_KEEP_TEMPORARILY | Real export payloads must stay local-only and untracked. |
| Base44 references in migration docs/scripts | Documentation and local migration tooling only | SAFE_TO_KEEP_TEMPORARILY | These do not run in the Vercel demo app. |

## Remaining Legacy-Only Code

These files still contain Base44 calls but are not imported by `src/App.jsx` or the Phase 12 active demo file list:

- `src/pages/Purchases.jsx`
- `src/pages/WarehousePage.jsx`
- `src/pages/Processing.jsx`
- `src/pages/Exports.jsx`
- `src/pages/Register.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/ResetPassword.jsx`
- `src/lib/archiveService.js`
- `src/lib/warehouseHistoryService.js`
- `src/lib/app-params.js`
- `src/components/UserNotRegisteredError.jsx`
- `src/components/purchases/DuplicateReport.jsx`
- `src/components/warehouse/WarehouseHistoryTab.jsx`
- `src/components/warehouse/ReceiptInlineHistory.jsx`

Classification: `LEGACY_ONLY_NOT_IMPORTED` unless a future route imports one of these files again. If reintroduced into the active route graph, they become `ROUTE_GRAPH_RISK` and must be migrated to Supabase first.

## Search Terms Audited

The Phase 12 scan covered:

- `@base44/sdk`
- `@base44/vite-plugin`
- `createClient`
- `base44Client`
- `Base44`
- `VITE_BASE44`
- `invokeFunction`
- `uploadFile`
- `User.me`
- `Entity.list`
- `Entity.create`
- `Entity.update`
- `Entity.delete`

## Demo Build Position

The demo build path must not require Base44 runtime or plugin access. The active demo route graph is protected by `npm run test:phase12`, which fails if active files import `@/api/base44Client`, `@base44/sdk`, Base44 entity/auth/function calls, Base44 upload helpers, or `VITE_BASE44` config.
