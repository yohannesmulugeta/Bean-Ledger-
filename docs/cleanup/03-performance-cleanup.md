# Step 3 Performance Cleanup

Date: 2026-06-19  
Branch: `cleanup/professional-demo-codebase`  
Scope: route loading and safe query-cache cleanup only.

## Summary

This pass improves perceived app speed without changing business behavior, formulas, schema, visual design, authentication, or Supabase deployment state. The main change is route-level lazy loading for the large demo pages so the initial app shell does not statically load every operational module up front.

## Pages Lazy-Loaded

The following protected route pages are now loaded with `React.lazy` and `Suspense` from `src/App.jsx`:

- Dashboard
- Master data / settings
- Purchase registration
- Warehouse receipt
- Sample log
- Processing log
- Output report
- Reports
- Export contracts
- Buyer inspections
- Materials register
- Bag ledger
- Stock report
- Notification settings
- Activity log
- Notification history
- Permissions
- User activity report
- Purchase orders report
- Warehouse receipt report
- Users management
- Data audit

The public login page remains eagerly imported so the demo login path stays immediate.

## Loading Fallback

Added a simple route loading fallback in the existing app style:

- Uses `bg-background`
- Uses muted text styling
- Keeps layout simple and centered
- Does not introduce a new visual design pattern

Notification settings and notification history keep explicit inline `ModuleRouteGuard` usage so existing Phase 11 route-protection tests continue to verify those routes.

## Data Calls Reduced

The report snapshot pages already use the consolidated `reportService.snapshot()` path, which uses the Supabase `get_demo_report_snapshot` RPC when Supabase is configured.

This pass reduced duplicate frontend cache keys for the same snapshot source:

- Added shared `REPORT_CACHE_KEYS` and `REPORT_QUERY_KEYS` in `src/services/reportService.js`.
- Updated Dashboard, Reports, Stock Report, and Purchase Orders Report to share the same report snapshot query key.
- Updated Purchase Orders Report refresh invalidation to invalidate the actual shared snapshot key instead of old page-specific keys.
- Updated Warehouse Receipt Report and Data Audit to use shared constants for their active/audit snapshot keys.

This keeps service behavior the same while allowing React Query to reuse matching report snapshot results across navigation.

## Pagination And Default Limits Checked

The main table workflow pages already use client-side pagination with a default page size of 10:

- Purchase registration
- Warehouse receipt
- Sample log
- Processing log
- Output report
- Export contracts
- Buyer inspections
- Warehouse receipt report
- Reports tables

No server-side limits were added in this pass because that would change service contracts and could affect report totals. For real production data volume, add service-level pagination intentionally in a later phase with report-specific tests.

## Bundle And Performance Notes

- Route-level code splitting should reduce initial JavaScript parsed for the login/app shell.
- Heavy pages such as Reports, Processing Log, Output Report, Export Contracts, Purchase Registration, Data Audit, and Dashboard are now deferred until their routes are visited.
- The active report pages still perform substantial in-browser filtering and aggregation after data loads.
- `src/services/demoData.js` remains a large shared module and should be split later by domain.

## Risks

- Lazy route loading introduces a short loading state on first visit to a large route.
- Source-code tests that inspect `src/App.jsx` can be sensitive to route wrapper refactors; notification settings/history were kept explicit for this reason.
- Shared report query keys mean matching report pages intentionally share cached snapshot data for the configured stale window.
- No remote Supabase changes were made, and no deployment was performed.

## Verification Results

Commands were run in the requested order:

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
| `npm run typecheck` | Failed on known global diagnostics |

Typecheck diagnostic count: 1,067.

## Future Optimization Ideas

1. Add route prefetch on sidebar hover for the most-used modules.
2. Split `src/services/demoData.js` into domain-specific seed modules.
3. Add service-level pagination for operational list pages when moving beyond demo-sized datasets.
4. Move expensive report summaries into dedicated RPCs where totals must include full datasets.
5. Extract shared report filters/tables so memoization and pagination behavior are easier to verify.
6. Add bundle analysis tooling before removing unused packages.

