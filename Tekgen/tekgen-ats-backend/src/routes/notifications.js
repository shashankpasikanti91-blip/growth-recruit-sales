/**
 * Notification Routes
 * Routes for retrieving and managing employee notifications
 */

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const notificationService = require('../services/notificationService');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/notifications
 * Get all notifications for logged-in user
 * Query: ?unreadOnly=true&limit=20&offset=0
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { unreadOnly, limit = 20, offset = 0 } = req.query;

    const whereClause = { userId };
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.notification.count({ where: whereClause })
    ]);

    return res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for logged-in user
 */
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    return res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.patch('/:notificationId/read', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for logged-in user
 */
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    return res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete a notification
 */
router.delete('/:notificationId', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/notifications/send-month-end-alerts
 * Admin endpoint to trigger month-end alerts
 */
router.post('/send-month-end-alerts', authenticate, authorize(['ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN']), async (req, res) => {
  try {
    await notificationService.sendMonthEndAlerts();

    return res.json({
      success: true,
      message: 'Month-end alerts sent successfully'
    });
  } catch (error) {
    logger.error('Error sending month-end alerts:', error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
