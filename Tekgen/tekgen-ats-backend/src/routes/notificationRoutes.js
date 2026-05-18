const express = require('express');
const { authenticate } = require('../middleware/auth');
const { notificationController } = require('../controllers/notificationController');

const router = express.Router();
router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', async (req, res) => {
  try {
    const count = await require('../config/database').notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ success: true, data: { unreadCount: count } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed' }); }
});
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
