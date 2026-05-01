import { getUser } from './auth';

// Tekgen AI HRMS — full enterprise role set
// Backend currently stores ADMIN | RECRUITER; extended roles are forward-compatible.
export const ROLES = {
  SUPER_ADMIN:         'SUPER_ADMIN',
  ADMIN:               'ADMIN',
  MANAGEMENT:          'MANAGEMENT',
  HR_ADMIN:            'HR_ADMIN',
  RECRUITMENT_MANAGER: 'RECRUITMENT_MANAGER',
  RECRUITER:           'RECRUITER',
  SALES_MANAGER:       'SALES_MANAGER',
  SALES_EXECUTIVE:     'SALES_EXECUTIVE',
  PAYROLL_ADMIN:       'PAYROLL_ADMIN',
  EMPLOYEE_VIEWER:     'EMPLOYEE_VIEWER',
};

const ADMIN_ROLES  = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
const MGMT_ROLES   = [...ADMIN_ROLES, ROLES.MANAGEMENT];
const HR_ROLES     = [...MGMT_ROLES, ROLES.HR_ADMIN];
const RECRUIT_ROLES= [...HR_ROLES, ROLES.RECRUITMENT_MANAGER, ROLES.RECRUITER];
const SALES_ROLES  = [...MGMT_ROLES, ROLES.SALES_MANAGER, ROLES.SALES_EXECUTIVE];
const PAYROLL_ROLES= [...ADMIN_ROLES, ROLES.PAYROLL_ADMIN];

/**
 * useRole — reads the current user's role from auth storage.
 * Falls back to RECRUITER for backward-compat with existing accounts.
 */
export function useRole() {
  const user = getUser();
  // Existing DB users have role ADMIN or RECRUITER — map both into new system
  const rawRole = user?.role ?? 'RECRUITER';
  const role = rawRole;

  const hasRole = (...allowed) => allowed.includes(role);

  return {
    role,
    user,
    // Legacy flags (backward compatible)
    isAdmin:     hasRole(...ADMIN_ROLES),
    isRecruiter: hasRole(ROLES.RECRUITER, ROLES.RECRUITMENT_MANAGER),
    isSuperAdmin:hasRole(ROLES.SUPER_ADMIN),
    isManagement:hasRole(...MGMT_ROLES),
    isHRAdmin:   hasRole(...HR_ROLES),
    isSalesRole: hasRole(...SALES_ROLES),
    isPayroll:   hasRole(...PAYROLL_ROLES),

    // Module access flags
    canAccessRecruitment: hasRole(...RECRUIT_ROLES),
    canAccessSalesCRM:    hasRole(...SALES_ROLES),
    canAccessHR:          hasRole(...HR_ROLES),
    canAccessPayroll:     hasRole(...PAYROLL_ROLES),
    canAccessVisa:        hasRole(...MGMT_ROLES, ROLES.HR_ADMIN),
    canAccessFinance:     hasRole(...ADMIN_ROLES, ROLES.MANAGEMENT),
    canAccessAnalytics:   hasRole(...MGMT_ROLES, ROLES.HR_ADMIN, ROLES.RECRUITMENT_MANAGER),
    canAccessAdmin:       hasRole(...ADMIN_ROLES),

    // Legacy helpers
    isOwner: (ownerId) => user?.id === ownerId,
    canViewAll:              hasRole(...ADMIN_ROLES),
    canManageIntegrations:   hasRole(...ADMIN_ROLES),
    canReassign:             hasRole(...ADMIN_ROLES),
    canAccessSettings:       hasRole(...ADMIN_ROLES),
  };
}
