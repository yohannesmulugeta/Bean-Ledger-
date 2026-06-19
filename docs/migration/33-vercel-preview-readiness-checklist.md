# Vercel Preview Readiness Checklist

Phase 11 prepares for a later Vercel preview preparation phase. It does not deploy.

## Status

| Check | Status | Notes |
| --- | --- | --- |
| SPA rewrite | Ready | `vercel.json` rewrites all routes to `/index.html`. |
| Build command | Ready locally | Use `npm run build`. |
| Frontend env vars | Ready for demo | Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are expected. |
| Service-role credentials | Blocked | Never use service-role credentials in frontend `VITE_` variables. |
| `.env` files committed | Safe | `.env` and `.env.*` are ignored; `.env.example` remains tracked. |
| Real Base44 exports committed | Safe | `exports/base44/manual-drop/` and `exports/base44/runs/` are ignored. |
| Demo data synthetic | Ready | Seeds remain clearly marked with `is_demo = true` and demo names. |
| Demo login | Ready for preview only | Local username `admin`, password `password`; not production auth. |
| Base44 plugin required | Needs Phase 12 decision | `@base44/vite-plugin` still exists in `vite.config.js`; active demo route files are clean, but plugin/package removal should be attempted before preview if build remains stable. |
| Production Supabase | Not used | No `supabase db push`, no production deploy, no real data import. |

## Required Vercel Environment

Use only safe public frontend variables:

```text
VITE_SUPABASE_URL=<preview/local demo Supabase URL>
VITE_SUPABASE_ANON_KEY=<anon key only>
```

Do not configure:

```text
SUPABASE_SERVICE_ROLE_KEY
BASE44_API_KEY
BASE44_TOKEN
CUSTOMER_EXPORT_PATH
```

## Preview Gate

Before creating a Vercel preview:

1. Run `npx supabase db reset` locally.
2. Run `npm run build`.
3. Run `npm run lint`.
4. Run `npm run test:phase4` through `npm run test:phase11`.
5. Confirm `npm run typecheck` has no new Phase 11 diagnostics versus the 1248 baseline.
6. Confirm no `.env` files, customer exports, document uploads, or database dumps are staged.
7. Confirm the active route surface does not import `@/api/base44Client`.

## Not Production Ready

The preview would still be demo-only. It must not be described as production secure because:

- Auth is a local demo session, not Supabase Auth.
- Roles are local/default route guards, not production policy management.
- Demo data is synthetic and incomplete.
- Notification delivery is in-app demo only.
- Base44 reference code remains for future migration.
