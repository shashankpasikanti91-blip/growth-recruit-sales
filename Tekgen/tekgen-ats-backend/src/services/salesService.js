/**
 * Sales Service — Phase 2
 * Sales Dashboard KPIs, Client metrics, Submission tracking,
 * Executive pulse (interviews today, reqs, priorities, finance links)
 */
const prisma = require('../config/database');
const logger = require('../utils/logger');

function startEndOfToday() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function isPortfolioSalesRole(role) {
  return role === 'SALES_EXEC' || role === 'SALES_EXECUTIVE';
}

class SalesService {
  /**
   * Job visibility for open requirements (portfolio vs org)
   */
  _openJobScope(userId, portfolioOnly) {
    if (!portfolioOnly) return {};
    return {
      OR: [{ salesOwnerId: userId }, { client: { ownerId: userId } }],
    };
  }

  _submissionScope(userId, portfolioOnly) {
    if (!portfolioOnly) return {};
    return {
      OR: [
        { salesOwnerId: userId },
        { client: { ownerId: userId } },
        { job: { salesOwnerId: userId } },
        { job: { client: { ownerId: userId } } },
      ],
    };
  }

  _clientScope(userId, portfolioOnly) {
    if (!portfolioOnly) return {};
    return { ownerId: userId };
  }

  /**
   * Get Sales Dashboard KPIs (portfolio-scoped for SALES_EXEC)
   */
  async getSalesDashboardKPIs(userId, userRole) {
    try {
      const portfolioOnly = isPortfolioSalesRole(userRole);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const jobScope = this._openJobScope(userId, portfolioOnly);
      const submissionScope = this._submissionScope(userId, portfolioOnly);
      const clientScope = this._clientScope(userId, portfolioOnly);

      const totalClients = await prisma.client.count({ where: clientScope }).catch(() => 0);
      const activeClients = await prisma.client.count({
        where: { status: 'ACTIVE', ...clientScope },
      }).catch(() => 0);
      const newClientsThisMonth = await prisma.client.count({
        where: { createdAt: { gte: thisMonth }, ...clientScope },
      }).catch(() => 0);

      const openJDs = await prisma.job.count({
        where: { status: 'OPEN', ...jobScope },
      }).catch(() => 0);

      const totalSubmissions = await prisma.submission.count({ where: submissionScope }).catch(() => 0);

      const totalScreenings = await prisma.screening.count({
        where: portfolioOnly
          ? {
              OR: [
                { job: { salesOwnerId: userId } },
                { job: { client: { ownerId: userId } } },
                { client: { ownerId: userId } },
              ],
            }
          : {},
      }).catch(() => 0);

      const totalOffers = await prisma.submission
        .count({
          where: { stage: 'OFFER', ...submissionScope },
        })
        .catch(() => 0);

      const totalClosures = await prisma.submission
        .count({
          where: { stage: 'JOINED', ...submissionScope },
        })
        .catch(() => 0);

      const pendingFeedback = await prisma.submission
        .count({
          where: { stage: 'CLIENT_REVIEW', ...submissionScope },
        })
        .catch(() => 0);

      const pendingInvoices = await prisma.invoice
        .count({
          where: {
            status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'SENT', 'PARTIALLY_PAID'] },
            ...(portfolioOnly ? { client: { ownerId: userId } } : {}),
          },
        })
        .catch(() => 0);

      return {
        totalClients,
        activeClients,
        newClientsThisMonth,
        openJDs,
        totalSubmissions,
        totalScreenings,
        totalOffers,
        totalClosures,
        pendingFeedback,
        estimatedRevenue: 0,
        closedRevenue: 0,
        pendingInvoices,
      };
    } catch (err) {
      logger.error('Error fetching sales KPIs', err);
      throw err;
    }
  }

  /**
   * Executive / sales pulse: dates, IDs, alerts — ties Sales ↔ Delivery ↔ Finance
   */
  async getSalesPulse(userId, userRole) {
    try {
      const portfolioOnly = isPortfolioSalesRole(userRole);
      const { start: startOfDay, end: endOfDay } = startEndOfToday();
      const weekAgo = new Date(startOfDay);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const in7 = new Date(startOfDay);
      in7.setDate(in7.getDate() + 7);
      const in30 = new Date(startOfDay);
      in30.setDate(in30.getDate() + 30);
      const now = new Date();

      const jobScope = this._openJobScope(userId, portfolioOnly);
      const submissionScope = this._submissionScope(userId, portfolioOnly);
      const clientAgreeScope = portfolioOnly ? { client: { ownerId: userId } } : {};
      const invoiceScope = portfolioOnly ? { client: { ownerId: userId } } : {};

      const followUpAnd = [
        {
          OR: [{ followUpType: 'SALES' }, { followUpType: 'CLIENT' }, { clientId: { not: null } }],
        },
      ];
      if (portfolioOnly) {
        followUpAnd.push({
          OR: [
            { client: { ownerId: userId } },
            { job: { salesOwnerId: userId } },
            { job: { client: { ownerId: userId } } },
          ],
        });
      }

      const [
        interviewsToday,
        salesFollowUpsToday,
        newRequirementsWeek,
        submissionsToday,
        highPriorityOpen,
        submissionTargetsDue7d,
        agreementsRenewalWindow,
        invoicesAttention,
      ] = await Promise.all([
        prisma.interviewSchedule
          .count({
            where: {
              interviewDate: { gte: startOfDay, lt: endOfDay },
            },
          })
          .catch(() => 0),
        prisma.followUp
          .count({
            where: {
              status: 'PENDING',
              dueDate: { gte: startOfDay, lt: endOfDay },
              AND: followUpAnd,
            },
          })
          .catch(() => 0),
        prisma.job.count({
          where: {
            status: 'OPEN',
            clientId: { not: null },
            createdAt: { gte: weekAgo },
            ...jobScope,
          },
        }),
        prisma.submission.count({
          where: {
            createdAt: { gte: startOfDay, lt: endOfDay },
            ...submissionScope,
          },
        }),
        prisma.job.count({
          where: {
            status: 'OPEN',
            priority: { in: ['HIGH', 'URGENT', 'high', 'urgent'] },
            ...jobScope,
          },
        }),
        prisma.job.count({
          where: {
            status: 'OPEN',
            targetSubmissionDate: { not: null, lte: in7 },
            ...jobScope,
          },
        }),
        prisma.agreement
          .count({
            where: {
              status: 'ACTIVE',
              endDate: { not: null, lte: in30, gte: startOfDay },
              ...clientAgreeScope,
            },
          })
          .catch(() => 0),
        prisma.invoice
          .count({
            where: {
              ...invoiceScope,
              OR: [
                { status: 'OVERDUE' },
                {
                  status: { in: ['SENT', 'PARTIALLY_PAID', 'SUBMITTED', 'APPROVED'] },
                  dueDate: { lt: now },
                  balanceDue: { gt: 0 },
                },
              ],
            },
          })
          .catch(() => 0),
      ]);

      const priorityJobs = await prisma.job.findMany({
        where: {
          status: 'OPEN',
          ...jobScope,
          OR: [
            { priority: { in: ['HIGH', 'URGENT', 'high', 'urgent'] } },
            { targetSubmissionDate: { not: null, lte: in7 } },
          ],
        },
        take: 24,
        orderBy: [{ targetSubmissionDate: 'asc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          displayId: true,
          title: true,
          priority: true,
          targetSubmissionDate: true,
          headcount: true,
          targetCvSubmissions: true,
          clientId: true,
          salesOwnerId: true,
          userId: true,
          client: { select: { id: true, clientName: true, displayId: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const rank = (p) => {
        const x = String(p || '').toUpperCase();
        if (x === 'URGENT') return 0;
        if (x === 'HIGH') return 1;
        return 2;
      };
      priorityJobs.sort((a, b) => {
        const pr = rank(a.priority) - rank(b.priority);
        if (pr !== 0) return pr;
        const da = a.targetSubmissionDate ? new Date(a.targetSubmissionDate).getTime() : Infinity;
        const db = b.targetSubmissionDate ? new Date(b.targetSubmissionDate).getTime() : Infinity;
        return da - db;
      });
      const priorityJobsTop = priorityJobs.slice(0, 12);

      const clientReviewCount = await prisma.submission
        .count({ where: { stage: 'CLIENT_REVIEW', ...submissionScope } })
        .catch(() => 0);

      const alerts = [];
      if (highPriorityOpen > 0) {
        alerts.push({
          level: 'warning',
          code: 'HIGH_PRIORITY_JD',
          message: `${highPriorityOpen} open requirement(s) marked HIGH/URGENT`,
          href: '/sales/requirements',
        });
      }
      if (submissionTargetsDue7d > 0) {
        alerts.push({
          level: 'warning',
          code: 'SUBMISSION_TARGET_SOON',
          message: `${submissionTargetsDue7d} JD(s) have submission target on or before ${in7.toLocaleDateString()} (includes overdue dates)`,
          href: '/sales/requirements',
        });
      }
      if (clientReviewCount > 0) {
        alerts.push({
          level: 'warning',
          code: 'CLIENT_REVIEW_QUEUE',
          message: `${clientReviewCount} profile(s) awaiting client feedback`,
          href: '/sales',
        });
      }
      if (agreementsRenewalWindow > 0) {
        alerts.push({
          level: 'warning',
          code: 'AGREEMENT_RENEWAL',
          message: `${agreementsRenewalWindow} active agreement(s) end within 30 days — paperwork / renewals`,
          href: '/finance',
        });
      }
      if (invoicesAttention > 0) {
        alerts.push({
          level: 'critical',
          code: 'INVOICE_ATTENTION',
          message: `${invoicesAttention} invoice(s) overdue or need payment follow-up`,
          href: '/finance/invoices',
        });
      }

      return {
        generatedAt: new Date().toISOString(),
        scope: portfolioOnly ? 'portfolio' : 'organization',
        interviewsToday,
        salesFollowUpsToday,
        newRequirementsWeek,
        submissionsToday,
        highPriorityOpen,
        submissionTargetsDue7d,
        agreementsRenewalWindow,
        invoicesAttention,
        priorityJobs: priorityJobsTop,
        alerts,
      };
    } catch (err) {
      logger.error('Error fetching sales pulse', err);
      throw err;
    }
  }

  /**
   * Get summary of top clients
   */
  async getTopClients(userId, userRole, limit = 5) {
    try {
      const portfolioOnly = isPortfolioSalesRole(userRole);
      const where = this._clientScope(userId, portfolioOnly);
      return await prisma.client.findMany({
        where,
        include: {
          _count: {
            select: {
              jobs: true,
              submissions: true,
              contacts: true,
            },
          },
          owner: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (err) {
      logger.error('Error fetching top clients', err);
      throw err;
    }
  }

  /**
   * Open JDs / client requirements for sales + recruitment delivery tracker
   */
  async getOpenRequisitions(limit = 80) {
    try {
      return await prisma.job.findMany({
        where: { status: 'OPEN', NOT: { department: 'Screening' } },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, clientName: true, displayId: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { applications: true, screenings: true } },
        },
      });
    } catch (err) {
      logger.error('Error fetching open requisitions', err);
      throw err;
    }
  }

  /**
   * Get recent submissions for dashboard timeline
   */
  async getRecentSubmissions(userId, userRole, limit = 10) {
    try {
      const portfolioOnly = isPortfolioSalesRole(userRole);
      const where = this._submissionScope(userId, portfolioOnly);
      const submissions = await prisma.submission.findMany({
        where,
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true } },
          job: { select: { id: true, title: true, displayId: true } },
          client: { select: { id: true, clientName: true, displayId: true } },
          recruiter: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return submissions.map((s) => ({
        ...s,
        candidate: s.candidate
          ? { ...s.candidate, candidateName: `${s.candidate.firstName || ''} ${s.candidate.lastName || ''}`.trim() }
          : null,
        job: s.job ? { ...s.job, jobTitle: s.job.title } : null,
      }));
    } catch (err) {
      logger.error('Error fetching recent submissions', err);
      throw err;
    }
  }

  /**
   * Get client by ID with all related data for Client 360
   */
  async getClientFullProfile(clientId) {
    try {
      return await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          contacts: true,
          jobs: {
            include: {
              _count: { select: { applications: true, screenings: true } },
            },
          },
          submissions: {
            include: {
              candidate: { select: { id: true, firstName: true, lastName: true } },
              job: { select: { title: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          documents: true,
          commercials: true,
          agreements: { orderBy: { createdAt: 'desc' } },
        },
      });
    } catch (err) {
      logger.error('Error fetching client profile', err);
      throw err;
    }
  }
}

module.exports = new SalesService();
