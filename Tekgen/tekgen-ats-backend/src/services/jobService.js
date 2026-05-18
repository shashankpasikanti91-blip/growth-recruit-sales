const prisma = require('../config/database');
const logger = require('../utils/logger');
const { generateJobId } = require('../utils/idGenerator');

function normalizeJobPriority(raw) {
  if (raw == null || raw === '') return 'MEDIUM';
  const p = String(raw).trim().toUpperCase();
  if (p === 'URGENT') return 'HIGH';
  if (['HIGH', 'MEDIUM', 'LOW'].includes(p)) return p;
  return 'MEDIUM';
}

/** Client-linked JDs must have received + target submission dates. */
function assertClientJobDates({ clientId, jobReceivedDate, targetSubmissionDate }, contextLabel) {
  if (!clientId) return;
  const hasJrd = jobReceivedDate instanceof Date ? !Number.isNaN(jobReceivedDate.getTime()) : !!jobReceivedDate;
  const hasTsd = targetSubmissionDate instanceof Date ? !Number.isNaN(targetSubmissionDate.getTime()) : !!targetSubmissionDate;
  if (!hasJrd || !hasTsd) {
    throw new Error(
      `${contextLabel}: JD received date and target submission date are required for every client-linked requirement.`
    );
  }
}

/** Only allow Prisma-known fields from HTTP body (create uses subset explicitly). */
function sanitizeJobUpdatePayload(body) {
  const data = {};
  const setStr = (k) => {
    if (body[k] !== undefined) data[k] = body[k] == null || body[k] === '' ? null : String(body[k]);
  };
  const setIntOpt = (k) => {
    if (body[k] === undefined) return;
    if (body[k] === '' || body[k] === null) {
      data[k] = null;
      return;
    }
    const n = parseInt(body[k], 10);
    data[k] = Number.isFinite(n) ? n : null;
  };

  setStr('title');
  setStr('description');
  if (body.requiredSkills !== undefined) data.requiredSkills = Array.isArray(body.requiredSkills) ? body.requiredSkills : [];
  if (body.preferredSkills !== undefined) data.preferredSkills = Array.isArray(body.preferredSkills) ? body.preferredSkills : [];
  if (body.mandatorySkills !== undefined) data.mandatorySkills = Array.isArray(body.mandatorySkills) ? body.mandatorySkills : [];
  if (body.minExperience !== undefined) {
    const n = parseInt(body.minExperience, 10);
    data.minExperience = Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  if (body.maxExperience !== undefined) {
    if (body.maxExperience === '' || body.maxExperience === null) data.maxExperience = null;
    else {
      const n = parseInt(body.maxExperience, 10);
      data.maxExperience = Number.isFinite(n) ? n : null;
    }
  }
  setStr('department');
  setStr('location');
  setStr('country');
  setIntOpt('salaryMin');
  setIntOpt('salaryMax');
  setStr('salaryCurrency');
  setStr('salaryFrequency');
  setStr('workAuthorization');
  setStr('clientName');
  if (body.clientId !== undefined) data.clientId = body.clientId || null;
  setStr('contractType');
  setStr('contractDuration');
  setStr('parsedJobDescription');
  setStr('booleanSearchString');
  setStr('jobDescriptionRaw');
  if (body.headcount !== undefined) {
    const n = parseInt(body.headcount, 10);
    data.headcount = Number.isFinite(n) && n >= 1 ? n : 1;
  }
  setIntOpt('targetCvSubmissions');
  if (body.shareJdWithClient !== undefined) {
    data.shareJdWithClient = body.shareJdWithClient === true || body.shareJdWithClient === 'true';
  }
  if (body.slaTargetDays !== undefined) {
    if (body.slaTargetDays === '' || body.slaTargetDays === null) {
      data.slaTargetDays = 30;
    } else {
      const n = parseInt(body.slaTargetDays, 10);
      data.slaTargetDays = Number.isFinite(n) ? Math.max(1, n) : 30;
    }
  }
  if (body.targetSubmissionDate !== undefined) {
    data.targetSubmissionDate = body.targetSubmissionDate ? new Date(body.targetSubmissionDate) : null;
  }
  setStr('candidateType');
  if (body.assignedRecruiters !== undefined) {
    data.assignedRecruiters = Array.isArray(body.assignedRecruiters) ? body.assignedRecruiters : [];
    if (data.assignedRecruiters.length === 1) data.assignedTo = data.assignedRecruiters[0];
    else data.assignedTo = null;
  }
  if (body.jobReceivedDate !== undefined) {
    data.jobReceivedDate = body.jobReceivedDate ? new Date(body.jobReceivedDate) : null;
  }
  if (body.salesOwnerId !== undefined) {
    data.salesOwnerId = body.salesOwnerId && String(body.salesOwnerId).trim()
      ? String(body.salesOwnerId).trim()
      : null;
  }
  if (body.priority !== undefined) {
    data.priority = normalizeJobPriority(body.priority);
  }
  setStr('clientJrNumber');
  setStr('clientRequestUuid');
  setStr('bulkImportBatchId');
  setStr('bulkImportLabel');

  return data;
}

class JobService {
  /**
   * Create a new job
   */
  async createJob(jobData, userId) {
    try {
      let assignedRecruiters = Array.isArray(jobData.assignedRecruiters) ? [...jobData.assignedRecruiters] : [];
      let salesOwnerId =
        jobData.salesOwnerId && String(jobData.salesOwnerId).trim()
          ? String(jobData.salesOwnerId).trim()
          : null;

      if (jobData.clientId) {
        const c = await prisma.client.findUnique({
          where: { id: jobData.clientId },
          select: { ownerId: true, defaultRecruiters: true },
        });
        if (c) {
          if (!salesOwnerId && c.ownerId) salesOwnerId = c.ownerId;
          if (assignedRecruiters.length === 0 && Array.isArray(c.defaultRecruiters) && c.defaultRecruiters.length > 0) {
            assignedRecruiters = [...c.defaultRecruiters];
          }
        }
      }

      const targetSubmissionDate = jobData.targetSubmissionDate
        ? new Date(jobData.targetSubmissionDate)
        : null;
      const jobReceivedDate = jobData.jobReceivedDate ? new Date(jobData.jobReceivedDate) : null;

      assertClientJobDates(
        {
          clientId: jobData.clientId || null,
          jobReceivedDate,
          targetSubmissionDate,
        },
        'Create job'
      );

      const displayId = await generateJobId();
      const job = await prisma.job.create({
        data: {
          displayId,
          title: jobData.title,
          description: jobData.description || 'No description provided',
          requiredSkills: jobData.requiredSkills || [],
          preferredSkills: jobData.preferredSkills || [],
          mandatorySkills: jobData.mandatorySkills || [],
          minExperience: jobData.minExperience || 0,
          maxExperience: jobData.maxExperience || null,
          department: jobData.department || 'General',
          location: jobData.location || 'Not Specified',
          country: jobData.country || null,
          salaryMin: jobData.salaryMin ? parseInt(jobData.salaryMin) : null,
          salaryMax: jobData.salaryMax ? parseInt(jobData.salaryMax) : null,
          salaryCurrency: jobData.salaryCurrency || 'MYR',
          salaryFrequency: jobData.salaryFrequency || 'monthly',
          workAuthorization: jobData.workAuthorization || null,
          clientName: jobData.clientName || null,
          clientId: jobData.clientId || null,
          contractType: jobData.contractType || null,
          contractDuration: jobData.contractDuration || null,
          parsedJobDescription: jobData.parsedJobDescription || null,
          booleanSearchString: jobData.booleanSearchString || null,
          jobDescriptionRaw: jobData.jobDescriptionRaw || null,
          headcount: jobData.headcount || 1,
          targetCvSubmissions:
            jobData.targetCvSubmissions === '' || jobData.targetCvSubmissions == null
              ? null
              : parseInt(jobData.targetCvSubmissions, 10) || null,
          shareJdWithClient: jobData.shareJdWithClient === true || jobData.shareJdWithClient === 'true',
          slaTargetDays:
            jobData.slaTargetDays != null && jobData.slaTargetDays !== ''
              ? parseInt(jobData.slaTargetDays, 10) || 30
              : 30,
          targetSubmissionDate,
          jobReceivedDate,
          priority: normalizeJobPriority(jobData.priority),
          candidateType: jobData.candidateType || 'ANY',
          salesOwnerId,
          assignedRecruiters,
          assignedTo: assignedRecruiters.length === 1 ? assignedRecruiters[0] : jobData.assignedTo || null,
          userId,
          clientJrNumber:
            jobData.clientJrNumber == null || jobData.clientJrNumber === ''
              ? null
              : String(jobData.clientJrNumber).trim().slice(0, 80),
          clientRequestUuid:
            jobData.clientRequestUuid == null || jobData.clientRequestUuid === ''
              ? null
              : String(jobData.clientRequestUuid).trim().slice(0, 80),
          bulkImportBatchId: jobData.bulkImportBatchId ? String(jobData.bulkImportBatchId).trim().slice(0, 80) : null,
          bulkImportLabel: jobData.bulkImportLabel ? String(jobData.bulkImportLabel).trim().slice(0, 200) : null,
        },
      });

      logger.info(`Job created: ${job.id}`);
      return job;
    } catch (error) {
      logger.error('Create job error', error);
      throw error;
    }
  }

  /**
   * Get all jobs for a recruiter
   */
  async getJobsByRecruiter(userId, filters = {}) {
    try {
      // All team members share jobs; no per-user isolation for list queries
      // Never show ad-hoc screening jobs (created temporarily by the AI screening flow)
      const where = { NOT: { department: 'Screening' } };

      if (filters.status) where.status = filters.status;
      if (filters.contractType) where.contractType = filters.contractType;
      if (filters.clientName) where.clientName = { contains: filters.clientName, mode: 'insensitive' };
      if (filters.bulkImportBatchId) where.bulkImportBatchId = filters.bulkImportBatchId;
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { clientName: { contains: filters.search, mode: 'insensitive' } },
          { department: { contains: filters.search, mode: 'insensitive' } },
          { location: { contains: filters.search, mode: 'insensitive' } },
          { clientJrNumber: { contains: filters.search, mode: 'insensitive' } },
          { clientRequestUuid: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const limit = filters.limit || 50;
      const skip = ((filters.page || 1) - 1) * limit;

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          include: {
            _count: { select: { applications: true, screenings: true } },
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.job.count({ where }),
      ]);

      return { jobs, total };
    } catch (error) {
      logger.error('Get jobs error', error);
      throw error;
    }
  }

  /**
   * Get job details
   */
  async getJobById(jobId) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          _count: { select: { applications: true, screenings: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          client: { select: { id: true, clientName: true, displayId: true } },
        },
      });

      return job;
    } catch (error) {
      logger.error('Get job by ID error', error);
      throw error;
    }
  }

  /**
   * Update job
   */
  async updateJob(jobId, updateData) {
    try {
      const existing = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          clientId: true,
          jobReceivedDate: true,
          targetSubmissionDate: true,
        },
      });
      if (!existing) {
        throw new Error('Job not found');
      }

      const data = sanitizeJobUpdatePayload(updateData);

      const mergedClientId = data.clientId !== undefined ? data.clientId : existing.clientId;
      const mergedJobReceived =
        data.jobReceivedDate !== undefined ? data.jobReceivedDate : existing.jobReceivedDate;
      const mergedTarget =
        data.targetSubmissionDate !== undefined ? data.targetSubmissionDate : existing.targetSubmissionDate;

      assertClientJobDates(
        {
          clientId: mergedClientId,
          jobReceivedDate: mergedJobReceived,
          targetSubmissionDate: mergedTarget,
        },
        'Update job'
      );

      const job = await prisma.job.update({
        where: { id: jobId },
        data,
      });

      logger.info(`Job updated: ${jobId}`);
      return job;
    } catch (error) {
      logger.error('Update job error', error);
      throw error;
    }
  }

  /**
   * Close job
   */
  async closeJob(jobId) {
    try {
      const job = await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
      });

      logger.info(`Job closed: ${jobId}`);
      return job;
    } catch (error) {
      logger.error('Close job error', error);
      throw error;
    }
  }

  /**
   * Delete job
   */
  async deleteJob(jobId) {
    try {
      // Delete related applications and screenings first
      await prisma.screening.deleteMany({
        where: { jobId },
      });

      await prisma.application.deleteMany({
        where: { jobId },
      });

      // Delete job
      await prisma.job.delete({
        where: { id: jobId },
      });

      logger.info(`Job deleted: ${jobId}`);
      return { success: true };
    } catch (error) {
      logger.error('Delete job error', error);
      throw error;
    }
  }
}

module.exports = new JobService();
