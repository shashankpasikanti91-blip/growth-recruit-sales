/**
 * Recruitment delivery pulse: scoped high-priority JDs, missing mandatory dates,
 * and submission pipeline counts for recruiters vs leadership visibility.
 */
const prisma = require('../config/database');

const LEADERSHIP_ROLES = new Set([
  'ADMIN',
  'SUPER_ADMIN',
  'RECRUITMENT_MANAGER',
  'MANAGEMENT',
  'MANAGING_DIRECTOR',
  'MD',
  'DIRECTOR',
  'HEAD',
  'DEPT_HEAD',
  'DEPARTMENT_HEAD',
  'COMPANY_HEAD',
  'SALES_MANAGER',
  'SALES_EXEC',
  'SALES_EXECUTIVE',
]);

function recruiterJobScope(userId, leadership) {
  if (leadership) return {};
  return {
    OR: [
      { assignedRecruiters: { has: userId } },
      { assignedTo: userId },
      { userId },
    ],
  };
}

/**
 * @param {string} userId
 * @param {string} userRole
 */
async function getRecruitmentDeliveryPulse(userId, userRole) {
  if (!userId || !userRole) {
    return {
      highPriorityJobs: [],
      jobsMissingMandatoryDates: [],
      submissionPipelineByStage: {},
      roleScope: 'none',
    };
  }

  const leadership = LEADERSHIP_ROLES.has(userRole);
  const jobScope = recruiterJobScope(userId, leadership);

  const highPriorityWhere = {
    status: 'OPEN',
    priority: { in: ['HIGH', 'URGENT', 'high', 'urgent'] },
    ...jobScope,
  };

  const [highPriorityJobs, jobsMissingMandatoryDates, stageRows] = await Promise.all([
    prisma.job.findMany({
      where: highPriorityWhere,
      take: 20,
      orderBy: [{ targetSubmissionDate: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        displayId: true,
        title: true,
        priority: true,
        targetSubmissionDate: true,
        jobReceivedDate: true,
        clientId: true,
        client: { select: { clientName: true, displayId: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.job.findMany({
      where: {
        status: 'OPEN',
        clientId: { not: null },
        OR: [{ jobReceivedDate: null }, { targetSubmissionDate: null }],
        ...jobScope,
      },
      take: 25,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        displayId: true,
        title: true,
        jobReceivedDate: true,
        targetSubmissionDate: true,
        clientId: true,
        client: { select: { clientName: true, displayId: true } },
      },
    }),
    prisma.submission.groupBy({
      by: ['stage'],
      where: {
        stage: { not: 'DRAFT' },
        ...(leadership
          ? {}
          : {
              OR: [
                { recruiterId: userId },
                { job: { assignedRecruiters: { has: userId } } },
                { job: { assignedTo: userId } },
                { job: { userId } },
              ],
            }),
      },
      _count: { id: true },
    }),
  ]);

  const submissionPipelineByStage = {};
  for (const row of stageRows) {
    submissionPipelineByStage[row.stage] = row._count.id;
  }

  return {
    highPriorityJobs,
    jobsMissingMandatoryDates,
    submissionPipelineByStage,
    roleScope: leadership ? 'leadership' : 'recruiter',
  };
}

module.exports = {
  getRecruitmentDeliveryPulse,
  LEADERSHIP_ROLES,
};
