# Demo Database Security Limitations

Phase 5 is still a local/demo migration phase. The `admin` / `password` login is a client-side demo access gate only.

## Current Limits

- Demo login does not protect direct Supabase API access.
- Full Supabase Auth is not implemented yet.
- RLS policies exist for membership-based access, but the frontend demo session is not a production identity boundary.
- No Supabase service-role key is used in frontend code.
- Local demo data is synthetic and marked with `is_demo`.

## Before Public Deployment

- Replace demo login with Supabase Auth.
- Ensure authenticated users are members of an organization before any operational data access.
- Review all RLS policies with real roles and least-privilege grants.
- Keep service-role credentials server-only.
- Disable direct writes that should only happen through transaction RPCs.
- Run local and staging database resets before any production migration.

Do not deploy this demo to Vercel as a public production system.
