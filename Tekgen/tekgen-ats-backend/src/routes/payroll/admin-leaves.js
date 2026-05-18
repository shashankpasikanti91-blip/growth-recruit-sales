const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');
const approvalService = require('../../services/approvalService');

const router = express.Router();

/**
 * GET All leave requests for admin/HR review
 */
router.get('/', authenticate, authorize('HR_ADMIN', 'ADMIN', 'PAYROLL_ADMIN', 'MANAGEMENT'), async (req, res) => {
  try {
    const { status = 'SUBMITTED', limit = 50, offset = 0 } = req.query;

    const where = status && status !== 'ALL' ? { status } : {};

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true, fileUrl: true, uploadedAt: true } },
        approvals: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.leaveRequest.count({ where });

    res.json({ success: true, data: { leaves, total } });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
  }
});

/**
 * GET Single leave request details
 */
router.get('/:id', authenticate, authorize('HR_ADMIN', 'ADMIN', 'PAYROLL_ADMIN', 'MANAGEMENT'), async (req, res) => {
  try {
    const leave = await prisma.leaveRequest.findUnique({
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

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leave request' });
  }
});

/**
 * POST Approve/Reject leave request
 */
router.post('/:id/review', authenticate, authorize('HR_ADMIN', 'ADMIN', 'PAYROLL_ADMIN', 'MANAGEMENT'), async (req, res) => {
  try {
    const { action, comment } = req.body; // action: APPROVE | REJECT
    const leaveId = req.params.id;
    const userId = req.user.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { approvals: { orderBy: { approvalLevel: 'asc' } } },
    });
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const pendingApproval = (leave.approvals || []).find((a) => a.status === 'PENDING');

    // Follow configured multi-level approval hierarchy (ID + role enforced in service)
    const updatedLeave = await approvalService.processLeaveApproval(leaveId, userId, action, comment, {
      approvalId: pendingApproval?.id,
      userRole: req.user.role,
    });

    res.json({
      success: true,
      data: {
        message: `Leave request ${updatedLeave.status}`,
        leave: updatedLeave,
      },
    });
  } catch (error) {
    console.error('Error reviewing leave:', error);
    res.status(500).json({ success: false, message: 'Failed to review leave' });
  }
});

module.exports = router;
