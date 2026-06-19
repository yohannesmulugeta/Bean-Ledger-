# Vercel Preview Runbook

This runbook is preparation only. Do not deploy production, do not connect production Supabase, and do not run `supabase db push`.

## Future Vercel Settings

| Setting | Value |
| --- | --- |
| Branch | `migration/phase12-vercel-preview-prep` or a reviewed pull request branch |
| Framework preset | Vite |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production deployment | Blocked until final approval |

## Required Preview Environment Variables

Use demo/staging Supabase only:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not configure production secrets, service-role keys, database passwords, Telegram tokens, Base44 app settings, or real export paths in the Vercel preview environment.

## Pre-Deployment Local Checks

Run locally before creating the preview:

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
npm run test:phase12
npm run typecheck
```

The typecheck may still fail on legacy diagnostics. Record the diagnostic count and confirm Phase 12 files do not introduce new diagnostics.

## Post-Deploy Smoke Tests

When Phase 13 is approved to create the actual preview, verify:

- `/login` loads.
- `admin` / `password` starts a demo session.
- Direct protected URLs redirect to `/login` without a demo session.
- Dashboard loads after login.
- Supplier/master data pages load.
- Purchase registration loads and shows demo data.
- Warehouse receipt, sample log, processing log, output report, export contracts, buyer inspections, bags, and materials load.
- Notification history and settings load without external send behavior.
- Settings/admin pages remain demo-safe and read-only where intended.
- Browser console does not show Base44 runtime or missing plugin errors.

## Current Blockers to Production

- Full Supabase Auth is not implemented.
- Real Base44 exports are not available or imported.
- Production Supabase has not been connected.
- Final migration reconciliation and cutover are still pending.
