# Phase 13 Report: Staging Supabase Preparation

Phase 13 continued on the `migration/phase13-vercel-preview-deploy` branch. This report covers the staging Supabase work completed so far. No production Supabase project was used, no real Base44 data was imported, no service-role key was used or stored, and no Vercel deployment was performed.

## 1. Supabase Config Update

Updated `supabase/config.toml`:

```toml
[db]
major_version = 17
```

The local Supabase Docker volume had been created with Postgres 15, so it was recreated with:

```powershell
npx supabase stop --no-backup
```

## 2. Local DB Reset Result

Passed after recreating the local Postgres volume:

```powershell
npx supabase start
npx supabase db reset
```

The reset applied migrations through `202606180010_phase11_notifications_demo_schema.sql` and seeded `supabase/seed.sql`.

## 3. Build, Lint, and Test Results

Passed:

```powershell
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
npm run test:phase12
```

## 4. Typecheck Result and Diagnostic Count

```powershell
npm run typecheck
```

Result:

- Exit code: 2
- Diagnostic count: 1067
- Status: unchanged known legacy diagnostics

## 5. Remote Supabase Project Confirmation

Confirmed linked staging/demo project:

- Project name: Bean-Ledger
- Project ref: `boftugujxfhbpcipzzhk`
- Project URL: `https://boftugujxfhbpcipzzhk.supabase.co`

The linked ref was verified from `supabase/.temp/project-ref` before pushing.

## 6. DB Push Result

Passed:

```powershell
npx supabase db push
```

Applied remote migrations:

- `202606180001_foundation_tables.sql`
- `202606180002_foundation_rls.sql`
- `202606180003_phase4_demo_supplier_purchase_schema.sql`
- `202606180004_phase5_warehouse_demo_schema.sql`
- `202606180005_phase6_processing_output_demo_schema.sql`
- `202606180006_phase7_export_contract_demo_schema.sql`
- `202606180007_phase8_bags_materials_demo_schema.sql`
- `202606180008_phase9_dashboard_reports_demo_schema.sql`
- `202606180009_phase10_attachments_demo_schema.sql`
- `202606180010_phase11_notifications_demo_schema.sql`

Remote migration history now matches local through `202606180010`.

## 7. Remote Database Verification

Remote verification query results:

- Public tables: 35
- Public RPC/functions: 74
- Demo storage buckets: 3
- Demo organizations: 1
- Demo suppliers: 3
- Demo purchases: 4
- Demo notifications: 4
- Demo attachment metadata rows: 6

The three demo storage buckets exist:

- `demo-documents`
- `demo-receipts`
- `demo-export-documents`

Seed data was applied with:

```powershell
npx supabase db push --include-seed
```

`supabase/seed.sql` was updated to use `extensions.crypt` and `extensions.gen_salt` because the remote `pgcrypto` extension is installed in the `extensions` schema.

Checked seeded operational demo tables for `base44_id`; all checked counts were `0`, confirming no real Base44 production IDs were imported.

## 8. Vercel Preview Configuration

Prepared settings for the later preview deployment:

| Setting | Value |
| --- | --- |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Branch | `migration/phase13-vercel-preview-deploy` |

Required preview environment variables:

```text
VITE_SUPABASE_URL=https://boftugujxfhbpcipzzhk.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
```

Do not add service-role keys, database passwords, Base44 secrets, Telegram tokens, or production credentials.

## 9. Vercel Preview URL

Not deployed yet. The latest instruction explicitly said not to deploy to Vercel yet.

## 10. Smoke Test Results

Not run yet because no Vercel preview was deployed in this continuation.

Pending smoke tests for the future preview:

- Login with `admin` / `password`
- Dashboard loads
- Suppliers load
- Purchases load
- Warehouse receipt loads
- Sample log loads
- Processing loads
- Output report loads
- Export contracts load
- Buyer inspections load
- Bag ledger loads
- Material register loads
- Reports load
- Notifications load
- Attachments panel loads
- Logout works
- Route refresh does not show 404

## 11. Security Warnings

- Do not use or store the service-role key in frontend, Vercel, local files, or docs.
- The service-role key previously pasted in chat should be rotated in Supabase.
- Keep production Supabase separate from this staging/demo project.
- Do not import real Base44 exports or upload customer files.

## 12. Remaining Production Blockers

- Vercel preview has not been deployed or smoke-tested yet.
- Full Supabase Auth is not implemented; demo login remains `admin` / `password`.
- Real Base44 export/import and reconciliation are still pending.
- Production Supabase must not be connected until explicitly approved.
- Known legacy typecheck diagnostics remain at 1067.

## 13. Files Modified

- `supabase/config.toml`
- `supabase/seed.sql`
- `docs/migration/PHASE_13_REPORT.md`

## 14. Exact Commit Command

```powershell
git add .
git commit -m "Prepare Phase 13 staging Supabase"
git push -u origin migration/phase13-vercel-preview-deploy
```

## 15. Recommended Phase 14 Scope

Deploy a Vercel preview from `migration/phase13-vercel-preview-deploy` using the staging Supabase anon credentials only, then run the full browser smoke test checklist. Do not deploy production, do not merge to main, and do not import real Base44 data.
