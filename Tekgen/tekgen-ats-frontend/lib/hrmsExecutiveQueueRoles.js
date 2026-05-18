/**
 * Roles allowed to call GET /api/hrms/executive/pending-queue and use the unified
 * executive pending UI branch. Keep aligned with
 * tekgen-ats-backend/src/routes/hrmsRoutes.js (HRMS_EXEC_OR_OPS).
 *
 * Org-wide Executive Pending Center (all departments / ops KPIs) is narrower; see
 * isHrmsGlobalPendingCenterRole (shared/hrmsPendingScope.js).
 */
const {
  HRMS_GLOBAL_PENDING_CENTER_ROLES,
  isHrmsGlobalPendingCenterRole: globalPendingFn,
} = require('../../shared/hrmsPendingScope');

export { HRMS_GLOBAL_PENDING_CENTER_ROLES };

export const HRMS_EXECUTIVE_QUEUE_ROLES = [
  'HR_ADMIN',
  'PAYROLL_ADMIN',
  'ADMIN',
  'MANAGEMENT',
  'ASSISTANT_MANAGER',
  'DIRECTOR',
  'HEAD',
  'MD',
  'MANAGING_DIRECTOR',
  'DEPT_HEAD',
  'DEPARTMENT_HEAD',
  'COMPANY_HEAD',
  'SUPER_ADMIN',
];

export function isHrmsExecutiveQueueRole(role) {
  return Boolean(role && HRMS_EXECUTIVE_QUEUE_ROLES.includes(role));
}

/** Admin / MD / heads: full org pending dashboard (matches backend global scope rules). */
export function isHrmsGlobalPendingCenterRole(role) {
  return globalPendingFn(role);
}
