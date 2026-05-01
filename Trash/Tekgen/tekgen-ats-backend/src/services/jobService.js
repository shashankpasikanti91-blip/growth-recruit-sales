const prisma = require('../config/database');
const logger = require('../utils/logger');
const { generateJobId } = require('../utils/idGenerator');

class JobService {
  /**
   * Create a new job
   */
  async createJob(jobData, userId) {
    try {
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
          candidateType: jobData.candidateType || 'ANY',
          assignedRecruiters: jobData.assignedRecruiters || [],
          userId,
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
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { clientName: { contains: filters.search, mode: 'insensitive' } },
          { department: { contains: filters.search, mode: 'insensitive' } },
          { location: { contains: filters.search, mode: 'insensitive' } },
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
      const job = await prisma.job.update({
        where: { id: jobId },
        data: updateData,
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
