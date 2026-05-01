const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Logs an action to the activity_logs table.
 * Non-blocking — failures are swallowed so they never break the main flow.
 */
const logActivity = async ({ userId, action, entityType, entityId, details, ipAddress }) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details: details ?? undefined,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (err) {
    // Never surface activity-log failures to callers
    logger.warn('activityLogger: failed to write log', err?.message);
  }
};

/**
 * Express middleware factory — call in route handlers after the main action.
 * Usage: logActivity({ userId: req.user.id, action: 'CREATE_JOB', ... })
 *
 * This can also be imported directly into controllers for fine-grained control.
 */
module.exports = { logActivity };
