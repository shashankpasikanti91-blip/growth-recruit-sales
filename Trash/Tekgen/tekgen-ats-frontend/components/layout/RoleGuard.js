'use client';

import { useRole } from '../../lib/useRole';

/**
 * RoleGuard — conditionally renders children based on role.
 *
 * Props:
 *   allow="ADMIN"           — render only for that role
 *   allow={["ADMIN",...]}   — render for any of the listed roles
 *   fallback                — optional JSX shown when access denied (default: null)
 *
 * Usage:
 *   <RoleGuard allow="ADMIN">
 *     <AdminOnlyWidget />
 *   </RoleGuard>
 */
export default function RoleGuard({ allow, fallback = null, children }) {
  const { role } = useRole();
  const allowed = Array.isArray(allow) ? allow : [allow];
  return allowed.includes(role) ? children : fallback;
}
