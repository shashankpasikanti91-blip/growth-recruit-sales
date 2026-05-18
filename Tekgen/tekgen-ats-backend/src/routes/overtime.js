const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  submitOvertimeClaim,
  getOvertimeClaims,
  getOvertimeDetails,
  approveOvertime,
  rejectOvertime,
  getOvertimeForPayroll,
} = require('../controllers/overtimeController');

const router = express.Router();

router.use(authenticate);

// Employee endpoints
router.post('/submit', submitOvertimeClaim);
router.get('/', getOvertimeClaims);
router.get('/:overtimeId', getOvertimeDetails);

// Manager/HR endpoints - approval workflows
router.post('/:overtimeId/approve', authorize(['MANAGER', 'HR_MANAGER', 'ADMIN']), approveOvertime);
router.post('/:overtimeId/reject', authorize(['MANAGER', 'HR_MANAGER', 'ADMIN']), rejectOvertime);

// Payroll endpoints
router.get('/payroll/pending-for-month/:month/:year', authorize(['PAYROLL_ADMIN', 'ADMIN']), getOvertimeForPayroll);

module.exports = router;
