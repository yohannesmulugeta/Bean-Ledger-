# Professional Demo Codebase Audit

Date: 2026-06-19  
Branch: `cleanup/professional-demo-codebase`  
Scope: audit only; no behavior, schema, formula, auth, UI, remote Supabase, or deployment changes.

## Executive Summary

The active Bean Ledger / KKGT Flow demo is now routed through the Supabase-backed demo modules, but the repository still contains legacy Base44 pages, functions, helper libraries, and package dependencies. The immediate professional cleanup path should be to quarantine unused Base44-era code, extract route/navigation metadata, split oversized active pages, and reduce TypeScript/check-js diagnostics in the active demo surface before deleting any legacy implementation.

No active route currently imports the Base44 client directly. The active app still has Base44 residue through a Base44-hosted logo URL in the sidebar and one Base44 comment in an active report page. Those should be replaced later after product/asset ownership is confirmed.

## Verification Run

| Command | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run lint` | Passed |
| `npm run test:phase4` | Passed |
| `npm run test:phase5` | Passed |
| `npm run test:phase6` | Passed |
| `npm run test:phase7` | Passed |
| `npm run test:phase8` | Passed |
| `npm run test:phase9` | Passed |
| `npm run test:phase10` | Passed |
| `npm run test:phase11` | Passed |
| `npm run test:phase12` | Passed |

Typecheck was run for audit evidence only. It exits with 1,067 diagnostics, concentrated in known legacy/check-js-heavy areas.

## Active Route Graph

Active routes are declared in `src/App.jsx`.

### Public And Demo Auth Routes

| Path | Component / Behavior |
| --- | --- |
| `/login` | `Login` |
| `/register` | Redirects to `/login` |
| `/signup` | Redirects to `/login` |
| `/forgot-password` | Redirects to `/login` |
| `/reset-password` | Redirects to `/login` |

### Protected App Routes

| Path | Component / Behavior |
| --- | --- |
| `/` | `Dashboard` |
| `/purchases` | Redirects to `/purchase-registration` |
| `/warehouse` | Redirects to `/warehouse-receipt` |
| `/processing` | Redirects to `/processing-log` |
| `/exports` | Redirects to `/export-contracts` |
| `/master-data` | `MasterData` |
| `/purchase-registration` | `PurchaseRegistration` |
| `/warehouse-receipt` | `WarehouseReceiptPage` |
| `/sample-log` | `SampleLogPage` |
| `/processing-log` | `ProcessingLogPage` |
| `/output-report` | `OutputReportPage` |
| `/reports` | `Reports` |
| `/buyer-inspections` | `BuyerInspections` |
| `/export-contracts` | `ExportContracts` |
| `/materials-register` | `MaterialsRegister` |
| `/bag-ledger` | `BagLedger` |
| `/stock-report` | `StockReport` |
| `/notification-settings` | `NotificationSettings` |
| `/activity-log` | `ActivityLog` |
| `/notification-history` | `NotificationHistory` |
| `/permissions` | `Permissions` |
| `/user-report` | `UserActivityReport` |
| `/purchase-orders-report` | `PurchaseOrdersReport` |
| `/warehouse-receipt-report` | `WarehouseReceiptReport` |
| `/users-management` | `UsersManagement` |
| `/data-audit` | `DataAudit` |
| `*` | `PageNotFound` when logged in; otherwise redirect to `/login` |

## Active Navigation Pages

Navigation is declared in `src/components/layout/Sidebar.jsx`.

| Group | Routes |
| --- | --- |
| Dashboard | `/` |
| Purchases | `/purchase-registration`, `/warehouse-receipt`, `/sample-log`, `/processing-log`, `/output-report` |
| Exports | `/export-contracts`, `/buyer-inspections`, `/stock-report`, `/bag-ledger`, `/materials-register` |
| Reports | `/reports`, `/purchase-orders-report`, `/warehouse-receipt-report`, `/user-report`, `/activity-log` |
| Settings | `/master-data`, `/permissions`, `/users-management`, `/data-audit`, `/notification-settings` |

`/notification-history` is routable but not currently exposed in the main sidebar navigation.

## Active Supabase-Backed Services

The active demo surface imports these service modules:

| Service | Active Consumers |
| --- | --- |
| `src/services/authService.js` | `src/lib/AuthContext.jsx`, `src/pages/Login.jsx` |
| `src/services/supplierService.js` | supplier, purchase, sample, processing, export, buyer inspection, bag ledger, master data pages/components |
| `src/services/purchaseService.js` | purchase registration, sample, processing, user activity report |
| `src/services/warehouseService.js` | warehouse receipt, sample, processing, user activity report |
| `src/services/sampleService.js` | sample log, processing, output, export, buyer inspection |
| `src/services/processingService.js` | processing log, output report |
| `src/services/outputService.js` | output report, export contracts, buyer inspections |
| `src/services/exportService.js` | export contracts, buyer inspections, output/sample workflows |
| `src/services/buyerInspectionService.js` | buyer inspections, export/output/sample/processing workflows |
| `src/services/bagService.js` | bag ledger components |
| `src/services/materialService.js` | material register components |
| `src/services/reportService.js` | dashboard, reports, stock report, purchase/warehouse reports, data audit |
| `src/services/auditService.js` | dashboard activity and activity log/report pages |
| `src/services/notificationService.js` | notification settings/history |
| `src/services/attachmentService.js` | attachment/document panels |
| `src/services/archiveService.js` | archived records UI |
| `src/services/demoData.js` | demo fallback seed data |
| `src/services/demoStore.js` | local demo fallback store |

## Legacy / Base44 Files Still Present

These files still reference Base44 APIs, Base44 environment variables, or Base44-hosted assets.

### Base44 Client And SDK Dependency

| File | Notes |
| --- | --- |
| `package.json` | Still includes `@base44/sdk` dependency. Keep until legacy code is quarantined and removal is verified. |
| `src/api/base44Client.js` | Legacy Base44 client wrapper. |

### Legacy Base44 Functions

| Path | Notes |
| --- | --- |
| `base44/functions/_shared/*` | Shared Base44 function utilities and service-role helpers. |
| `base44/functions/backupData/index.js` | Legacy Base44 function. |
| `base44/functions/notifyOverduePayments/index.js` | Legacy Base44 function. |
| `base44/functions/notifyStockThresholds/index.js` | Legacy Base44 function. |
| `base44/functions/runDataAudit/index.js` | Legacy Base44 function. |
| `base44/functions/sendNotification/index.js` | Legacy Base44 function. |

### Legacy Base44 Libraries

| File | Notes |
| --- | --- |
| `src/lib/archiveService.js` | Legacy Base44 archive service. Active archived records import `src/services/archiveService.js` instead. |
| `src/lib/warehouseHistoryService.js` | Legacy Base44 warehouse history helper. |
| `src/lib/app-params.js` | Reads Base44 app/function environment variables. |

### Legacy Base44 Pages

| File | Current Route Status |
| --- | --- |
| `src/pages/Purchases.jsx` | `/purchases` now redirects to `/purchase-registration`. |
| `src/pages/WarehousePage.jsx` | `/warehouse` now redirects to `/warehouse-receipt`. |
| `src/pages/Processing.jsx` | `/processing` now redirects to `/processing-log`. |
| `src/pages/Exports.jsx` | `/exports` now redirects to `/export-contracts`. |
| `src/pages/Register.jsx` | Public route redirects to `/login`. |
| `src/pages/ForgotPassword.jsx` | Public route redirects to `/login`. |
| `src/pages/ResetPassword.jsx` | Public route redirects to `/login`. |

### Legacy Base44 Components

| File | Notes |
| --- | --- |
| `src/components/purchases/DuplicateReport.jsx` | Base44 entity access. |
| `src/components/warehouse/WarehouseHistoryTab.jsx` | Uses legacy warehouse history helper. |
| `src/components/warehouse/ReceiptInlineHistory.jsx` | Uses legacy warehouse history helper. |
| `src/components/UserNotRegisteredError.jsx` | Calls Base44 auth logout. |
| `src/components/ProtectedRoute.jsx` | Imports `UserNotRegisteredError`; not used by the current `App.jsx` route guard. |

### Active-Route Base44 Residue

| File | Risk |
| --- | --- |
| `src/components/layout/Sidebar.jsx` | Uses a Base44-hosted logo URL. Replace with a local/public asset after confirming the intended logo. |
| `src/pages/UserActivityReport.jsx` | Contains a Base44 reference in a comment only. No active Base44 client import found. |

## Safe-To-Quarantine Candidates

These should be moved behind a quarantine folder or excluded from active check-js/typecheck only after a quick import-graph verification in the cleanup implementation phase:

| Candidate | Why It Looks Safe Later |
| --- | --- |
| `src/pages/Purchases.jsx` | Superseded by `PurchaseRegistration`; route redirects away. |
| `src/pages/WarehousePage.jsx` | Superseded by `WarehouseReceiptPage`; route redirects away. |
| `src/pages/Processing.jsx` | Superseded by `ProcessingLogPage`; route redirects away. |
| `src/pages/Exports.jsx` | Superseded by `ExportContracts`; route redirects away. |
| `src/pages/Register.jsx` | Demo auth redirects registration to login. |
| `src/pages/ForgotPassword.jsx` | Demo auth redirects password reset to login. |
| `src/pages/ResetPassword.jsx` | Demo auth redirects password reset to login. |
| `src/components/ProtectedRoute.jsx` | Current route protection is handled inside `App.jsx` / auth context. |
| `src/components/UserNotRegisteredError.jsx` | Tied to Base44 auth. |
| `src/components/purchases/DuplicateReport.jsx` | Tied to Base44 entity access. |
| `src/components/warehouse/WarehouseHistoryTab.jsx` | Tied to Base44 history service. |
| `src/components/warehouse/ReceiptInlineHistory.jsx` | Tied to Base44 history service. |
| `src/lib/archiveService.js` | Superseded by `src/services/archiveService.js` in active demo UI. |
| `src/lib/warehouseHistoryService.js` | Legacy Base44 helper. |
| `base44/functions/**` | Legacy function source, not used by the Supabase demo build. Preserve until migration evidence is archived. |

## Dangerous-To-Touch Files

These files are active or encode business behavior. Do not split, rewrite, or remove them without focused tests and visual smoke coverage:

| Area | Files / Notes |
| --- | --- |
| Purchase formulas | `src/services/purchaseService.js`, purchase calculation tests, Supabase RPC migrations. |
| Warehouse formulas | `src/services/warehouseService.js`, warehouse workflow tests. |
| Sample / processing / output formulas | `src/services/sampleService.js`, `src/services/processingService.js`, `src/services/outputService.js`, `src/lib/processingOutputCalculations.js`. |
| Export / buyer inspection workflows | `src/services/exportService.js`, `src/services/buyerInspectionService.js`, export/buyer pages and tests. |
| Bag and material ledgers | `src/services/bagService.js`, `src/services/materialService.js`, bag/material components. |
| Demo auth | `src/services/authService.js`, `src/lib/AuthContext.jsx`, `src/pages/Login.jsx`. |
| Reports and audit | `src/services/reportService.js`, `src/lib/reportEngine.js`, `src/lib/dataAudit.js`, report pages. |
| Attachments | `src/services/attachmentService.js`, attachment panels, storage migrations. |
| Demo seed source | `src/services/demoData.js`, `supabase/seed.sql`, migration docs and tests. |
| App shell | `src/App.jsx`, `src/components/layout/Layout.jsx`, `src/components/layout/Sidebar.jsx`. |

## Large Files To Split Later

| File | Approx. Size | Suggested Split |
| --- | ---: | --- |
| `src/pages/Reports.jsx` | 64 KB | filters, KPIs, tables, export controls, report hooks |
| `src/lib/dataAudit.js` | 64 KB | domain-specific audit rules and shared formatters |
| `src/pages/ProcessingLogPage.jsx` | 46 KB | form, table, calculations, archive UI |
| `src/pages/OutputReportPage.jsx` | 45 KB | form, table, summaries, dependency selectors |
| `src/pages/ExportContracts.jsx` | 45 KB | contract list, detail view, form orchestration |
| `src/pages/PurchaseRegistration.jsx` | 43 KB | supplier selector, payment panel, calculations, archive flow |
| `src/components/exports/ContractForm.jsx` | 43 KB | field groups, validation, totals, document widgets |
| `src/services/demoData.js` | 41 KB | domain seed files by module |
| `src/pages/SampleLogPage.jsx` | 33 KB | form, table, status workflow |
| `src/pages/DataAudit.jsx` | 31 KB | filters, findings table, summary panels |
| `src/pages/StockReport.jsx` | 29 KB | filters, stock cards, report table |
| `src/pages/WarehouseReceiptReport.jsx` | 28 KB | filters, detail panel, export table |
| `src/pages/BuyerInspections.jsx` | 26 KB | form, table, linked contract/output selectors |
| `src/pages/Dashboard.jsx` | 25 KB | KPI cards, charts, activity feed |
| `src/components/materials/ExportMaterialsTab.jsx` | 25 KB | issue form, usage table, calculations |

## Repeated Code And Components

| Pattern | Examples | Cleanup Direction |
| --- | --- | --- |
| Repeated report filters | `Reports`, `PurchaseOrdersReport`, `WarehouseReceiptReport`, `StockReport`, `UserActivityReport` | Extract shared filter state and date/status selectors after tests cover each report. |
| Repeated table/export behavior | report pages, `ExportContractsReportTable`, purchase/warehouse reports | Introduce a shared report table adapter only after column behavior is documented. |
| Repeated archived record UI | active pages plus `ArchivedRecordsSection` | Standardize archive/restore dialogs and copy. |
| Repeated Supabase/demo fallback service methods | most `src/services/*.js` files | Extract a small data-access helper for `list/create/update/archive/restore` once edge cases are known. |
| Repeated attachment panels | purchase, warehouse, export, generic document panels | Standardize around a single attachment host with module-specific labels. |
| Repeated route/nav metadata | `App.jsx` and `Sidebar.jsx` | Create a typed route manifest later; keep route redirects explicit. |

## Obvious Performance Opportunities

| Area | Observation | Later Improvement |
| --- | --- | --- |
| Initial bundle | `App.jsx` statically imports all route pages. | Introduce `React.lazy` route-level splitting after preview smoke tests are automated. |
| Client-side reports | Large arrays are filtered and aggregated in report/dashboard pages. | Memoize expensive selectors and move stable report summaries to RPCs where appropriate. |
| Data audit | `src/lib/dataAudit.js` and `src/pages/DataAudit.jsx` are large and computation-heavy. | Split audit rules and consider background/worker-style execution for large real datasets. |
| Demo seed module | `src/services/demoData.js` loads all synthetic domains together. | Split by domain so active pages import only required seed groups. |
| Sidebar | Desktop/mobile navigation and grouped metadata live in one large component. | Extract nav config and render helpers without changing layout. |
| Attachment previews | Multiple panels manage similar document lists independently. | Centralize fetch/cache behavior around `attachmentService`. |

## Typecheck Cleanup Plan

Audit command: `npm run typecheck`  
Current result: exits with code `2` and 1,067 diagnostics.

Largest diagnostic clusters:

| File | Diagnostics |
| --- | ---: |
| `src/components/exports/ContractForm.jsx` | 108 |
| `src/pages/PurchaseRegistration.jsx` | 83 |
| `src/components/userreport/UserDetailPanel.jsx` | 78 |
| `src/pages/MasterData.jsx` | 75 |
| `src/pages/Reports.jsx` | 68 |
| `src/pages/DataAudit.jsx` | 57 |
| `src/pages/WarehouseReceiptReport.jsx` | 42 |
| `src/pages/ActivityLog.jsx` | 41 |
| `src/components/wrr/WRRFilterPanel.jsx` | 35 |
| `src/components/reports/PurchaseDetailPanel.jsx` | 33 |
| `src/pages/PurchaseOrdersReport.jsx` | 27 |
| `src/components/userreport/ActivityUsersTable.jsx` | 23 |
| `src/components/por/PORFilterPanel.jsx` | 21 |
| `src/components/purchases/PaymentHistoryPanel.jsx` | 19 |
| `src/pages/Purchases.jsx` | 17 |
| `src/pages/WarehousePage.jsx` | 17 |
| `src/components/shared/ArchivedRecordsSection.jsx` | 17 |
| `src/pages/Processing.jsx` | 16 |
| `src/pages/Exports.jsx` | 16 |
| `src/hooks/useOfflineSubmit.jsx` | 16 |

Recommended order:

1. Quarantine or exclude confirmed inactive legacy pages from check-js coverage.
2. Add lightweight JSDoc typedefs for shared service records and form props.
3. Fix `ContractForm.jsx`, `PurchaseRegistration.jsx`, and `MasterData.jsx` first because they are active and high-noise.
4. Type common report filter/table props before splitting report files.
5. Convert service response shapes to shared DTO typedefs before deeper component refactors.

## Recommended Next Cleanup Steps

1. Create a route manifest used by both `App.jsx` and `Sidebar.jsx`, keeping current paths and redirects unchanged.
2. Replace the Base44-hosted sidebar logo with a checked-in public asset after confirming the correct logo.
3. Quarantine inactive Base44-era pages/components into a clearly named legacy folder, then rerun build, lint, tests, and typecheck.
4. Remove `@base44/sdk` only after the quarantine proves no active import path requires it.
5. Split `src/services/demoData.js` into domain seed modules.
6. Extract shared archive and attachment panel shells.
7. Start typecheck cleanup with active files before legacy files.
8. Add a small dependency/import audit script so future phases can prove that active demo routes stay Base44-free.

