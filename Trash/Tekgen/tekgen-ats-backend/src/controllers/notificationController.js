const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class NotificationController {
  /**
   * GET /api/notifications — fetch unread + recent notifications for the logged-in user
   */
  async getNotifications(req, res) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      const unreadCount = notifications.filter(n => !n.isRead).length;
      sendSuccess(res, { notifications, unreadCount }, 'Notifications retrieved');
    } catch (error) {
      logger.error('getNotifications error', error);
      sendError(res, 'Failed to fetch notifications', 500);
    }
  }

  /**
   * PATCH /api/notifications/:id/read — mark a single notification read
   */
  async markRead(req, res) {
    try {
      const { id } = req.params;
      await prisma.notification.updateMany({
        where: { id, userId: req.user.id },
        data: { isRead: true },
      });
      sendSuccess(res, null, 'Marked as read');
    } catch (error) {
      logger.error('markRead error', error);
      sendError(res, 'Failed to update notification', 500);
    }
  }

  /**
   * PATCH /api/notifications/read-all — mark all notifications read
   */
  async markAllRead(req, res) {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true },
      });
      sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      logger.error('markAllRead error', error);
      sendError(res, 'Failed to update notifications', 500);
    }
  }

  /**
   * DELETE /api/notifications/:id — delete a notification
   */
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      await prisma.notification.deleteMany({
        where: { id, userId: req.user.id },
      });
      sendSuccess(res, null, 'Notification deleted');
    } catch (error) {
      logger.error('deleteNotification error', error);
      sendError(res, 'Failed to delete notification', 500);
    }
  }
}

/**
 * Utility: push a notification to a user (called from other controllers)
 */
const pushNotification = async ({ userId, message, type = 'INFO', link }) => {
  try {
    await prisma.notification.create({
      data: { userId, message, type, link: link ?? null },
    });
  } catch (err) {
    logger.warn('pushNotification failed', err?.message);
  }
};

module.exports = { notificationController: new NotificationController(), pushNotification };
