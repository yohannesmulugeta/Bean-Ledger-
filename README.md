# Bean Ledger / KKGT Flow Demo

Bean Ledger / KKGT Flow Demo is a coffee export operations and ledger management system. It is a demo Supabase version of a migrated Base44 application, built to validate the operating workflows before any real Base44 production data is migrated.

## Current Status

- Demo-only Supabase implementation.
- Synthetic seed data only.
- Demo login only: `admin` / `password`.
- Active demo modules are wired to Supabase-backed services.
- Legacy Base44 code remains in the repository for reference and migration safety.
- This is not production-ready.

## Demo Credentials

```text
Username: admin
Password: password
```

This login is not production-grade authentication. It stores a demo session locally so the preview can be tested. Supabase Auth must replace it before production.

## Tech Stack

- React 18
- Vite
- Supabase
- TanStack React Query
- React Router
- Tailwind CSS
- Radix UI / shadcn-style primitives
- jsPDF, html2canvas, and xlsx for reports/exports
- Node-based workflow tests

## Folder Structure

```text
src/
  App.jsx                  Active route graph
  components/              Shared UI, layout, report, attachment, and module components
  lib/                     Supabase client, auth context, report/export helpers
  pages/                   Route pages
  services/                Supabase-backed demo services
scripts/
  tests/                   Phase 4 through Phase 12 workflow tests
  migration/               Base44 export and reconciliation scripts
supabase/
  migrations/              Local/demo Supabase migrations
docs/
  cleanup/                 Professional cleanup reports
  migration/               Migration phase reports and runbooks
```

## Required Environment Variables

Create `.env.local` from `.env.example`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use only a demo/staging Supabase project for this app until production migration is explicitly approved.

Do not put these values in frontend or Vercel Preview environment variables:

- Supabase service-role key
- Database password
- Base44 secrets
- Telegram token
- Production credentials

## Local Setup

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Then open the local Vite URL and log in with:

```text
admin / password
```

## Docker and Local Supabase Setup

Docker Desktop must be running before starting local Supabase.

```powershell
npx supabase start
npx supabase db reset
```

If the local database volume was created with an older Postgres version, recreate the local Docker volume only:

```powershell
npx supabase stop --no-backup
npx supabase start
npx supabase db reset
```

This local cleanup does not touch remote Supabase.

## Running Migrations Locally

Local reset applies migrations and demo seed data:

```powershell
npx supabase db reset
```

Do not run `supabase db push` unless you have explicitly confirmed a staging/demo project ref. Never push migrations to production from this cleanup branch.

## Running the App

```powershell
npm run dev
```

Build preview:

```powershell
npm run build
npm run preview
```

## Running Tests

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

## Vercel Preview Notes

Use GitHub-connected Vercel Preview deployments only while this remains demo/staging.

Vercel settings:

```text
Install command: npm install
Build command: npm run build
Output directory: dist
```

Preview environment variables:

```env
VITE_SUPABASE_URL=<demo Supabase URL>
VITE_SUPABASE_ANON_KEY=<demo Supabase anon key>
```

Do not deploy production or merge to `main` until the production readiness checklist is complete.

## Security Warnings

- Demo login is not real authentication.
- Service-role credentials must never be exposed to frontend code.
- Real customer data and documents are not migrated yet.
- The current data is synthetic demo data.
- RLS and production permissions need a final hardening pass.

## Not Production-Ready Yet

- Supabase Auth is not implemented.
- Demo `admin` / `password` login must be removed.
- Real Base44 exports and reconciliation are still required.
- Real attachment migration is still required.
- Production RLS, monitoring, backup, and error logging must be finalized.
- Final security review has not been completed.

## Remaining Base44 Migration Blockers

- Obtain real Base44 exports.
- Reconcile every entity count and source ID.
- Migrate real attachments safely.
- Preserve source IDs through production migration.
- Validate reports and balances against Base44.
- Quarantine or remove legacy Base44 code only after Supabase replacements are proven.

## Useful Commands

```powershell
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
npx supabase start
npx supabase db reset
npm run migration:base44:plan
npm run migration:base44:prepare
npm run migration:base44:package
npm run migration:base44:reconcile
npm run migration:base44:phase3
```

