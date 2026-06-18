# Demo Auth Warning

Phase 4 uses a temporary local-only demo login:

- Username: `admin`
- Password: `password`

This is not production-grade security.

## What It Does

- Stores a local demo session in browser `localStorage`.
- Protects application routes from direct access without the local demo session.
- Shows a visible `Demo Environment` indicator in the app shell.
- Keeps the auth layer isolated in `src/services/authService.js`.

## What It Does Not Do

- It does not use Supabase Auth.
- It does not verify users against a production identity provider.
- It does not protect server-side resources.
- It does not store or require Supabase service-role credentials in frontend code.

## Replacement Path

When the demo Supabase modules are stable, replace `authService` with Supabase Auth while keeping the route guard and UI session consumers stable. Production Supabase Auth should own:

- user signup/invites
- password reset
- session refresh
- organization membership lookup
- role/permission claims or server-side permission checks

Never put a Supabase service-role key in `VITE_*` frontend environment variables.
