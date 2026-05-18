const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { logActivity } = require('../middleware/activityLogger');
const { pushNotification } = require('./notificationController');
const logger = require('../utils/logger');

class FollowUpController {
  /**
   * GET /api/followups — get follow-ups for the logged-in user
   * Admin can also pass ?userId=<id> to see another recruiter's list
   */
  async getFollowUps(req, res) {
    try {
      const { userId, status, jobId } = req.query;

      // Admins may query any user; recruiters only see their own
      const targetUserId =
        req.user.role === 'ADMIN' && userId ? userId : req.user.id;

      const where = { assignedTo: targetUserId };
      if (status) where.status = status;
      if (jobId) where.jobId = jobId;

      const followups = await prisma.followUp.findMany({
        where,
        include: {
          job: { select: { id: true, title: true, displayId: true } },
          application: {
            select: {
              id: true, status: true,
              candidate: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      // Auto-mark OVERDUE on read
      const now = new Date();
      const overdue = followups.filter(f => f.status === 'PENDING' && new Date(f.dueDate) < now);
      if (overdue.length) {
        await prisma.followUp.updateMany({
          where: { id: { in: overdue.map(f => f.id) } },
          data: { status: 'OVERDUE' },
        });
        overdue.forEach(f => (f.status = 'OVERDUE'));
      }

      // Group by priority bucket
      const grouped = {
        overdue:   followups.filter(f => f.status === 'OVERDUE' || (f.status === 'PENDING' && new Date(f.dueDate) < now)),
        today:     followups.filter(f => f.status === 'PENDING' && isToday(new Date(f.dueDate))),
        upcoming:  followups.filter(f => f.status === 'PENDING' && new Date(f.dueDate) > now && !isToday(new Date(f.dueDate))),
        done:      followups.filter(f => f.status === 'DONE'),
      };

      sendSuccess(res, { followups, grouped, total: followups.length }, 'Follow-ups retrieved');
    } catch (error) {
      logger.error('getFollowUps error', error);
      sendError(res, 'Failed to fetch follow-ups', 500);
    }
  }

  /**
   * POST /api/followups — create a follow-up
   */
  async createFollowUp(req, res) {
    try {
      const { note, dueDate, jobId, applicationId, assignedTo } = req.body;
      if (!note || !dueDate) return sendError(res, 'Note and due date are required', 400);

      // Recruiters can only assign follow-ups to themselves
      const assignee =
        req.user.role === 'ADMIN' && assignedTo ? assignedTo : req.user.id;

      const followup = await prisma.followUp.create({
        data: {
          note,
          dueDate: new Date(dueDate),
          assignedTo: assignee,
          jobId: jobId ?? null,
          applicationId: applicationId ?? null,
          status: 'PENDING',
        },
        include: {
          job: { select: { id: true, title: true, displayId: true } },
        },
      });

      await logActivity({
        userId: req.user.id,
        action: 'CREATE_FOLLOWUP',
        entityType: 'FOLLOWUP',
        entityId: followup.id,
        ipAddress: req.ip,
      });

      sendSuccess(res, followup, 'Follow-up created', 201);
    } catch (error) {
      logger.error('createFollowUp error', error);
      sendError(res, 'Failed to create follow-up', 500);
    }
  }

  /**
   * PATCH /api/followups/:id — update status or note
   */
  async updateFollowUp(req, res) {
    try {
      const { id } = req.params;
      const { status, note, dueDate } = req.body;

      const existing = await prisma.followUp.findUnique({ where: { id } });
      if (!existing) return sendError(res, 'Follow-up not found', 404);

      // Recruiters may only update their own
      if (req.user.role !== 'ADMIN' && existing.assignedTo !== req.user.id) {
        return sendError(res, 'Not authorized to update this follow-up', 403);
      }

      const updated = await prisma.followUp.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(note && { note }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
        },
      });

      await logActivity({
        userId: req.user.id,
        action: 'UPDATE_FOLLOWUP',
        entityType: 'FOLLOWUP',
        entityId: id,
        details: { status },
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, 'Follow-up updated');
    } catch (error) {
      logger.error('updateFollowUp error', error);
      sendError(res, 'Failed to update follow-up', 500);
    }
  }

  /**
   * DELETE /api/followups/:id — delete
   */
  async deleteFollowUp(req, res) {
    try {
      const { id } = req.params;
      const existing = await prisma.followUp.findUnique({ where: { id } });
      if (!existing) return sendError(res, 'Follow-up not found', 404);

      if (req.user.role !== 'ADMIN' && existing.assignedTo !== req.user.id) {
        return sendError(res, 'Not authorized', 403);
      }

      await prisma.followUp.delete({ where: { id } });
      sendSuccess(res, null, 'Follow-up deleted');
    } catch (error) {
      logger.error('deleteFollowUp error', error);
      sendError(res, 'Failed to delete follow-up', 500);
    }
  }
}

function isToday(date) {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

module.exports = new FollowUpController();
