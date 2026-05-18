const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getClaims,
  submitClaim,
  getClaimApprovals,
  approveClaim,
  rejectClaim,
  getClaimDetails,
  updateClaimStatus,
} = require('../controllers/claimsController');

const router = express.Router();

router.use(authenticate);

// Employee endpoints
router.get('/', getClaims);
router.post('/submit', submitClaim);
router.get('/:claimId', getClaimDetails);

// Manager/HR/Finance endpoints - approval workflows
router.get('/approvals/pending', authorize(['HR_MANAGER', 'FINANCE', 'MANAGER', 'ADMIN']), getClaimApprovals);
router.post('/:claimId/approve', authorize(['HR_MANAGER', 'FINANCE', 'ADMIN']), approveClaim);
router.post('/:claimId/reject', authorize(['HR_MANAGER', 'FINANCE', 'ADMIN']), rejectClaim);

// Admin endpoints
router.patch('/:claimId/status', authorize(['ADMIN', 'FINANCE']), updateClaimStatus);

module.exports = router;
