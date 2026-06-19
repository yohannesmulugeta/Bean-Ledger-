# Phase 14 Vercel Preview Report

Phase 14 attempted Vercel preview deployment from `migration/phase14-vercel-preview-smoke-test`. No production migration, Base44 import, customer upload, service-role key usage, database password usage, or main-branch merge was performed.

## 1. Service-Role Key Rotation Confirmation

Proceeding was based on the user confirmation that the exposed Supabase service-role key had been rotated in the Supabase dashboard.

No service-role key was used, stored, added to Vercel, or written to files.

## 2. Local Verification Result

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

Typecheck was run for count only:

- Exit code: 2
- Diagnostic count: 1067
- Status: unchanged known legacy diagnostics

## 3. Vercel Env Vars Used

Only these values were used for the Vercel attempt:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No values are included in this report.

Not used:

- Supabase service-role key
- Supabase database password
- Base44 secrets
- Telegram token
- Production credentials

## 4. Vercel Preview URL

No valid preview URL was produced.

The Vercel project had no connected Git repository, so branch-scoped Preview environment variables could not be saved. A CLI deployment was attempted with `--target preview`, but Vercel created a deployment with `target=production`.

That unintended production deployment was immediately removed.

Removed deployment:

- Deployment id: `dpl_u8pdTSWXvRuTVhwsk11oiW5n4KZ5`
- Removed URL: `https://bean-ledger-cdfj0aop3-joni-building-s-projects.vercel.app`

Post-removal inspection confirmed Vercel could no longer find that deployment.

## 5. Build Result

Local build passed after updating `vercel.json`:

```powershell
npm run build
```

The Vercel build also completed during the deployment attempt, but the resulting deployment target was production and was removed.

## 6. Smoke Test Results

Smoke tests were not run because no valid preview deployment remained after the production-target stop condition was triggered.

Pending smoke tests:

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
- Stock report loads
- Notifications load
- Attachments panel loads
- Settings page shows demo warning
- Backup/export action is disabled
- Logout works

## 7. Route Refresh Results

Not tested because no valid preview URL exists.

`vercel.json` still includes the SPA rewrite:

```json
{
  "source": "/(.*)",
  "destination": "/index.html"
}
```

Pending route refresh checks:

- `/dashboard`
- `/purchase-registration`
- `/reports`

## 8. Runtime Errors

No browser runtime smoke test was performed.

Deployment blocker:

- Vercel CLI created `target=production` despite the preview deployment command.
- The project is not connected to GitHub, so Vercel could not save branch-scoped Preview environment variables.

## 9. Security Warnings

- Do not redeploy until Vercel can create a true Preview deployment.
- Do not add service-role keys, database passwords, Base44 secrets, Telegram tokens, or production credentials to Vercel.
- The Vercel project should be connected to the GitHub repository before the next preview attempt, or the exact Vercel CLI preview-only workflow should be verified in a safe test project first.
- Keep the demo Supabase anon key limited to Preview usage.

## 10. Remaining Production Blockers

- No valid Vercel preview has been smoke-tested.
- Full Supabase Auth is not implemented.
- Real Base44 export/import and reconciliation are still pending.
- Production Supabase remains disconnected.
- Known legacy typecheck diagnostics remain at 1067.

## 11. Files Modified

- `.gitignore`
- `vercel.json`
- `docs/migration/PHASE_14_VERCEL_PREVIEW_REPORT.md`

## 12. Exact Commit Command

```powershell
git add .
git commit -m "Document Phase 14 Vercel preview blocker"
git push -u origin migration/phase14-vercel-preview-smoke-test
```

## 13. Recommended Next Phase

Fix the Vercel preview deployment path only:

- Connect the Vercel `bean-ledger` project to the GitHub repository.
- Add Preview environment variables in Vercel for the Phase 14 branch.
- Deploy a true Preview target, not production.
- Run the full browser smoke test checklist.
- Do not deploy production and do not merge to main.
