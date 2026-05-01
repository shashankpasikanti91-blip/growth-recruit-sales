const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/myWorkspaceController');

// All routes require authentication — scoped to the requesting user only
router.use(authenticate);

// Profile
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);

// Leave
router.get('/leave/balance', ctrl.getLeaveBalance);
router.get('/leave', ctrl.getLeaveHistory);
router.post('/leave', ctrl.applyLeave);
router.put('/leave/:id/cancel', ctrl.cancelLeave);

// Claims
router.get('/claims', ctrl.getClaims);
router.post('/claims', ctrl.submitClaim);

// Dashboard summary
router.get('/summary', ctrl.getSummary);

module.exports = router;
