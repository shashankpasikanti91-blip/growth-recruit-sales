const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { encryptPassword } = require('../utils/encryption');
const config = require('../config/environment');
const notificationService = require('../services/notificationService');
const approvalService = require('../services/approvalService');
const salesService = require('../services/salesService');
const recruitmentDeliveryService = require('../services/recruitmentDeliveryService');
const jobBulkHiringRequestService = require('../services/jobBulkHiringRequestService');
const { resolveUploadAbsolute } = require('../utils/secureUploadPath');
const {
  shouldScopeExecutivePendingQueueByDepartment,
  shouldShowOrgWideModulePendingCounts,
} = require('../../../shared/hrmsPendingScope');

const ROLE_DEPARTMENT_MAP = {
  RECRUITMENT_MANAGER: 'Recruitment',
  RECRUITER: 'Recruitment',
  SALES_MANAGER: 'Sales',
  SALES_EXECUTIVE: 'Sales',
  HR_ADMIN: 'HR Operations',
  PAYROLL_ADMIN: 'Payroll',
  FINANCE_HEAD: 'Finance',
  MANAGEMENT: 'Management',
  ADMIN: 'Management',
  SUPER_ADMIN: 'Management',
  EMPLOYEE: 'Operations',
  EMPLOYEE_VIEWER: 'Operations',
  DEPLOYED_STAFF: 'Operations',
  CONTRACTOR: 'Operations',
  CLIENT_APPROVER: 'Operations',
};

function getExpectedDepartmentForRole(role) {
  return ROLE_DEPARTMENT_MAP[role] || null;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values.map((v) => v.replace(/^"|"$/g, '').trim());
}

/** @returns {Date|undefined} */
function parseOptionalDate(raw) {
  if (raw == null || String(raw).trim() === '') return undefined;
  const d = new Date(String(raw).trim());
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function buildDependentsFromCols(cols, idx) {
  const out = [];
  for (let n = 1; n <= 3; n += 1) {
    const name =
      cols[idx(`dependent_${n}_name`)] ||
      cols[idx(`dep${n}_name`)] ||
      cols[idx(`dp${n}_name`)];
    if (!name || !String(name).trim()) continue;
    const relationship =
      cols[idx(`dependent_${n}_relationship`)] ||
      cols[idx(`dep${n}_relationship`)] ||
      cols[idx(`dp${n}_relationship`)] ||
      null;
    const passType =
      cols[idx(`dependent_${n}_pass_type`)] ||
      cols[idx(`dep${n}_pass_type`)] ||
      cols[idx(`dp${n}_pass_type`)] ||
      null;
    const expiryRaw =
      cols[idx(`dependent_${n}_expiry`)] ||
      cols[idx(`dep${n}_expiry`)] ||
      cols[idx(`dp${n}_expiry`)];
    const passportNo =
      cols[idx(`dependent_${n}_passport`)] ||
      cols[idx(`dep${n}_passport`)] ||
      cols[idx(`dp${n}_passport`)] ||
      null;
    const expiry = parseOptionalDate(expiryRaw);
    out.push({
      name: String(name).trim(),
      relationship: relationship ? String(relationship).trim() : null,
      passType: passType ? String(passType).trim() : null,
      expiryDate: expiry ? expiry.toISOString().slice(0, 10) : null,
      passportNo: passportNo ? String(passportNo).trim() : null,
    });
  }
  return out.length ? out : undefined;
}

/** Visa / permit columns for CSV import (employee rows or visa-only rows). */
function visaFieldsFromCols(cols, idx) {
  const visaExpiry = parseOptionalDate(
    cols[idx('visa_expiry')] ||
      cols[idx('visa_expiry_date')] ||
      cols[idx('work_permit_expiry')] ||
      cols[idx('permit_expiry')]
  );
  const passportExpiry = parseOptionalDate(
    cols[idx('passport_expiry')] || cols[idx('passport_expiry_date')]
  );
  const nricPassport =
    cols[idx('nric_passport')] ||
    cols[idx('nric')] ||
    cols[idx('passport_no')] ||
    cols[idx('passport')] ||
    null;
  const permitType = cols[idx('permit_type')] || cols[idx('pass_type')] || null;
  let visaCaseType =
    cols[idx('visa_case_type')] || cols[idx('case_type')] || cols[idx('application_type')] || null;
  if (visaCaseType && String(visaCaseType).trim()) {
    visaCaseType = String(visaCaseType).trim().toUpperCase();
  } else {
    visaCaseType = null;
  }
  const dependents = buildDependentsFromCols(cols, idx);
  /** @type {Record<string, unknown>} */
  const data = {};
  if (visaExpiry) data.visaExpiryDate = visaExpiry;
  if (passportExpiry) data.passportExpiryDate = passportExpiry;
  if (nricPassport && String(nricPassport).trim()) data.nricPassport = String(nricPassport).trim();
  if (permitType && String(permitType).trim()) data.permitType = String(permitType).trim();
  if (visaCaseType) data.visaCaseType = visaCaseType;
  if (dependents) data.visaDependents = dependents;
  return data;
}

class HrmsController {
  async generateEmployeeId() {
    const last = await prisma.employeeProfile.findFirst({
      where: { employeeId: { contains: 'TKG-EMP-' } },
      orderBy: { employeeId: 'desc' },
      select: { employeeId: true },
    });
    let nextNum = 1;
    if (last?.employeeId) {
      const m = last.employeeId.match(/TKG-EMP-(\d+)/);
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }
    return `TKG-EMP-${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * GET /api/hrms/kpis
   * Aggregated KPI dashboard data for the HRMS Operations Hub.
   * Pulls real data from existing models; stubs 0 for modules not yet built.
   */
  async getKpis(req, res, next) {
    try {
      const userRole = req.user?.role || null;
      const userId = req.user?.id || null;
      const executiveRoles = ['MANAGEMENT', 'ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD', 'MD', 'MANAGING_DIRECTOR', 'DEPT_HEAD', 'DEPARTMENT_HEAD', 'COMPANY_HEAD'];
      const isExecutiveUser = executiveRoles.includes(userRole);
      const payrollRoleMap = {
        PAYROLL_ADMIN: 'PAYROLL_ADMIN',
        MANAGEMENT: 'MANAGEMENT',
        FINANCE_HEAD: 'MANAGEMENT',
        FINANCE: 'FINANCE',
        ADMIN: 'MANAGEMENT',
        HR_ADMIN: 'MANAGEMENT',
        SUPER_ADMIN: 'MANAGEMENT',
        DIRECTOR: 'MANAGEMENT',
        HEAD: 'MANAGEMENT',
        MD: 'MANAGEMENT',
        MANAGING_DIRECTOR: 'MANAGEMENT',
        DEPT_HEAD: 'MANAGEMENT',
        DEPARTMENT_HEAD: 'MANAGEMENT',
        COMPANY_HEAD: 'MANAGEMENT'
      };

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // ── Recruitment KPIs (real data) ─────────────────────────────────────
      const [
        openJobs,
        candidatesToday,
        interviewsScheduled,
        offersPending,
        offeredThisMonth,
        totalCandidates,
        totalJobs,
      ] = await Promise.all([
        prisma.job.count({ where: { status: 'OPEN' } }),
        prisma.candidate.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.application.count({ where: { status: 'INTERVIEWED', updatedAt: { gte: startOfDay } } }),
        prisma.application.count({ where: { status: 'OFFERED' } }),
        prisma.application.count({ where: { status: 'OFFERED', updatedAt: { gte: startOfMonth } } }),
        prisma.candidate.count(),
        prisma.job.count(),
      ]);

      // ── Recent activities (last 10) ──────────────────────────────────────
      const recentActivities = await prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }).catch(() => []);

      // ── Follow-ups due today ─────────────────────────────────────────────
      const followupsDueToday = await prisma.followUp.count({
        where: { dueDate: { gte: startOfDay, lt: nextMonth }, status: 'PENDING' },
      }).catch(() => 0);

      const [totalEmployees, newJoiners, leaveRequests, attendanceToday] = await Promise.all([
        prisma.employeeProfile.count({ where: { status: 'ACTIVE' } }),
        prisma.employeeProfile.count({ where: { joinDate: { gte: startOfMonth, lt: nextMonth } } }),
        prisma.leaveRequest.count({ where: { status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW'] } } }),
        prisma.attendance.count({ where: { date: { gte: startOfDay }, status: 'PRESENT' } }).catch(() => 0),
      ]);

      const [payrollPendingRuns, payrollClaimsPending, payrollProcessedAggregate] = await Promise.all([
        prisma.payrollRun.count({
          where: {
            status: {
              in: ['DRAFT', 'READY', 'EXCEPTIONS', 'UNDER_REVIEW', 'FINANCE_REVIEW', 'APPROVED', 'GENERATED']
            }
          }
        }).catch(() => 0),
        prisma.claim.count({
          where: { status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW'] } }
        }).catch(() => 0),
        prisma.payrollRun.aggregate({
          where: {
            month: today.getMonth() + 1,
            year: today.getFullYear(),
            status: { in: ['PUBLISHED', 'CLOSED'] }
          },
          _sum: { netPayout: true }
        }).catch(() => ({ _sum: { netPayout: 0 } })),
      ]);

      const [
        visaApplicationsPending,
        offerLettersPending,
        onboardingInProgress,
        offboardingActive,
        invoicesPendingApproval,
      ] = await Promise.all([
        prisma.visaCase.count({ where: { permitStatus: 'APPLICATION' } }).catch(() => 0),
        prisma.candidateOnboarding
          .count({
            where: { offerStatus: 'PENDING', status: { not: 'COMPLETED' } },
          })
          .catch(() => 0),
        prisma.candidateOnboarding.count({ where: { status: 'IN_PROGRESS' } }).catch(() => 0),
        prisma.employeeProfile
          .count({ where: { status: { in: ['ON_NOTICE', 'RESIGNED', 'TERMINATED'] } } })
          .catch(() => 0),
        prisma.invoice.count({ where: { status: { in: ['DRAFT', 'SUBMITTED'] } } }).catch(() => 0),
      ]);

      const [pendingLeaveApprovalsForUser, pendingClaimApprovalsForUser, pendingPayrollApprovalsForUser] = await Promise.all([
        userId
          ? prisma.leaveApproval.count({
              where: isExecutiveUser
                ? { status: 'PENDING', OR: [{ assignedTo: userId }, { approverRole: 'MANAGING_DIRECTOR' }] }
                : { assignedTo: userId, status: 'PENDING' }
            }).catch(() => 0)
          : Promise.resolve(0),
        userId
          ? prisma.claimApproval.count({
              where: isExecutiveUser
                ? { status: 'PENDING', OR: [{ assignedTo: userId }, { approverRole: 'MANAGING_DIRECTOR' }] }
                : { assignedTo: userId, status: 'PENDING' }
            }).catch(() => 0)
          : Promise.resolve(0),
        userId && userRole
          ? prisma.payrollApproval.count({
              where: {
                status: 'PENDING',
                requiredRole: payrollRoleMap[userRole] || '__NO_MATCH__'
              }
            }).catch(() => 0)
          : Promise.resolve(0),
      ]);

      const payrollPendingRunsForRole = (userRole === 'PAYROLL_ADMIN')
        ? pendingPayrollApprovalsForUser
        : payrollPendingRuns;
      // Executives: show org-wide pipeline counts that match /hrms/leaves/pending & /payroll/admin/claims lists.
      const effectivePendingLeaves = isExecutiveUser ? leaveRequests : pendingLeaveApprovalsForUser;
      const effectivePendingClaims = isExecutiveUser ? payrollClaimsPending : pendingClaimApprovalsForUser;
      const effectivePendingPayroll = isExecutiveUser ? payrollPendingRuns : pendingPayrollApprovalsForUser;

      let salesPulse = null;
      if (userId && userRole) {
        try {
          salesPulse = await salesService.getSalesPulse(userId, userRole);
        } catch (pulseErr) {
          logger.warn(`[${req.id}] Sales pulse omitted`, pulseErr?.message || pulseErr);
        }
      }

      let recruitmentDelivery = null;
      if (userId && userRole) {
        try {
          recruitmentDelivery = await recruitmentDeliveryService.getRecruitmentDeliveryPulse(userId, userRole);
        } catch (rdErr) {
          logger.warn(`[${req.id}] Recruitment delivery pulse omitted`, rdErr?.message || rdErr);
        }
      }

      let bulkImportBatches = [];
      const bulkMonitorRoles = [
        'ADMIN',
        'SUPER_ADMIN',
        'MANAGEMENT',
        'RECRUITMENT_MANAGER',
        'SALES_MANAGER',
        'SALES_EXEC',
        'SALES_EXECUTIVE',
      ];
      if (userRole && bulkMonitorRoles.includes(userRole)) {
        try {
          bulkImportBatches = await jobBulkHiringRequestService.listBatches({ limit: 10 });
        } catch (batchErr) {
          logger.warn(`[${req.id}] bulk import batches omitted`, batchErr?.message || batchErr);
        }
      }

      return sendSuccess(res, {
        recruitment: {
          openJobs,
          candidatesToday,
          interviewsScheduled,
          offersPending,
          hiredThisMonth: offeredThisMonth,
          totalCandidates,
          totalJobs,
          bulkImportBatches,
        },
        hr: {
          totalEmployees,
          newJoiners,
          leaveRequests: isExecutiveUser ? leaveRequests : pendingLeaveApprovalsForUser,
          attendanceToday,
        },
        payroll: {
          pendingRuns: payrollPendingRunsForRole,
          salaryProcessed: Math.round(Number(payrollProcessedAggregate?._sum?.netPayout || 0) * 100) / 100,
          claimsPending: payrollClaimsPending,
          pendingApprovalsForRole: pendingPayrollApprovalsForUser,
        },
        sales: {
          leadsOpen:        0,
          followUpsDue:     followupsDueToday,
          opportunitiesWon: 0,
          interviewsToday:        salesPulse?.interviewsToday ?? 0,
          salesFollowUpsToday:    salesPulse?.salesFollowUpsToday ?? 0,
          newRequirementsWeek:    salesPulse?.newRequirementsWeek ?? 0,
          submissionsToday:       salesPulse?.submissionsToday ?? 0,
          highPriorityOpenJobs:   salesPulse?.highPriorityOpen ?? 0,
          submissionTargetsDue7d: salesPulse?.submissionTargetsDue7d ?? 0,
          agreementsRenewal30d:   salesPulse?.agreementsRenewalWindow ?? 0,
          invoicesNeedAttention:  salesPulse?.invoicesAttention ?? 0,
          alerts:                 salesPulse?.alerts ?? [],
        },
        visa: {
          renewalsDue:       0,
          expiringPermits:   0,
          newApplications:   visaApplicationsPending,
        },
        finance: {
          invoicesPending:   invoicesPendingApproval,
          paidThisMonth:     0,
        },
        operations: {
          offerLettersPending,
          onboardingInProgress,
          offboardingRecords: offboardingActive,
          invoicesPendingApproval,
          visaApplicationsPending,
          pendingLeavePipeline: leaveRequests,
          pendingClaimPipeline: payrollClaimsPending,
        },
        meta: {
          recentActivities,
          generatedAt: new Date().toISOString(),
        },
        recruitmentDelivery: recruitmentDelivery || {
          highPriorityJobs: [],
          jobsMissingMandatoryDates: [],
          submissionPipelineByStage: {},
          roleScope: 'none',
        },
        pendingActions: {
          leaves: effectivePendingLeaves,
          claims: effectivePendingClaims,
          payrollApprovals: effectivePendingPayroll,
          total: effectivePendingLeaves + effectivePendingClaims + effectivePendingPayroll,
        },
      }, 'HRMS KPIs retrieved', 200);
    } catch (error) {
      logger.error(`[${req.id}] HRMS KPI error`, error);
      return sendError(res, 'Failed to load KPIs', 500);
    }
  }

  /**
   * GET /api/hrms/employees
   * Employee master list for HR Operations
   */
  async getEmployees(req, res, next) {
    try {
      const { search = '', status = 'ACTIVE', limit = 100, offset = 0 } = req.query;
      const where = {};
      if (status && status !== 'ALL') where.status = status;
      if (search) {
        where.OR = [
          { employeeId: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
          { designation: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }

      const [employees, total] = await Promise.all([
        prisma.employeeProfile.findMany({
          where,
          include: {
            user: { select: { firstName: true, lastName: true, email: true, role: true } },
          },
          orderBy: { employeeId: 'asc' },
          take: parseInt(limit),
          skip: parseInt(offset),
        }),
        prisma.employeeProfile.count({ where }),
      ]);

      return sendSuccess(res, { employees, total });
    } catch (error) {
      logger.error(`[${req.id}] HRMS employees error`, error);
      return sendError(res, 'Failed to load employees', 500);
    }
  }

  /**
   * GET /api/hrms/attendance/summary
   * Monthly attendance summary for HR dashboard page
   */
  async getAttendanceSummary(req, res, next) {
    try {
      const now = new Date();
      const month = parseInt(req.query.month) || (now.getMonth() + 1);
      const year = parseInt(req.query.year) || now.getFullYear();
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const records = await prisma.attendance.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }],
      }).catch(() => []);

      const summary = {
        present: records.filter((r) => r.status === 'PRESENT').length,
        absent: records.filter((r) => r.status === 'ABSENT').length,
        leave: records.filter((r) => ['LEAVE', 'SICK', 'UNPAID_LEAVE'].includes(r.status)).length,
        total: records.length,
      };

      return sendSuccess(res, { month, year, summary, records });
    } catch (error) {
      logger.error(`[${req.id}] HRMS attendance summary error`, error);
      return sendError(res, 'Failed to load attendance summary', 500);
    }
  }

  /**
   * GET /api/hrms/leaves/pending
   * Pending leave requests for HR Operations panel
   */
  async getPendingLeaves(req, res, next) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const where = { status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW'] } };

      const [leaves, total] = await Promise.all([
        prisma.leaveRequest.findMany({
          where,
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                department: true,
                employmentType: true,
                staffType: true,
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
            attachments: { select: { id: true, fileName: true, fileUrl: true } },
            approvals: {
              select: {
                id: true,
                approvalLevel: true,
                approverRole: true,
                status: true,
                assignedTo: true,
                approvedBy: true,
                approvedAt: true,
                comments: true,
              },
              orderBy: { approvalLevel: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
        }),
        prisma.leaveRequest.count({ where }),
      ]);

      const enrichedLeaves = await Promise.all(
        leaves.map(async (leave) => {
          const samePeriodTeamCount = await prisma.leaveRequest.count({
            where: {
              id: { not: leave.id },
              status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW', 'APPROVED'] },
              employee: { department: leave.employee?.department || undefined },
              startDate: { lte: leave.endDate },
              endDate: { gte: leave.startDate },
            },
          });

          const overlapForEmployeeCount = await prisma.leaveRequest.count({
            where: {
              id: { not: leave.id },
              employeeId: leave.employeeId,
              status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW', 'APPROVED'] },
              startDate: { lte: leave.endDate },
              endDate: { gte: leave.startDate },
            },
          });

          const warnings = [];
          if (samePeriodTeamCount > 0) warnings.push(`Team overlap: ${samePeriodTeamCount} other leave(s) in same period`);
          if (overlapForEmployeeCount > 0) warnings.push('Employee has overlapping leave request');
          if (leave.daysCount > 5 && !leave.reason) warnings.push('Long leave without detailed reason');
          if (['MEDICAL', 'HOSPITALIZATION'].includes(leave.leaveType) && (!leave.attachments || leave.attachments.length === 0)) {
            warnings.push('Medical/Hospitalization leave without attachment');
          }
          if (leave.leaveType === 'NO_PAY') warnings.push('No-pay leave impacts payroll deductions');

          return { ...leave, policyWarnings: warnings };
        })
      );

      return sendSuccess(res, { leaves: enrichedLeaves, total });
    } catch (error) {
      logger.error(`[${req.id}] HRMS pending leaves error`, error);
      return sendError(res, 'Failed to load pending leaves', 500);
    }
  }

  /**
   * GET /api/hrms/executive/pending-queue
   * Unified operational queue with reference IDs and per-user actionability.
   */
  async getExecutivePendingQueue(req, res, next) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const userDepartment = req.user?.department || null;
      const { limit = 120 } = req.query;

      const scopeDept = shouldScopeExecutivePendingQueueByDepartment(userRole, userDepartment);
      const employeeDeptFilter = scopeDept && userDepartment ? { department: userDepartment } : undefined;

      const leaveWhere = {
        status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW'] },
        ...(employeeDeptFilter ? { employee: employeeDeptFilter } : {}),
      };
      const claimWhere = {
        status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW'] },
        ...(employeeDeptFilter ? { employee: employeeDeptFilter } : {}),
      };

      const showOrgModules = shouldShowOrgWideModulePendingCounts(userRole);

      const [
        leaveRows,
        claimRows,
        visaApplicationsPending,
        offerLettersPending,
        onboardingInProgress,
        offboardingRecords,
        invoicesPendingApproval,
      ] = await Promise.all([
        prisma.leaveRequest.findMany({
          where: leaveWhere,
          take: parseInt(limit, 10),
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                department: true,
                employmentType: true,
                staffType: true,
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
            attachments: { select: { id: true, fileName: true, fileUrl: true } },
            approvals: { orderBy: { approvalLevel: 'asc' } },
          },
        }),
        prisma.claim.findMany({
          where: claimWhere,
          take: parseInt(limit, 10),
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                department: true,
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
            attachments: { select: { id: true, fileName: true, fileUrl: true } },
            approvals: { orderBy: { approvalLevel: 'asc' } },
          },
        }),
        showOrgModules
          ? prisma.visaCase.count({ where: { permitStatus: 'APPLICATION' } }).catch(() => 0)
          : Promise.resolve(0),
        showOrgModules
          ? prisma.candidateOnboarding
              .count({
                where: { offerStatus: 'PENDING', status: { not: 'COMPLETED' } },
              })
              .catch(() => 0)
          : Promise.resolve(0),
        showOrgModules
          ? prisma.candidateOnboarding.count({ where: { status: 'IN_PROGRESS' } }).catch(() => 0)
          : Promise.resolve(0),
        showOrgModules
          ? prisma.employeeProfile
              .count({ where: { status: { in: ['ON_NOTICE', 'RESIGNED', 'TERMINATED'] } } })
              .catch(() => 0)
          : Promise.resolve(0),
        showOrgModules
          ? prisma.invoice.count({ where: { status: { in: ['DRAFT', 'SUBMITTED'] } } }).catch(() => 0)
          : Promise.resolve(0),
      ]);

      const mapLeave = (leave) => {
        const pending = approvalService.getPendingApprovalRecord(leave);
        let canApprove = false;
        let canReject = false;
        if (pending) {
          try {
            approvalService.assertActorCanProcessApproval({
              approval: pending,
              userId,
              userRole,
              label: 'leave',
            });
            canApprove = true;
            canReject = true;
          } catch {
            canApprove = false;
            canReject = false;
          }
        }
        return {
          kind: 'LEAVE',
          referenceNo: leave.displayId || leave.id,
          entityId: leave.id,
          pendingApprovalId: pending?.id || null,
          requiredLevel: pending?.approvalLevel || leave.currentApprovalLevel || null,
          approverRole: pending?.approverRole || null,
          assignedTo: pending?.assignedTo || null,
          canApprove,
          canReject,
          leaveRequest: leave,
        };
      };

      const mapClaim = (claim) => {
        const pending = approvalService.getPendingApprovalRecord(claim);
        let canApprove = false;
        let canReject = false;
        if (pending) {
          try {
            approvalService.assertActorCanProcessApproval({
              approval: pending,
              userId,
              userRole,
              label: 'claim',
            });
            canApprove = true;
            canReject = true;
          } catch {
            canApprove = false;
            canReject = false;
          }
        }
        return {
          kind: 'CLAIM',
          referenceNo: claim.displayId || claim.id,
          entityId: claim.id,
          pendingApprovalId: pending?.id || null,
          requiredLevel: pending?.approvalLevel || claim.currentApprovalLevel || null,
          approverRole: pending?.approverRole || null,
          assignedTo: pending?.assignedTo || null,
          canApprove,
          canReject,
          claim,
        };
      };

      return sendSuccess(
        res,
        {
          leaves: leaveRows.map(mapLeave),
          claims: claimRows.map(mapClaim),
          modules: {
            visaApplicationsPending,
            offerLettersPending,
            onboardingInProgress,
            offboardingRecords,
            invoicesPendingApproval,
          },
        },
        'Executive pending queue',
        200
      );
    } catch (error) {
      logger.error(`[${req.id}] HRMS executive pending queue error`, error);
      return sendError(res, 'Failed to load executive pending queue', 500);
    }
  }

  /**
   * GET /api/hrms/employees/:id
   */
  async getEmployeeById(req, res, next) {
    try {
      const lookup = req.params.id;
      const where = lookup.startsWith('TKG-') ? { employeeId: lookup } : { id: lookup };
      const employee = await prisma.employeeProfile.findFirst({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true } },
          leaveBalances: true,
          documents: {
            orderBy: { uploadedAt: 'desc' },
            select: {
              id: true,
              documentType: true,
              documentName: true,
              fileName: true,
              fileUrl: true,
              fileSize: true,
              expiryDate: true,
              issueDate: true,
              uploadedAt: true,
            },
          },
          paymentAgreements: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              clientId: true,
              clientLeaveApproverUserId: true,
              client: { select: { id: true, clientName: true } },
            },
          },
        },
      });
      if (!employee) return sendError(res, 'Employee not found', 404);
      return sendSuccess(res, { employee });
    } catch (error) {
      logger.error(`[${req.id}] HRMS employee detail error`, error);
      return sendError(res, 'Failed to load employee', 500);
    }
  }

  /**
   * POST /api/hrms/employees
   */
  async createEmployee(req, res, next) {
    try {
      const {
        firstName,
        lastName,
        email,
        role = 'EMPLOYEE',
        department,
        designation,
        employmentType = 'INTERNAL',
        joinDate,
        workLocation,
        workState,
        nationality,
        phone,
        nricPassport,
        dob,
        gender,
        personalEmail,
        address,
        emergencyName,
        emergencyPhone,
        emergencyRelation,
        visaStatus,
        visaExpiryDate,
        passportExpiryDate,
        permitType,
        visaCaseType,
        visaDependents,
        managerId,
        clientId,
        clientLeaveApproverUserId,
      } = req.body;

      if (!firstName || !lastName || !email) {
        return sendError(res, 'firstName, lastName, email are required', 400);
      }

      const expectedDepartment = getExpectedDepartmentForRole(role);
      const normalizedDepartment = department || expectedDepartment;
      if (expectedDepartment && department && department !== expectedDepartment && !['EMPLOYEE', 'EMPLOYEE_VIEWER', 'DEPLOYED_STAFF', 'CONTRACTOR', 'CLIENT_APPROVER'].includes(role)) {
        return sendError(res, `Role ${role} must belong to department ${expectedDepartment}`, 400);
      }
      if (employmentType === 'DEPLOYED' && !clientId) {
        return sendError(res, 'clientId is required for deployed staff', 400);
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return sendError(res, 'Email already exists', 400);

      const employeeId = await this.generateEmployeeId();
      const tempPassword = req.body.tempPassword || `${firstName}@2026`;
      const hashedPassword = await encryptPassword(tempPassword, config.BCRYPT_ROUNDS);

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role,
            department: normalizedDepartment || null,
            phone: phone || null,
            isActive: true,
            loginAttempts: 0,
            isAccountLocked: false,
          },
        });

        const profile = await tx.employeeProfile.create({
          data: {
            employeeId,
            userId: user.id,
            department: normalizedDepartment || null,
            designation: designation || null,
            employmentType,
            joinDate: joinDate ? new Date(joinDate) : null,
            workLocation: workLocation || null,
            workState: workState || null,
            nationality: nationality || null,
            phone: phone || null,
            nricPassport: nricPassport || null,
            dob: dob ? new Date(dob) : null,
            gender: gender || null,
            personalEmail: personalEmail || null,
            address: address || null,
            emergencyName: emergencyName || null,
            emergencyPhone: emergencyPhone || null,
            emergencyRelation: emergencyRelation || null,
            visaStatus: visaStatus || null,
            visaExpiryDate: visaExpiryDate ? new Date(visaExpiryDate) : null,
            passportExpiryDate: passportExpiryDate ? new Date(passportExpiryDate) : null,
            permitType: permitType || null,
            visaCaseType: visaCaseType || null,
            visaDependents: Array.isArray(visaDependents) ? visaDependents : undefined,
            managerId: managerId || null,
            status: 'ACTIVE',
          },
          include: {
            user: { select: { firstName: true, lastName: true, email: true, role: true } },
          },
        });

        return profile;
      });

      if (employmentType === 'DEPLOYED' && clientId) {
        await prisma.paymentAgreement.create({
          data: {
            employeeId: created.id,
            clientId,
            staffType: 'DEPLOYED',
            paymentType: 'MONTHLY_SALARY',
            startDate: joinDate ? new Date(joinDate) : new Date(),
            status: 'ACTIVE',
            notes: 'Auto-created from HR employee creation',
            ...(clientLeaveApproverUserId ? { clientLeaveApproverUserId } : {}),
          },
        }).catch(() => {});
      }

      return sendSuccess(res, { employee: created, tempPassword }, 'Employee created successfully', 201);
    } catch (error) {
      logger.error(`[${req.id}] HRMS create employee error`, error);
      return sendError(res, 'Failed to create employee', 500);
    }
  }

  /**
   * PUT /api/hrms/employees/:id
   */
  async updateEmployee(req, res, next) {
    try {
      const lookup = req.params.id;
      const where = lookup.startsWith('TKG-') ? { employeeId: lookup } : { id: lookup };
      const employee = await prisma.employeeProfile.findFirst({ where });
      if (!employee) return sendError(res, 'Employee not found', 404);

      const {
        firstName,
        lastName,
        department,
        designation,
        employmentType,
        status,
        joinDate,
        workLocation,
        workState,
        nationality,
        phone,
        nricPassport,
        dob,
        gender,
        personalEmail,
        address,
        emergencyName,
        emergencyPhone,
        emergencyRelation,
        visaStatus,
        visaExpiryDate,
        passportExpiryDate,
        permitType,
        visaCaseType,
        visaDependents,
        managerId,
        clientId,
        clientLeaveApproverUserId,
        role,
      } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { id: employee.userId },
        select: { role: true },
      });
      const roleToUse = role || existingUser?.role;
      const expectedDepartment = getExpectedDepartmentForRole(roleToUse);
      if (expectedDepartment && department && department !== expectedDepartment && !['EMPLOYEE', 'EMPLOYEE_VIEWER', 'DEPLOYED_STAFF', 'CONTRACTOR', 'CLIENT_APPROVER'].includes(roleToUse)) {
        return sendError(res, `Role ${roleToUse} must belong to department ${expectedDepartment}`, 400);
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.employeeProfile.update({
          where: { id: employee.id },
          data: {
            ...(designation !== undefined && { designation }),
            ...(employmentType !== undefined && { employmentType }),
            ...(status !== undefined && { status }),
            ...(joinDate !== undefined && { joinDate: joinDate ? new Date(joinDate) : null }),
            ...(workLocation !== undefined && { workLocation }),
            ...(workState !== undefined && { workState }),
            ...(nationality !== undefined && { nationality }),
            ...(phone !== undefined && { phone }),
            ...(nricPassport !== undefined && { nricPassport }),
            ...(dob !== undefined && { dob: dob ? new Date(dob) : null }),
            ...(gender !== undefined && { gender }),
            ...(personalEmail !== undefined && { personalEmail }),
            ...(address !== undefined && { address }),
            ...(emergencyName !== undefined && { emergencyName }),
            ...(emergencyPhone !== undefined && { emergencyPhone }),
            ...(emergencyRelation !== undefined && { emergencyRelation }),
            ...(visaStatus !== undefined && { visaStatus }),
            ...(visaExpiryDate !== undefined && { visaExpiryDate: visaExpiryDate ? new Date(visaExpiryDate) : null }),
            ...(passportExpiryDate !== undefined && {
              passportExpiryDate: passportExpiryDate ? new Date(passportExpiryDate) : null,
            }),
            ...(permitType !== undefined && { permitType }),
            ...(visaCaseType !== undefined && { visaCaseType }),
            ...(visaDependents !== undefined && {
              visaDependents: Array.isArray(visaDependents) ? visaDependents : null,
            }),
            ...(managerId !== undefined && { managerId }),
            ...(department !== undefined && { department: department || expectedDepartment || null }),
          },
        });

        await tx.user.update({
          where: { id: employee.userId },
          data: {
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(department !== undefined && { department: department || expectedDepartment || null }),
            ...(phone !== undefined && { phone }),
            ...(role !== undefined && { role }),
          },
        });

        return tx.employeeProfile.findUnique({
          where: { id: employee.id },
          include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
        });
      });

      const targetEmploymentType = employmentType || updated?.employmentType;
      if (targetEmploymentType === 'DEPLOYED' && clientId) {
        const agreement = await prisma.paymentAgreement.findFirst({
          where: { employeeId: employee.id, status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        });
        if (agreement) {
          await prisma.paymentAgreement.update({
            where: { id: agreement.id },
            data: {
              clientId,
              ...(clientLeaveApproverUserId !== undefined && {
                clientLeaveApproverUserId: clientLeaveApproverUserId || null,
              }),
            },
          });
        } else {
          await prisma.paymentAgreement.create({
            data: {
              employeeId: employee.id,
              clientId,
              staffType: 'DEPLOYED',
              paymentType: 'MONTHLY_SALARY',
              startDate: updated?.joinDate || new Date(),
              status: 'ACTIVE',
              notes: 'Auto-created from HR employee update',
              ...(clientLeaveApproverUserId ? { clientLeaveApproverUserId } : {}),
            },
          });
        }
      }

      return sendSuccess(res, { employee: updated }, 'Employee updated successfully');
    } catch (error) {
      logger.error(`[${req.id}] HRMS update employee error`, error);
      return sendError(res, 'Failed to update employee', 500);
    }
  }

  async getEmployeeDocuments(req, res, next) {
    try {
      const lookup = req.params.id;
      const employee = await prisma.employeeProfile.findFirst({
        where: lookup.startsWith('TKG-') ? { employeeId: lookup } : { id: lookup },
        select: { id: true },
      });
      if (!employee) return sendError(res, 'Employee not found', 404);
      const docs = await prisma.employeeDocument.findMany({
        where: { employeeId: employee.id },
        orderBy: { uploadedAt: 'desc' },
      });
      return sendSuccess(res, { documents: docs });
    } catch (error) {
      logger.error(`[${req.id}] HRMS get employee documents error`, error);
      return sendError(res, 'Failed to load employee documents', 500);
    }
  }

  async downloadEmployeeDocument(req, res, next) {
    try {
      const lookup = req.params.id;
      const employee = await prisma.employeeProfile.findFirst({
        where: lookup.startsWith('TKG-') ? { employeeId: lookup } : { id: lookup },
        select: { id: true },
      });
      if (!employee) return sendError(res, 'Employee not found', 404);
      const doc = await prisma.employeeDocument.findFirst({
        where: { id: req.params.docId, employeeId: employee.id },
      });
      if (!doc?.fileUrl) return sendError(res, 'Document not found', 404);
      const abs = resolveUploadAbsolute(doc.fileUrl);
      if (!abs) return sendError(res, 'File not available', 404);
      const downloadName = doc.fileName || doc.documentName || 'document';
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(downloadName)}"`);
      return res.sendFile(abs);
    } catch (error) {
      logger.error(`[${req.id}] HRMS download employee document error`, error);
      return sendError(res, 'Failed to download document', 500);
    }
  }

  async uploadEmployeeDocument(req, res, next) {
    try {
      const lookup = req.params.id;
      const employee = await prisma.employeeProfile.findFirst({
        where: lookup.startsWith('TKG-') ? { employeeId: lookup } : { id: lookup },
      });
      if (!employee) return sendError(res, 'Employee not found', 404);
      if (!req.files || req.files.length === 0) return sendError(res, 'At least one document file is required', 400);

      const {
        documentType = 'OTHER',
        documentName,
        issueDate,
        expiryDate,
      } = req.body || {};

      const docs = await Promise.all(
        req.files.map((file, idx) =>
          prisma.employeeDocument.create({
            data: {
              employeeId: employee.id,
              documentType,
              documentName: documentName ? `${documentName}${req.files.length > 1 ? ` (${idx + 1})` : ''}` : file.originalname,
              fileName: file.filename,
              fileUrl: `/uploads/${file.filename}`,
              fileSize: file.size || null,
              issueDate: issueDate ? new Date(issueDate) : null,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              uploadedBy: req.user.id,
              uploadedAt: new Date(),
            },
          })
        )
      );

      return sendSuccess(res, { documents: docs }, 'Employee document(s) uploaded', 201);
    } catch (error) {
      logger.error(`[${req.id}] HRMS upload employee document error`, error);
      return sendError(res, 'Failed to upload employee document', 500);
    }
  }

  /**
   * POST /api/hrms/employees/import
   * Bulk import employees from CSV with optional update of existing rows
   */
  async importEmployees(req, res, next) {
    try {
      if (!req.file?.buffer) return sendError(res, 'CSV file is required', 400);
      const allowUpdateExisting = String(req.body.allowUpdateExisting || 'false') === 'true';
      const csvText = req.file.buffer.toString('utf-8').replace(/\r/g, '');
      const rows = csvText.split('\n').filter((r) => r.trim().length > 0);
      if (rows.length < 2) return sendError(res, 'CSV must include header and at least one row', 400);

      const headers = parseCsvLine(rows[0]).map((h) => h.toLowerCase());
      const idx = (name) => headers.indexOf(name);

      const results = { created: 0, updated: 0, skipped: 0, errors: [] };
      const createdOrUpdatedProfiles = [];

      for (let i = 1; i < rows.length; i += 1) {
        const line = rows[i];
        if (!line.trim()) continue;
        const cols = parseCsvLine(line);
        const rowNum = i + 1;

        const firstName = cols[idx('firstname')] || cols[idx('first_name')] || '';
        const lastName = cols[idx('lastname')] || cols[idx('last_name')] || '';
        const email = (cols[idx('email')] || '').trim().toLowerCase();
        const empIdKey = (cols[idx('employeeid')] || cols[idx('employee_id')] || '').trim();
        const visaExtra = visaFieldsFromCols(cols, idx);
        const role = cols[idx('role')] || 'EMPLOYEE';
        const expectedDepartment = getExpectedDepartmentForRole(role);
        const department = cols[idx('department')] || expectedDepartment || null;
        const designation = cols[idx('designation')] || null;
        const employmentType = cols[idx('employmenttype')] || cols[idx('employment_type')] || 'INTERNAL';
        const staffType = cols[idx('stafftype')] || cols[idx('staff_type')] || (employmentType === 'DEPLOYED' ? 'DEPLOYED' : 'INTERNAL');
        const clientId = cols[idx('clientid')] || cols[idx('client_id')] || null;
        const phone = cols[idx('phone')] || null;
        const managerEmail = (cols[idx('manageremail')] || cols[idx('manager_email')] || '').toLowerCase() || null;
        const nationality = cols[idx('nationality')] || null;
        const workCountry = cols[idx('workcountry')] || cols[idx('work_country')] || null;
        const workState = cols[idx('workstate')] || cols[idx('work_state')] || null;
        const visaStatus = cols[idx('visastatus')] || cols[idx('visa_status')] || null;
        const joinDateRaw = cols[idx('joindate')] || cols[idx('join_date')] || '';
        const joinDate = joinDateRaw ? new Date(joinDateRaw) : null;
        const tempPassword = cols[idx('temppassword')] || `${firstName || 'User'}@2026`;

        // Visa / permit-only row: match by employee_id (no email). Requires allowUpdateExisting.
        if (empIdKey && !email && allowUpdateExisting) {
          const vs = visaStatus && String(visaStatus).trim() ? String(visaStatus).trim() : null;
          if (Object.keys(visaExtra).length === 0 && !vs) {
            results.errors.push(
              `Row ${rowNum}: visa-only import needs employee_id plus visa_status and/or permit/expiry columns`
            );
            continue;
          }
          try {
            const prof = await prisma.employeeProfile.findUnique({ where: { employeeId: empIdKey } });
            if (!prof) {
              results.errors.push(`Row ${rowNum}: employee_id ${empIdKey} not found`);
              continue;
            }
            await prisma.employeeProfile.update({
              where: { id: prof.id },
              data: {
                ...visaExtra,
                ...(vs ? { visaStatus: vs } : {}),
              },
            });
            results.updated += 1;
          } catch (rowErr) {
            results.errors.push(`Row ${rowNum}: ${rowErr.message}`);
          }
          continue;
        }

        if (!email || !firstName) {
          results.errors.push(
            `Row ${rowNum}: firstName and email are required (or visa-only row: employee_id + visa columns, with "Update existing" enabled)`
          );
          continue;
        }
        if (employmentType === 'DEPLOYED' && !clientId) {
          results.errors.push(`Row ${rowNum}: clientId is required for DEPLOYED employees`);
          continue;
        }

        try {
          const existingUser = await prisma.user.findUnique({ where: { email } });
          if (existingUser && !allowUpdateExisting) {
            results.skipped += 1;
            continue;
          }

          let user;
          let profile;
          if (!existingUser) {
            const employeeId = await this.generateEmployeeId();
            const hashedPassword = await encryptPassword(tempPassword, config.BCRYPT_ROUNDS);
            user = await prisma.user.create({
              data: {
                email,
                password: hashedPassword,
                firstName,
                lastName: lastName || '',
                role,
                department,
                phone,
                isActive: true,
                loginAttempts: 0,
                isAccountLocked: false,
              },
            });
            profile = await prisma.employeeProfile.create({
              data: {
                employeeId,
                userId: user.id,
                department,
                designation,
                employmentType,
                staffType,
                nationality,
                workCountry,
                workState,
                visaStatus,
                joinDate: joinDate && !Number.isNaN(joinDate.getTime()) ? joinDate : null,
                phone,
                status: 'ACTIVE',
                ...visaExtra,
              },
            });
            results.created += 1;
          } else {
            user = await prisma.user.update({
              where: { id: existingUser.id },
              data: allowUpdateExisting ? {
                firstName,
                ...(lastName ? { lastName } : {}),
                role,
                department,
                phone,
              } : {},
            });

            const existingProfile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
            if (existingProfile) {
              profile = await prisma.employeeProfile.update({
                where: { id: existingProfile.id },
                data: allowUpdateExisting ? {
                  department,
                  designation,
                  employmentType,
                  staffType,
                  nationality,
                  workCountry,
                  workState,
                  visaStatus,
                  ...(joinDate && !Number.isNaN(joinDate.getTime()) ? { joinDate } : {}),
                  phone,
                  ...visaExtra,
                } : {},
              });
            } else {
              const employeeId = await this.generateEmployeeId();
              profile = await prisma.employeeProfile.create({
                data: {
                  employeeId,
                  userId: user.id,
                  department,
                  designation,
                  employmentType,
                  staffType,
                  joinDate: joinDate && !Number.isNaN(joinDate.getTime()) ? joinDate : null,
                  phone,
                  status: 'ACTIVE',
                  visaStatus,
                  ...visaExtra,
                },
              });
            }
            results.updated += 1;
          }

          if (employmentType === 'DEPLOYED' && clientId && profile?.id) {
            const agreement = await prisma.paymentAgreement.findFirst({
              where: { employeeId: profile.id, status: 'ACTIVE' },
              orderBy: { createdAt: 'desc' },
            });
            if (agreement) {
              await prisma.paymentAgreement.update({
                where: { id: agreement.id },
                data: { clientId },
              });
            } else {
              await prisma.paymentAgreement.create({
                data: {
                  employeeId: profile.id,
                  clientId,
                  staffType: 'DEPLOYED',
                  paymentType: 'MONTHLY_SALARY',
                  startDate: joinDate && !Number.isNaN(joinDate.getTime()) ? joinDate : new Date(),
                  status: 'ACTIVE',
                  notes: 'Auto-created from HR CSV import',
                },
              });
            }
          }

          createdOrUpdatedProfiles.push({ profileId: profile.id, managerEmail });
        } catch (rowErr) {
          results.errors.push(`Row ${rowNum}: ${rowErr.message}`);
        }
      }

      // Second pass: manager mapping by email
      for (const item of createdOrUpdatedProfiles) {
        if (!item.managerEmail) continue;
        const managerUser = await prisma.user.findUnique({ where: { email: item.managerEmail } });
        if (!managerUser) continue;
        const managerProfile = await prisma.employeeProfile.findUnique({ where: { userId: managerUser.id } });
        if (!managerProfile) continue;
        await prisma.employeeProfile.update({
          where: { id: item.profileId },
          data: { managerId: managerProfile.id },
        });
      }

      return sendSuccess(res, results, 'Employee import completed');
    } catch (error) {
      logger.error(`[${req.id}] HRMS import employee error`, error);
      return sendError(res, 'Failed to import employees', 500);
    }
  }

  /**
   * POST /api/hrms/clients/import
   * Bulk import clients for finance / deployment (no Sales UI required).
   * Headers: clientName (required), primaryContactEmail, primaryContactPhone, primaryContact, address, country, state, city, industry, paymentTerms, notes, status
   */
  async importClients(req, res, next) {
    const clientService = require('../services/clientService');
    try {
      if (!req.file?.buffer) return sendError(res, 'CSV file is required', 400);
      const allowUpdateExisting = String(req.body.allowUpdateExisting || 'false') === 'true';
      const csvText = req.file.buffer.toString('utf-8').replace(/\r/g, '');
      const rows = csvText.split('\n').filter((r) => r.trim().length > 0);
      if (rows.length < 2) return sendError(res, 'CSV must include header and at least one row', 400);

      const headers = parseCsvLine(rows[0]).map((h) => h.toLowerCase());
      const idx = (name) => headers.indexOf(name);
      const results = { created: 0, updated: 0, skipped: 0, errors: [] };

      for (let i = 1; i < rows.length; i += 1) {
        const line = rows[i];
        if (!line.trim()) continue;
        const cols = parseCsvLine(line);
        const rowNum = i + 1;
        const clientName =
          cols[idx('clientname')] ||
          cols[idx('client_name')] ||
          cols[idx('company')] ||
          cols[idx('company_name')] ||
          '';
        if (!clientName || !String(clientName).trim()) {
          results.errors.push(`Row ${rowNum}: clientName is required`);
          continue;
        }
        const payload = {
          clientName: String(clientName).trim(),
          primaryContactEmail: cols[idx('primarycontactemail')] || cols[idx('primary_contact_email')] || null,
          primaryContactPhone: cols[idx('primarycontactphone')] || cols[idx('primary_contact_phone')] || null,
          primaryContact: cols[idx('primarycontact')] || cols[idx('primary_contact')] || null,
          address: cols[idx('address')] || null,
          country: cols[idx('country')] || null,
          state: cols[idx('state')] || null,
          city: cols[idx('city')] || null,
          industry: cols[idx('industry')] || null,
          paymentTerms: cols[idx('paymentterms')] || cols[idx('payment_terms')] || null,
          notes: cols[idx('notes')] || null,
        };
        let status = (cols[idx('status')] || 'ACTIVE').toString().trim().toUpperCase();
        if (!['ACTIVE', 'INACTIVE', 'PROSPECT', 'ON_HOLD'].includes(status)) status = 'ACTIVE';

        try {
          const existing = await prisma.client.findFirst({
            where: { clientName: { equals: payload.clientName, mode: 'insensitive' } },
          });
          if (existing && !allowUpdateExisting) {
            results.skipped += 1;
            continue;
          }
          if (existing && allowUpdateExisting) {
            await prisma.client.update({
              where: { id: existing.id },
              data: {
                primaryContactEmail: payload.primaryContactEmail || existing.primaryContactEmail,
                primaryContactPhone: payload.primaryContactPhone || existing.primaryContactPhone,
                primaryContact: payload.primaryContact || existing.primaryContact,
                address: payload.address || existing.address,
                country: payload.country || existing.country,
                state: payload.state || existing.state,
                city: payload.city || existing.city,
                industry: payload.industry || existing.industry,
                paymentTerms: payload.paymentTerms || existing.paymentTerms,
                notes: payload.notes != null ? payload.notes : existing.notes,
                status,
              },
            });
            results.updated += 1;
          } else {
            await clientService.createClient({ ...payload, status }, req.user.id);
            results.created += 1;
          }
        } catch (rowErr) {
          results.errors.push(`Row ${rowNum}: ${rowErr.message}`);
        }
      }

      return sendSuccess(res, results, 'Client import completed');
    } catch (error) {
      logger.error(`[${req.id}] HRMS import clients error`, error);
      return sendError(res, 'Failed to import clients', 500);
    }
  }

  /**
   * GET /api/hrms/onboarding
   * Operational onboarding tracker using existing employee + recruitment onboarding data
   */
  async getOnboardingTracker(req, res, next) {
    try {
      const { status = 'ALL', limit = 100, offset = 0 } = req.query;
      const where = {};
      if (status !== 'ALL') where.status = status;

      const [employees, total] = await Promise.all([
        prisma.employeeProfile.findMany({
          where,
          include: {
            user: { select: { firstName: true, lastName: true, email: true, role: true } },
            onboarding: {
              select: {
                id: true,
                offerStatus: true,
                joiningDate: true,
                status: true,
                completedAt: true,
                notes: true,
              },
            },
          },
          orderBy: [{ joinDate: 'desc' }, { createdAt: 'desc' }],
          take: parseInt(limit, 10),
          skip: parseInt(offset, 10),
        }),
        prisma.employeeProfile.count({ where }),
      ]);

      return sendSuccess(res, { records: employees, total });
    } catch (error) {
      logger.error(`[${req.id}] HRMS onboarding tracker error`, error);
      return sendError(res, 'Failed to load onboarding tracker', 500);
    }
  }

  /**
   * POST /api/hrms/onboarding/:id/complete
   * Marks onboarding completed for an employee and writes audit log
   */
  async completeOnboarding(req, res, next) {
    try {
      const employee = await prisma.employeeProfile.findUnique({ where: { id: req.params.id } });
      if (!employee) return sendError(res, 'Employee not found', 404);

      const { notes = null } = req.body || {};
      const updated = await prisma.employeeProfile.update({
        where: { id: req.params.id },
        data: {
          status: employee.status === 'PROBATION' ? 'ACTIVE' : employee.status,
        },
        include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'HR_ONBOARDING_COMPLETED',
          entityType: 'EMPLOYEE',
          entityId: employee.id,
          details: { notes, employeeId: employee.employeeId },
          ipAddress: req.ip,
        },
      }).catch(() => {});

      if (updated?.userId) {
        await notificationService.createNotification({
          userId: updated.userId,
          type: 'ONBOARDING_STATUS_UPDATED',
          title: 'Onboarding completed',
          message: 'Your onboarding has been marked complete by HR.',
          relatedId: updated.id,
          severity: 'NORMAL',
        }).catch(() => {});
      }

      return sendSuccess(res, { employee: updated }, 'Onboarding marked complete');
    } catch (error) {
      logger.error(`[${req.id}] HRMS complete onboarding error`, error);
      return sendError(res, 'Failed to complete onboarding', 500);
    }
  }

  /**
   * GET /api/hrms/offboarding
   * Operational offboarding tracker from employee statuses
   */
  async getOffboardingTracker(req, res, next) {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const where = { status: { in: ['ON_NOTICE', 'RESIGNED', 'TERMINATED'] } };
      const [employees, total] = await Promise.all([
        prisma.employeeProfile.findMany({
          where,
          include: {
            user: { select: { firstName: true, lastName: true, email: true, role: true } },
          },
          orderBy: [{ updatedAt: 'desc' }],
          take: parseInt(limit, 10),
          skip: parseInt(offset, 10),
        }),
        prisma.employeeProfile.count({ where }),
      ]);

      return sendSuccess(res, { records: employees, total });
    } catch (error) {
      logger.error(`[${req.id}] HRMS offboarding tracker error`, error);
      return sendError(res, 'Failed to load offboarding tracker', 500);
    }
  }

  /**
   * POST /api/hrms/offboarding/:id/initiate
   * Moves employee to ON_NOTICE with audit trail
   */
  async initiateOffboarding(req, res, next) {
    try {
      const employee = await prisma.employeeProfile.findUnique({ where: { id: req.params.id } });
      if (!employee) return sendError(res, 'Employee not found', 404);
      const { reason = null, effectiveDate = null } = req.body || {};

      const updated = await prisma.employeeProfile.update({
        where: { id: req.params.id },
        data: { status: 'ON_NOTICE' },
        include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'HR_OFFBOARDING_INITIATED',
          entityType: 'EMPLOYEE',
          entityId: employee.id,
          details: { reason, effectiveDate, employeeId: employee.employeeId },
          ipAddress: req.ip,
        },
      }).catch(() => {});

      if (updated?.userId) {
        await notificationService.createNotification({
          userId: updated.userId,
          type: 'OFFBOARDING_STATUS_UPDATED',
          title: 'Offboarding initiated',
          message: `Your offboarding process has been initiated${reason ? `: ${reason}` : ''}.`,
          relatedId: updated.id,
          severity: 'HIGH',
        }).catch(() => {});
      }

      return sendSuccess(res, { employee: updated }, 'Offboarding initiated');
    } catch (error) {
      logger.error(`[${req.id}] HRMS initiate offboarding error`, error);
      return sendError(res, 'Failed to initiate offboarding', 500);
    }
  }

  /**
   * POST /api/hrms/offboarding/:id/complete
   * Completes offboarding as RESIGNED or TERMINATED
   */
  async completeOffboarding(req, res, next) {
    try {
      const employee = await prisma.employeeProfile.findUnique({ where: { id: req.params.id } });
      if (!employee) return sendError(res, 'Employee not found', 404);
      const { finalStatus = 'RESIGNED', notes = null } = req.body || {};
      const safeFinalStatus = ['RESIGNED', 'TERMINATED'].includes(finalStatus) ? finalStatus : 'RESIGNED';

      const updated = await prisma.employeeProfile.update({
        where: { id: req.params.id },
        data: { status: safeFinalStatus },
        include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
      });

      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'HR_OFFBOARDING_COMPLETED',
          entityType: 'EMPLOYEE',
          entityId: employee.id,
          details: { finalStatus: safeFinalStatus, notes, employeeId: employee.employeeId },
          ipAddress: req.ip,
        },
      }).catch(() => {});

      if (updated?.userId) {
        await notificationService.createNotification({
          userId: updated.userId,
          type: 'OFFBOARDING_STATUS_UPDATED',
          title: `Offboarding completed (${safeFinalStatus})`,
          message: `Your offboarding is completed with final status: ${safeFinalStatus}${notes ? ` - ${notes}` : ''}.`,
          relatedId: updated.id,
          severity: 'HIGH',
        }).catch(() => {});
      }

      return sendSuccess(res, { employee: updated }, 'Offboarding completed');
    } catch (error) {
      logger.error(`[${req.id}] HRMS complete offboarding error`, error);
      return sendError(res, 'Failed to complete offboarding', 500);
    }
  }
}

module.exports = new HrmsController();
