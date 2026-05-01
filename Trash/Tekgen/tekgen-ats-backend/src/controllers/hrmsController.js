const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class HrmsController {
  /**
   * GET /api/hrms/kpis
   * Aggregated KPI dashboard data for the HRMS Operations Hub.
   * Pulls real data from existing models; stubs 0 for modules not yet built.
   */
  async getKpis(req, res, next) {
    try {
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

      return sendSuccess(res, {
        recruitment: {
          openJobs,
          candidatesToday,
          interviewsScheduled,
          offersPending,
          hiredThisMonth: offeredThisMonth,
          totalCandidates,
          totalJobs,
        },
        hr: {
          totalEmployees:  0,
          newJoiners:      0,
          leaveRequests:   0,
          attendanceToday: 0,
        },
        payroll: {
          pendingRuns:      0,
          salaryProcessed:  0,
          claimsPending:    0,
        },
        sales: {
          leadsOpen:        0,
          followUpsDue:     followupsDueToday,
          opportunitiesWon: 0,
        },
        visa: {
          renewalsDue:       0,
          expiringPermits:   0,
          newApplications:   0,
        },
        finance: {
          invoicesPending:   0,
          paidThisMonth:     0,
        },
        meta: {
          recentActivities,
          generatedAt: new Date().toISOString(),
        },
      }, 'HRMS KPIs retrieved', 200);
    } catch (error) {
      logger.error(`[${req.id}] HRMS KPI error`, error);
      return sendError(res, 'Failed to load KPIs', 500);
    }
  }
}

module.exports = new HrmsController();
