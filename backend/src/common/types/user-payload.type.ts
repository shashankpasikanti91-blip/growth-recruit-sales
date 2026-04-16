/**
 * JWT payload attached to authenticated requests via JwtStrategy.
 * Used as the type for @CurrentUser() decorator across all controllers.
 */
export interface UserPayload {
  id: string;
  email: string;
  tenantId: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'RECRUITER' | 'SALES' | 'VIEWER';
  tenant: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  };
}
