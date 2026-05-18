const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');
const approvalService = require('../../services/approvalService');

const router = express.Router();

/**
 * GET All claims for admin/payroll review
 */
router.get(
  '/',
  authenticate,
  authorize(
    'PAYROLL_ADMIN',
    'ADMIN',
    'FINANCE',
    'MANAGEMENT',
    'DIRECTOR',
    'HEAD',
    'MD',
    'MANAGING_DIRECTOR',
    'DEPT_HEAD',
    'DEPARTMENT_HEAD',
    'COMPANY_HEAD',
    'HR_ADMIN',
  ),
  async (req, res) => {
  try {
    const { status = 'PENDING', limit = 50, offset = 0 } = req.query;

    let where = {};
    if (status && status !== 'ALL') {
      if (status === 'PENDING') {
        where = { status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW'] } };
      } else {
        where = { status };
      }
    }

    const claims = await prisma.claim.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true, fileUrl: true, uploadedAt: true } },
        approvals: { orderBy: { approvalLevel: 'asc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.claim.count({ where });

    res.json({ success: true, data: { claims, total } });
  } catch (error) {
    console.error('Error fetching claims:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch claims' });
  }
});

/**
 * GET Single claim details with attachments
 */
router.get(
  '/:id',
  authenticate,
  authorize('PAYROLL_ADMIN', 'ADMIN', 'FINANCE', 'MANAGEMENT', 'HR_ADMIN', 'MD', 'MANAGING_DIRECTOR'),
  async (req, res) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: {
        employee: {
          select: {
            employeeId: true,
            designation: true,
            department: true,
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        attachments: true,
        approvals: true
      }
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch claim' });
  }
});

/**
 * POST Approve/Reject claim
 */
router.post('/:id/review', authenticate, authorize('PAYROLL_ADMIN', 'ADMIN', 'FINANCE'), async (req, res) => {
  try {
    const { action, comment } = req.body; // action: APPROVE | REJECT
    const claimId = req.params.id;
    const userId = req.user.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { approvals: { orderBy: { approvalLevel: 'asc' } } },
    });
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    const pendingApproval = (claim.approvals || []).find((a) => a.status === 'PENDING');

    const updatedClaim = await approvalService.processClaimApproval(claimId, userId, action, comment, {
      approvalId: pendingApproval?.id,
      userRole: req.user.role,
    });

    res.json({
      success: true,
      data: {
        message: `Claim ${updatedClaim.status}`,
        claim: updatedClaim,
      },
    });
  } catch (error) {
    console.error('Error reviewing claim:', error);
    res.status(500).json({ success: false, message: 'Failed to review claim' });
  }
});

module.exports = router;
