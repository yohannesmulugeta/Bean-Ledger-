/**
 * Bridge file — redirects to the real implementation in role-hooks.js.
 * This file exists only to resolve stale Vite module references.
 * No useQuery here — role-hooks.js uses plain useState/useEffect with AuthContext.
 */
export { useRole, usePermission, ROLES, ROLE_LABELS, MODULES, PERMISSION_TYPES, ADMIN_ROUTES, DEFAULT_ROLE_PERMISSIONS, DEFAULT_ROLE_ROUTES } from '@/lib/role-hooks';