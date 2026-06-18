# Phase 5 Local Verification

## Commands Attempted

```powershell
npx supabase --version
npx supabase start
```

## Result

- Supabase CLI is installed: `2.101.0`
- `npx supabase start` did not start because Docker Desktop is unavailable or not running.

Observed error:

```text
Docker Desktop is a prerequisite for local development.
```

The failure happened before database startup. No remote Supabase project was linked or modified, and `supabase db push` was not run.

## Pending Once Docker Is Available

```powershell
npx supabase start
npx supabase db reset
npx supabase status
```

Then verify:

- all migrations apply from an empty local database
- seed data loads
- purchase calculation RPCs execute
- warehouse receipt RPCs execute
- synthetic supplier, purchase, receipt, movement, and history records exist
- a second `supabase db reset` is deterministic
