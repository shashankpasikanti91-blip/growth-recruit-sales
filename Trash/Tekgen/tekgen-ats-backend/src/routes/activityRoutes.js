const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const activityController = require('../controllers/activityController');

const router = express.Router();
router.use(authenticate);
router.use(requireAdmin);

router.get('/', activityController.getActivityLogs);
router.get('/summary', activityController.getActivitySummary);

module.exports = router;
