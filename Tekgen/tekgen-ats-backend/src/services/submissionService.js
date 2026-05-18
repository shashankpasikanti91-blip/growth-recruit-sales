/**
 * Client submission pipeline: manual stage updates + in-app notifications to recruiters/sales.
 */
const prisma = require('../config/database');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

const SUBMISSION_STAGES = [
  'DRAFT',
  'SUBMITTED_TO_SALES',
  'SUBMITTED_TO_CLIENT',
  'CLIENT_REVIEW',
  'INTERVIEW',
  'OFFER',
  'JOINED',
  'REJECTED',
];

function isPortfolioSalesRole(role) {
  return role === 'SALES_EXEC' || role === 'SALES_EXECUTIVE';
}

function userCanAccessSubmission(actorId, actorRole, submission) {
  const orgWide = ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'RECRUITMENT_MANAGER', 'SALES_MANAGER'];
  if (orgWide.includes(actorRole)) return true;

  const job = submission.job;
  if (!job) return false;

  if (actorRole === 'RECRUITER') {
    if (submission.recruiterId === actorId) return true;
    if (job.userId === actorId) return true;
    if (job.assignedTo === actorId) return true;
    if (Array.isArray(job.assignedRecruiters) && job.assignedRecruiters.includes(actorId)) return true;
    return false;
  }

  if (isPortfolioSalesRole(actorRole)) {
    return !!(
      submission.salesOwnerId === actorId ||
      submission.client?.ownerId === actorId ||
      job.salesOwnerId === actorId ||
      job.client?.ownerId === actorId
    );
  }

  return false;
}

function submissionIncludeForAccess() {
  return {
    candidate: { select: { id: true, firstName: true, lastName: true } },
    client: { select: { id: true, ownerId: true, clientName: true, displayId: true } },
    recruiter: { select: { id: true, firstName: true, lastName: true, email: true } },
    job: {
      select: {
        id: true,
        title: true,
        displayId: true,
        userId: true,
        assignedTo: true,
        assignedRecruiters: true,
        salesOwnerId: true,
        clientId: true,
        client: { select: { id: true, ownerId: true, clientName: true, displayId: true } },
      },
    },
  };
}

async function notifyStakeholders(submission, previousStage, actorUser, newStage) {
  try {
    const job = submission.job;
    const cand = submission.candidate;
    const label = [cand?.firstName, cand?.lastName].filter(Boolean).join(' ').trim() || 'Candidate';
    const jobRef = job?.displayId || job?.title || 'job';
    const actorLabel = actorUser?.email || 'Team member';
    const message = `${actorLabel} updated pipeline: ${label} on ${jobRef} — ${previousStage} → ${newStage}`;
    const link = '/sales';
    let type = 'INFO';
    if (newStage === 'REJECTED') type = 'ALERT';
    else if (newStage === 'JOINED') type = 'SUCCESS';

    const notifyIds = new Set();
    (job.assignedRecruiters || []).forEach((rid) => {
      if (rid && rid !== actorUser.id) notifyIds.add(rid);
    });
    if (job.userId && job.userId !== actorUser.id) notifyIds.add(job.userId);
    if (job.salesOwnerId && job.salesOwnerId !== actorUser.id) notifyIds.add(job.salesOwnerId);
    if (submission.recruiterId && submission.recruiterId !== actorUser.id) notifyIds.add(submission.recruiterId);
    if (submission.salesOwnerId && submission.salesOwnerId !== actorUser.id) notifyIds.add(submission.salesOwnerId);
    if (job.client?.ownerId && job.client.ownerId !== actorUser.id) notifyIds.add(job.client.ownerId);

    await Promise.all(
      [...notifyIds].map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            message,
            type,
            link,
          },
        })
      )
    );

    const emailNotify = ['true', '1', 'yes'].includes(
      String(process.env.SUBMISSION_PIPELINE_EMAIL_NOTIFY || '').toLowerCase()
    );
    if (emailNotify && notifyIds.size > 0) {
      const recipients = await prisma.user.findMany({
        where: { id: { in: [...notifyIds] }, isActive: true },
        select: { email: true },
      });
      const html = `<p>${message}</p><p>Open the app: ${process.env.FRONTEND_URL || ''}${link}</p>`;
      await Promise.all(
        recipients
          .filter((u) => u.email)
          .map((u) =>
            notificationService.sendEmailNotification({
              to: u.email,
              subject: `Submission pipeline: ${jobRef}`,
              text: message,
              html,
            })
          )
      );
    }
  } catch (e) {
    logger.warn('Submission stage notify failed', e?.message || e);
  }
}

class SubmissionService {
  async listForJob(jobId, _actorUser) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) {
      const err = new Error('Job not found');
      err.statusCode = 404;
      throw err;
    }

    const rows = await prisma.submission.findMany({
      where: { jobId },
      include: submissionIncludeForAccess(),
      orderBy: { lastUpdated: 'desc' },
    });

    return rows;
  }

  /**
   * @param {string} submissionId
   * @param {object} body
   * @param {{ id: string, email?: string, role: string }} actorUser
   */
  async updateStage(submissionId, body, actorUser) {
    const stage = body.stage;
    if (!SUBMISSION_STAGES.includes(stage)) {
      const err = new Error(`Invalid stage. Use one of: ${SUBMISSION_STAGES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: submissionIncludeForAccess(),
    });

    if (!submission) {
      const err = new Error('Submission not found');
      err.statusCode = 404;
      throw err;
    }

    if (!userCanAccessSubmission(actorUser.id, actorUser.role, submission)) {
      const err = new Error('Not allowed to update this submission');
      err.statusCode = 403;
      throw err;
    }

    const previousStage = submission.stage;

    const data = { stage };
    if (body.clientFeedback !== undefined) {
      data.clientFeedback = body.clientFeedback == null || body.clientFeedback === '' ? null : String(body.clientFeedback);
    }
    if (body.rejectionReason !== undefined) {
      data.rejectionReason = body.rejectionReason == null || body.rejectionReason === '' ? null : String(body.rejectionReason);
    }
    if (body.offerStatus !== undefined) {
      data.offerStatus = body.offerStatus == null || body.offerStatus === '' ? null : String(body.offerStatus);
    }
    if (body.interviewDate !== undefined) {
      data.interviewDate =
        body.interviewDate == null || body.interviewDate === '' ? null : new Date(body.interviewDate);
    }
    if (stage !== 'DRAFT' && !submission.submittedDate) {
      data.submittedDate = new Date();
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data,
      include: submissionIncludeForAccess(),
    });

    if (previousStage !== stage) {
      await notifyStakeholders(updated, previousStage, actorUser, stage);
    }

    return updated;
  }
}

module.exports = new SubmissionService();
module.exports.SUBMISSION_STAGES = SUBMISSION_STAGES;
