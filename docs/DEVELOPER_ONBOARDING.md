# Developer Onboarding

## Purpose

Bean Ledger / KKGT Flow Demo is a demo coffee export operations system. It validates the Supabase replacement for a Base44 app using synthetic demo data only.

## App Structure

- `src/App.jsx` defines the active route graph and protected demo routes.
- `src/components/layout/` contains app shell and navigation.
- `src/pages/` contains route-level pages.
- `src/components/` contains reusable UI and module components.
- `src/services/` contains the demo data access layer.
- `src/lib/` contains Supabase client setup, auth context, report helpers, and shared utilities.
- `supabase/migrations/` contains database schema, RPC, storage, and seed migrations.
- `scripts/tests/` contains workflow tests for migration phases.

## Active Routes

Active protected routes include:

- `/`
- `/master-data`
- `/purchase-registration`
- `/warehouse-receipt`
- `/sample-log`
- `/processing-log`
- `/output-report`
- `/reports`
- `/buyer-inspections`
- `/export-contracts`
- `/materials-register`
- `/bag-ledger`
- `/stock-report`
- `/notification-settings`
- `/activity-log`
- `/notification-history`
- `/permissions`
- `/user-report`
- `/purchase-orders-report`
- `/warehouse-receipt-report`
- `/users-management`
- `/data-audit`

Legacy routes such as `/purchases`, `/warehouse`, `/processing`, and `/exports` redirect to their Supabase demo replacements.

## Services

Active services live in `src/services/`.

Important services:

- `authService.js`: demo login/session only.
- `supplierService.js`: suppliers.
- `purchaseService.js`: purchase workflow and calculations.
- `warehouseService.js`: warehouse receipts.
- `sampleService.js`: sample log.
- `processingService.js`: processing logs.
- `outputService.js`: output reports.
- `exportService.js`: export contracts and buyer inspections.
- `bagService.js`: bag ledger.
- `materialService.js`: materials.
- `dashboardService.js`, `reportService.js`, `stockService.js`: reports and dashboard data.
- `attachmentService.js`: demo attachments.
- `notificationService.js`: demo notifications/settings.
- `auditService.js`, `archiveService.js`, `userService.js`: admin and audit surfaces.

Keep service APIs stable when possible. Pages should not duplicate large Supabase query logic if a service/RPC already exists.

## Supabase Migrations

Migrations live in `supabase/migrations/`.

Use local reset for verification:

```powershell
npx supabase db reset
```

Do not run `supabase db push` without confirming a staging/demo project ref. Never push from this cleanup workflow to production.

## Adding a New Module

1. Add or extend the Supabase migration locally.
2. Add service methods under `src/services/`.
3. Add route page under `src/pages/`.
4. Add reusable components under `src/components/<module>/`.
5. Add the route in `src/App.jsx`.
6. Add navigation only if the module is ready for demo users.
7. Add a workflow test under `scripts/tests/`.
8. Run build, lint, typecheck, and relevant phase tests.

## Adding an RPC Safely

1. Add the RPC in a new forward-only migration.
2. Keep arguments explicit and typed.
3. Keep calculations server-authoritative when the value affects money, KG, balances, stock, or reports.
4. Add constraints or validations in SQL where possible.
5. Add a workflow test that exercises success and invalid input paths.
6. Do not rename existing RPCs without updating all service callers and tests.

## Adding a Report

1. Prefer a service or RPC that returns the report-ready dataset.
2. Keep formatting in report/export helpers, not in database calculations.
3. Add pagination or sensible limits for table views.
4. Use existing export helpers where possible.
5. Test totals, empty states, filters, and export behavior.

## Formula Safety

Do not change these formulas without explicit migration approval:

- `1 feresula = 17 KG`
- Net feresula = dispatch KG / 17
- Purchase price = unit price x net feresula
- Warehouse feresula = warehouse received KG / 17
- Commission = warehouse feresula x unit price x commission percentage
- Grand total = purchase price + commission + additional costs
- Balance = grand total - payments
- Payment tolerance = approximately +/- 1 ETB
- Reject bags = 85 KG
- Export bags = 60 KG

When editing purchase, warehouse, processing, bag, or report modules, confirm tests still cover the relevant calculations.

## Testing a Workflow

Run the full safety suite before committing shared behavior:

```powershell
npm run build
npm run lint
npm run typecheck
npm run test:phase4
npm run test:phase5
npm run test:phase6
npm run test:phase7
npm run test:phase8
npm run test:phase9
npm run test:phase10
npm run test:phase11
npm run test:phase12
```

For UI work, also run the app locally and smoke test the affected routes.

## Demo vs Production

Demo:

- Uses `admin` / `password`.
- Uses synthetic seed data.
- Can fall back to local synthetic data where services support it.
- Is safe for preview sharing only after environment variables are set correctly.

Production:

- Must use Supabase Auth.
- Must use real migrated/reconciled Base44 data.
- Must enforce production RLS and role permissions.
- Must have backup, monitoring, and error logging.
- Must not include demo credentials or synthetic-only assumptions.

## What Not To Do

- Do not connect to production Supabase from cleanup work.
- Do not put service-role keys in frontend env vars.
- Do not import real Base44 data until reconciliation is ready.
- Do not remove legacy Base44 code until Supabase replacements are proven.
- Do not change business formulas casually.

