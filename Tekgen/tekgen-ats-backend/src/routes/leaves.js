const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getLeaveRequests,
  submitLeaveRequest,
  getLeaveApprovals,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveBalances,
  updateLeaveBalance,
} = require('../controllers/leaveController');

const router = express.Router();

router.use(authenticate);

// Employee endpoints - get their own leave info
router.get('/requests', getLeaveRequests);
router.post('/request', submitLeaveRequest);
router.get('/balances', getLeaveBalances);

// Manager/HR endpoints - approval workflows
router.get('/approvals', authorize(['HR_MANAGER', 'MANAGER', 'HEAD', 'ADMIN']), getLeaveApprovals);
router.post('/approve/:leaveId', authorize(['HR_MANAGER', 'ADMIN']), approveLeaveRequest);
router.post('/reject/:leaveId', authorize(['HR_MANAGER', 'ADMIN']), rejectLeaveRequest);

// Admin endpoints
router.put('/balance/:employeeId', authorize(['ADMIN', 'HR_MANAGER']), updateLeaveBalance);

module.exports = router;
