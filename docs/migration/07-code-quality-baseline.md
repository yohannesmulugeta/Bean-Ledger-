# Code Quality Baseline

Recorded on 2026-06-18 during the first Supabase migration foundation phase.

## Commands executed

| Command | Result | Notes |
| --- | --- | --- |
| `npm install @supabase/supabase-js` | Passed | Installed project dependencies and added the Supabase browser client. NPM reported 20 vulnerabilities: 1 low, 10 moderate, 9 high. No forced audit fix was run because that could introduce behavior-changing upgrades. |
| `npm run build` | Passed | Vite build completed. Base44 plugin logged `Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)`. |
| `npm run typecheck` | Failed | TypeScript exited with code 2 and 2,219 diagnostics. |
| `npm run lint` | Initially failed | 103 unused-import errors were reported. |
| `npm run lint:fix` | Passed with warnings | Removed unused imports automatically. Left 46 warnings for unused local variables/arguments. |
| `npm run lint` | Passed | `eslint . --quiet` exits successfully after safe unused-import cleanup. |

## Original errors

- Lint baseline: 103 errors, all from `unused-imports/no-unused-imports`.
- Typecheck baseline: 2,219 diagnostics. The dominant category is JSX component typing inferred too narrowly, for example `Property 'children' does not exist on type 'IntrinsicAttributes & RefAttributes<any>'`.
- Representative typecheck files include:
  - `src/components/admin/DownloadBackupButton.jsx`
  - `src/components/attachments/ExportDocsPanel.jsx`
  - `src/components/attachments/FileAttachments.jsx`
  - `src/components/attachments/PurchaseAttachmentsPanel.jsx`
  - `src/components/attachments/WarehouseAttachmentsPanel.jsx`
  - `src/components/bagledger/BagReceiptsSection.jsx`
  - `src/pages/WarehouseReceipt.jsx`
  - `src/pages/WarehouseReceiptReport.jsx`

## Errors fixed

- Ran the repo's existing `npm run lint:fix` command.
- Removed unused imports only. This is non-behavior-changing cleanup.
- No UI layout, workflow, formula, Base44 runtime, auth, or data access behavior was intentionally changed.

## Errors still remaining

- `npm run typecheck` still fails with 2,219 diagnostics.
- The typecheck failures are broad and pre-existing. Fixing them safely should be its own cleanup phase because it may require shared UI component prop typing, generated Base44 entity typings, mutation function typings, and stricter JS/TS configuration decisions.
- `npm run lint:fix` still reports warnings when run directly, but `npm run lint` passes because the script uses `--quiet`.

## Build status

Build passes with `npm run build`.

## Type-check status

Type-check fails with `npm run typecheck`.

## Lint status

Lint passes with `npm run lint`.

## Risky files requiring later refactoring

- `src/components/ui/*`: several UI components appear to have weak or incomplete TypeScript inference under `checkJs`.
- `src/pages/WarehouseReceipt.jsx`, `src/pages/PurchaseRegistration.jsx`, `src/pages/ExportContracts.jsx`, `src/pages/OutputReportPage.jsx`, `src/pages/ProcessingLogPage.jsx`, and `src/pages/SampleLogPage.jsx`: large workflow pages with formulas, archive behavior, and mutation side effects.
- `src/lib/role-hooks.js` and `src/lib/useUser.js`: public demo fallback and frontend permission assumptions.
- `src/lib/archiveService.js`: archive/restore cascades and recalculation calls must be preserved during Supabase rewiring.
- `src/components/admin/DownloadBackupButton.jsx`: backup coverage is incomplete and export limits still need a dedicated migration export design.
