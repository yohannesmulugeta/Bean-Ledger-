# Auth and Permissions Plan

## Current behavior

- Demo fallback users exist in `src/lib/role-hooks.js` and `src/lib/useUser.js`; absent auth becomes `demo@beanledgerexport.com` with `admin` role.
- `src/api/base44Client.js` sets `requiresAuth: false`.
- `src/App.jsx` redirects login, register, forgot-password, reset-password, and signup routes to `/`.
- `ProtectedRoute` exists but is not mounted around the main app route tree.
- `ModuleRouteGuard` enforces frontend `can_view` permissions; `RouteGuard` also exists but is not the primary route wrapper.
- Roles and permissions come from constants in `src/lib/role-hooks.js` with optional Base44 `RolePermission` and `SecuritySetting` overrides.

## Recommended Supabase Auth flow

- Use Supabase Auth for sessions and JWTs. The frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Profiles are created by a server-side invite/admin flow, not public self-registration.
- Invitation-only user creation: admin/supervisor with permission creates an invite; an Edge Function or admin API creates auth user and profile membership.
- Initial admin creation: run a one-time local/staging SQL seed or admin Edge Function after project setup; do not expose service role in frontend.
- Password reset: Supabase reset email with a dedicated reset route after routes are restored.
- Disabled users: keep `profiles.status`/`is_active`; RLS helper functions must deny disabled users even if their auth session is valid.
- Session handling: centralize in `authService`, subscribe to auth state changes, fetch profile/membership/permissions after session load.
- Route protection: mount a real protected route around the app layout before removing demo fallback.
- RLS enforcement: every business table checks organization membership and required permission; frontend guards become UX only, not security.

## Do not change yet

The demo fallback and Base44 auth behavior remain in place during phase 1 to preserve production behavior.
