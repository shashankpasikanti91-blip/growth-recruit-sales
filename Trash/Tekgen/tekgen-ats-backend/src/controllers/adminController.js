const prisma = require('../config/database');
const config = require('../config/environment');
const { encryptPassword } = require('../utils/encryption');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class AdminController {
  /**
   * List all users (ADMIN only)
   */
  async listUsers(req, res) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, department: true, phone: true, isAccountLocked: true,
          isActive: true, canDeleteCandidates: true, lastLoginAt: true, createdAt: true,
          _count: { select: { candidates: true, jobs: true, screenings: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      sendSuccess(res, { users, total: users.length }, 'Users retrieved');
    } catch (error) {
      logger.error('Admin listUsers error', error);
      sendError(res, 'Failed to list users', 500);
    }
  }

  /**
   * Create a new recruiter account (ADMIN only)
   */
  async createUser(req, res) {
    try {
      const { email, password, firstName, lastName, role, department } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return sendError(res, 'Email, password, first name and last name are required', 400);
      }

      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (existing) return sendError(res, 'Email already exists', 409);

      const hashedPassword = await encryptPassword(password, config.BCRYPT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: role || 'RECRUITER',
          department: department || 'Recruitment',
          loginAttempts: 0,
          isAccountLocked: false,
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, department: true, createdAt: true },
      });

      logger.info(`Admin created user: ${user.email}`);
      sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      logger.error('Admin createUser error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Update a user account (ADMIN only)
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, role, department, isAccountLocked, isActive, password, canDeleteCandidates } = req.body;

      const updateData = {};
      if (firstName) updateData.firstName = firstName.trim();
      if (lastName) updateData.lastName = lastName.trim();
      if (role) updateData.role = role;
      if (department !== undefined) updateData.department = department;
      if (isAccountLocked !== undefined) updateData.isAccountLocked = isAccountLocked;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (canDeleteCandidates !== undefined) updateData.canDeleteCandidates = canDeleteCandidates;
      if (password) {
        updateData.password = await encryptPassword(password, config.BCRYPT_ROUNDS);
      }
      if (isAccountLocked === false) updateData.loginAttempts = 0;

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, email: true, firstName: true, lastName: true, role: true, department: true, isAccountLocked: true, isActive: true, canDeleteCandidates: true },
      });

      logger.info(`Admin updated user: ${user.email}`);
      sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      logger.error('Admin updateUser error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Delete a user account (ADMIN only)
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (id === req.user.id) {
        return sendError(res, 'Cannot delete your own account', 400);
      }

      await prisma.user.delete({ where: { id } });

      logger.info(`Admin deleted user: ${id}`);
      sendSuccess(res, null, 'User deleted successfully');
    } catch (error) {
      logger.error('Admin deleteUser error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Get system-wide dashboard stats (ADMIN only)
   */
  async getSystemStats(req, res) {
    try {
      const [totalUsers, totalCandidates, totalJobs, totalScreenings, totalApplications] = await Promise.all([
        prisma.user.count(),
        prisma.candidate.count(),
        prisma.job.count(),
        prisma.screening.count(),
        prisma.application.count(),
      ]);

      sendSuccess(res, {
        totalUsers, totalCandidates, totalJobs, totalScreenings, totalApplications,
      }, 'System stats retrieved');
    } catch (error) {
      logger.error('Admin getSystemStats error', error);
      sendError(res, 'Failed to get stats', 500);
    }
  }

  /**
   * GET /api/admin/monitoring — recruiter workload + performance overview
   */
  async getMonitoringOverview(req, res) {
    try {
      const recruiters = await prisma.user.findMany({
        where: { role: 'RECRUITER', isActive: true },
        select: {
          id: true, firstName: true, lastName: true, email: true, lastLoginAt: true,
          _count: {
            select: {
              jobs: true,
              candidates: true,
              applications: true,
              screenings: true,
            },
          },
        },
        orderBy: { firstName: 'asc' },
      });

      // Active JDs per recruiter (owned or assigned)
      const activeJobCounts = await prisma.job.groupBy({
        by: ['userId'],
        where: { status: 'OPEN' },
        _count: { id: true },
      });
      const activeJobMap = Object.fromEntries(activeJobCounts.map(j => [j.userId, j._count.id]));

      // Open follow-ups per recruiter
      const followupCounts = await prisma.followUp.groupBy({
        by: ['assignedTo'],
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        _count: { id: true },
      });
      const followupMap = Object.fromEntries(followupCounts.map(f => [f.assignedTo, f._count.id]));

      const enriched = recruiters.map(r => ({
        ...r,
        activeJDs: activeJobMap[r.id] ?? 0,
        openFollowUps: followupMap[r.id] ?? 0,
        totalSubmissions: r._count.applications,
        totalScreenings: r._count.screenings,
      }));

      // System-wide pipeline stage counts
      const pipeline = await prisma.application.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      // JDs by status
      const jdStatus = await prisma.job.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      // SLA at-risk JDs (open > 30 days with no assignee coverage)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const stalledJDs = await prisma.job.findMany({
        where: { status: 'OPEN', createdAt: { lte: thirtyDaysAgo } },
        select: {
          id: true, displayId: true, title: true, createdAt: true,
          user: { select: { firstName: true, lastName: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      sendSuccess(res, {
        recruiters: enriched,
        pipeline,
        jdStatus,
        stalledJDs,
      }, 'Monitoring data retrieved');
    } catch (error) {
      logger.error('Admin getMonitoringOverview error', error);
      sendError(res, 'Failed to get monitoring data', 500);
    }
  }

  /**
   * GET /api/admin/jobs — all JDs with client grouping + CV counts
   */
  async getAllJDs(req, res) {
    try {
      const { search, clientName, status } = req.query;
      const where = {};
      if (status) where.status = status;
      if (clientName) where.clientName = clientName;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { displayId: { contains: search, mode: 'insensitive' } },
          { clientName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const jobs = await prisma.job.findMany({
        where,
        select: {
          id: true, displayId: true, title: true, status: true,
          clientName: true, department: true, location: true,
          createdAt: true, headcount: true,
          user: { select: { firstName: true, lastName: true, id: true } },
          _count: { select: { applications: true } },
          applications: {
            select: { status: true },
          },
        },
        orderBy: [{ clientName: 'asc' }, { createdAt: 'desc' }],
        take: 100,
      });

      // Group by client
      const clientMap = {};
      for (const job of jobs) {
        const client = job.clientName || 'Unassigned';
        if (!clientMap[client]) clientMap[client] = { clientName: client, jobs: [], totalJDs: 0, totalCVs: 0 };
        clientMap[client].jobs.push({
          ...job,
          submissionCount: job._count.applications,
          statusBreakdown: job.applications.reduce((acc, a) => {
            acc[a.status] = (acc[a.status] || 0) + 1;
            return acc;
          }, {}),
          applications: undefined,
        });
        clientMap[client].totalJDs += 1;
        clientMap[client].totalCVs += job._count.applications;
      }

      const clients = Object.values(clientMap).sort((a, b) => b.totalJDs - a.totalJDs);

      sendSuccess(res, { clients, total: jobs.length }, 'JDs retrieved');
    } catch (error) {
      logger.error('Admin getAllJDs error', error);
      sendError(res, 'Failed to get JDs', 500);
    }
  }

  /**
   * PATCH /api/admin/jobs/:jobId/assign — reassign a JD to a different recruiter
   */
  async reassignJob(req, res) {
    try {
      const { jobId } = req.params;
      const { recruiterId } = req.body;

      if (!recruiterId) return sendError(res, 'recruiterId is required', 400);

      const recruiter = await prisma.user.findUnique({ where: { id: recruiterId } });
      if (!recruiter) return sendError(res, 'Recruiter not found', 404);

      const job = await prisma.job.update({
        where: { id: jobId },
        data: { assignedTo: recruiterId },
        select: { id: true, title: true, displayId: true, assignedTo: true },
      });

      logger.info(`Admin reassigned job ${jobId} to ${recruiterId}`);
      sendSuccess(res, job, 'JD reassigned successfully');
    } catch (error) {
      logger.error('Admin reassignJob error', error);
      sendError(res, 'Failed to reassign JD', 500);
    }
  }

  /**
   * Team submissions — who uploaded what (ADMIN view)
   */
  async getTeamSubmissions(req, res) {
    try {
      const { from, to } = req.query;
      const dateFilter = {};
      if (from) dateFilter.gte = new Date(from);
      if (to)   dateFilter.lte = new Date(to);

      // All team members with their candidate/job uploads
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true, firstName: true, lastName: true, email: true, role: true, department: true,
          candidates: {
            where: Object.keys(dateFilter).length ? { createdAt: dateFilter } : undefined,
            select: {
              id: true, displayId: true, firstName: true, lastName: true, email: true,
              currentRole: true, status: true, sourceChannel: true, createdAt: true,
              screenings: { select: { score: true }, orderBy: { score: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
          },
          jobs: {
            where: Object.keys(dateFilter).length ? { createdAt: dateFilter } : undefined,
            select: {
              id: true, displayId: true, title: true, clientName: true, contractType: true,
              status: true, createdAt: true,
              _count: { select: { applications: true, screenings: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { firstName: 'asc' },
      });

      // Build summary per user
      const summary = users.map(u => ({
        user: { id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email, role: u.role, department: u.department },
        candidatesUploaded: u.candidates.length,
        jobsCreated: u.jobs.length,
        candidates: u.candidates,
        jobs: u.jobs,
      }));

      sendSuccess(res, { members: summary, total: users.length }, 'Team submissions retrieved');
    } catch (error) {
      logger.error('Admin getTeamSubmissions error', error);
      sendError(res, 'Failed to retrieve team submissions', 500);
    }
  }
}

module.exports = new AdminController();
