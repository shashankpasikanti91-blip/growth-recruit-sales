const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class ActivityController {
  /**
   * GET /api/activity — admin monitoring: full audit trail
   * Supports ?userId=, ?entityType=, ?limit=, ?page=
   */
  async getActivityLogs(req, res) {
    try {
      const { userId, entityType, limit = 50, page = 1 } = req.query;
      const take = Math.min(parseInt(limit, 10) || 50, 200);
      const skip = (parseInt(page, 10) - 1) * take;

      const where = {};
      if (userId) where.userId = userId;
      if (entityType) where.entityType = entityType;

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        prisma.activityLog.count({ where }),
      ]);

      sendSuccess(res, { logs, total, page: parseInt(page, 10), limit: take }, 'Activity logs retrieved');
    } catch (error) {
      logger.error('getActivityLogs error', error);
      sendError(res, 'Failed to fetch activity logs', 500);
    }
  }

  /**
   * GET /api/activity/summary — admin dashboard: recruiter activity stats
   * Returns per-recruiter count of recent actions grouped by type
   */
  async getActivitySummary(req, res) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const recruiterActivity = await prisma.activityLog.groupBy({
        by: ['userId', 'action'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      // Fetch user details for the involved userIds
      const userIds = [...new Set(recruiterActivity.map(r => r.userId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, role: true },
      });
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      // Aggregate by user
      const byUser = {};
      for (const row of recruiterActivity) {
        if (!byUser[row.userId]) {
          byUser[row.userId] = { user: userMap[row.userId], actions: {} };
        }
        byUser[row.userId].actions[row.action] = row._count.id;
      }

      sendSuccess(res, { summary: Object.values(byUser), since }, 'Activity summary retrieved');
    } catch (error) {
      logger.error('getActivitySummary error', error);
      sendError(res, 'Failed to fetch activity summary', 500);
    }
  }
}

module.exports = new ActivityController();
