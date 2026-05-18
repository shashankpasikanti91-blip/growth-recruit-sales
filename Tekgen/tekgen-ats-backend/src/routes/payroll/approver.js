/**
 * Leave & Claim Approver Routes
 * For managers/heads to review and approve/reject leave and claim requests
 * POST approve/reject leaves, claims, overtime
 */

const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');
const approvalService = require('../../services/approvalService');
const notificationService = require('../../services/notificationService');
const logger = require('../../utils/logger');

const router = express.Router();
const APPROVER_ROLES = [
  'ADMIN', 'MANAGEMENT', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD', 'MD', 'MANAGING_DIRECTOR', 'COMPANY_HEAD',
  'MANAGER', 'DEPT_MANAGER', 'DEPARTMENT_MANAGER', 'DEPT_HEAD', 'DEPARTMENT_HEAD',
  'HR_ADMIN', 'PAYROLL_ADMIN', 'FINANCE_HEAD', 'RECRUITMENT_MANAGER', 'SALES_MANAGER',
  'CLIENT_APPROVER',
];
const EXECUTIVE_ROLES = new Set(['ADMIN', 'MANAGEMENT', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD', 'MD', 'MANAGING_DIRECTOR', 'COMPANY_HEAD', 'DEPT_HEAD', 'DEPARTMENT_HEAD']);

function buildApprovalWhereForUser(userId, userRole, status) {
  const filters = [{ assignedTo: userId }];
  if (EXECUTIVE_ROLES.has(userRole)) {
    // Executive users must see all L2 executive approvals, not only items directly assigned to one account.
    filters.push({ approverRole: 'MANAGING_DIRECTOR' });
  }
  return {
    OR: filters,
    ...(status && status !== 'ALL' ? { status } : {})
  };
}

async function notifyDepartmentReviewUpdate({ employee, type, displayId, statusLabel, comment, actorId, relatedId }) {
  try {
    if (!employee?.userId) return;
    const title = `${type} review update: ${displayId}`;
    const message = `${type} ${displayId} is ${statusLabel}${comment ? ` - ${comment}` : ''}`;

    // Notify requester
    await notificationService.createNotification({
      userId: employee.userId,
      type: 'APPROVAL_STATUS_CHANGED',
      title,
      message,
      relatedId,
      severity: statusLabel.includes('rejected') ? 'HIGH' : 'NORMAL'
    });

    // Notify department heads/managers for visibility
    const departmentManagers = await prisma.user.findMany({
      where: {
        department: employee.department || undefined,
        role: { in: ['RECRUITMENT_MANAGER', 'SALES_MANAGER', 'HR_ADMIN', 'PAYROLL_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'] },
        id: { notIn: [actorId, employee.userId] }
      },
      select: { id: true }
    });

    for (const manager of departmentManagers) {
      await notificationService.createNotification({
        userId: manager.id,
        type: 'DEPARTMENT_APPROVAL_UPDATE',
        title,
        message: `Department update: ${message}`,
        relatedId,
        severity: statusLabel.includes('rejected') ? 'HIGH' : 'NORMAL'
      });
    }
  } catch (error) {
    logger.error('Department review notification error:', error);
  }
}

/**
 * GET /api/payroll/approver/dashboard
 * Get summary of pending approvals for current manager/head
 */
router.get('/dashboard', authenticate, authorize(...APPROVER_ROLES), async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const pendingWhere = buildApprovalWhereForUser(userId, userRole, 'PENDING');
    
    // Get pending items assigned to this user
    const [pendingLeaves, pendingClaims] = await Promise.all([
      prisma.leaveApproval.count({
        where: pendingWhere
      }),
      prisma.claimApproval.count({
        where: pendingWhere
      })
    ]);

    // Get recently approved items (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentApprovals, recentRejections] = await Promise.all([
      prisma.leaveApproval.count({
        where: {
          approvedBy: userId,
          status: 'APPROVED',
          approvedAt: { gte: sevenDaysAgo }
        }
      }),
      prisma.leaveApproval.count({
        where: {
          approvedBy: userId,
          status: 'REJECTED',
          approvedAt: { gte: sevenDaysAgo }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        pending: {
          leaves: pendingLeaves,
          claims: pendingClaims,
          total: pendingLeaves + pendingClaims
        },
        recent: {
          approvals: recentApprovals,
          rejections: recentRejections
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching approval dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
});

/**
 * GET /api/payroll/approver/leaves
 * Get pending leave approvals for current manager
 */
router.get('/leaves', authenticate, authorize(...APPROVER_ROLES), async (req, res) => {
  try {
    const { status = 'PENDING', limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    const where = buildApprovalWhereForUser(userId, userRole, status);

    const [approvals, total] = await Promise.all([
      prisma.leaveApproval.findMany({
        where,
        include: {
          leaveRequest: {
            include: {
              employee: {
                select: {
                  id: true,
                  employeeId: true,
                  designation: true,
                  department: true,
                  user: { select: { firstName: true, lastName: true, email: true } }
                }
              },
              attachments: { select: { id: true, fileName: true, fileUrl: true } },
              approvals: { orderBy: { approvalLevel: 'asc' } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.leaveApproval.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        approvals,
        total,
        page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching leave approvals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave approvals' });
  }
});

/**
 * GET /api/payroll/approver/claims
 * Get pending claim approvals for current reviewer
 */
router.get('/claims', authenticate, authorize(...APPROVER_ROLES), async (req, res) => {
  try {
    const { status = 'PENDING', limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    const where = buildApprovalWhereForUser(userId, userRole, status);

    const [approvals, total] = await Promise.all([
      prisma.claimApproval.findMany({
        where,
        include: {
          claim: {
            include: {
              employee: {
                select: {
                  id: true,
                  employeeId: true,
                  designation: true,
                  department: true,
                  user: { select: { firstName: true, lastName: true, email: true } }
                }
              },
              attachments: { select: { id: true, fileName: true, fileUrl: true } },
              approvals: { orderBy: { approvalLevel: 'asc' } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.claimApproval.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        approvals,
        total,
        page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching claim approvals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch claim approvals' });
  }
});

/**
 * POST /api/payroll/approver/leaves/:leaveId/action
 * Approve or reject a leave request
 */
router.post('/leaves/:leaveId/action', authenticate, authorize(...APPROVER_ROLES), async (req, res) => {
  try {
    const { action, comments, approvalId } = req.body;
    const leaveId = req.params.leaveId;
    const userId = req.user.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT' });
    }

    // Verify user is assigned to approve this
    let approval = await prisma.leaveApproval.findFirst({
      where: {
        leaveRequest: { id: leaveId },
        assignedTo: userId,
        status: 'PENDING'
      }
    });

    if (!approval && EXECUTIVE_ROLES.has(req.user.role)) {
      approval = await prisma.leaveApproval.findFirst({
        where: {
          leaveRequest: { id: leaveId },
          approverRole: 'MANAGING_DIRECTOR',
          status: 'PENDING'
        }
      });
    }

    if (!approval) {
      return res.status(403).json({ success: false, message: 'You are not authorized to approve this request or it is not pending' });
    }

    // Process approval (ID + role enforced in service)
    const updatedLeave = await approvalService.processLeaveApproval(leaveId, userId, action, comments, {
      approvalId: approvalId || approval?.id,
      userRole: req.user.role,
    });

    // Send notification to employee (existing)
    if (updatedLeave && updatedLeave.employee) {
      await notificationService.notifyApprovalStatusChange(updatedLeave.employee.id, {
        type: 'LEAVE_REQUEST',
        itemId: leaveId,
        displayId: updatedLeave.displayId,
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        comment: comments
      });
    }

    // Send department/requester visibility update
    if (updatedLeave && updatedLeave.employeeId) {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: updatedLeave.employeeId },
        select: { id: true, userId: true, department: true }
      });
      await notifyDepartmentReviewUpdate({
        employee,
        type: 'Leave request',
        displayId: updatedLeave.displayId || leaveId,
        statusLabel: action === 'APPROVE'
          ? (updatedLeave.status === 'APPROVED' ? 'approved' : 'approved at current level and pending next review')
          : 'rejected',
        comment: comments,
        actorId: userId,
        relatedId: leaveId
      });
    }

    res.json({
      success: true,
      data: {
        leave: updatedLeave,
        message: `Leave request ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`
      }
    });
  } catch (error) {
    logger.error('Error processing leave approval:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process approval' });
  }
});

/**
 * POST /api/payroll/approver/claims/:claimId/action
 * Approve or reject a claim request
 */
router.post('/claims/:claimId/action', authenticate, authorize(...APPROVER_ROLES), async (req, res) => {
  try {
    const { action, comments, approvalId } = req.body;
    const claimId = req.params.claimId;
    const userId = req.user.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT' });
    }

    // Verify user is assigned to approve this
    let approval = await prisma.claimApproval.findFirst({
      where: {
        claim: { id: claimId },
        assignedTo: userId,
        status: 'PENDING'
      }
    });

    if (!approval && EXECUTIVE_ROLES.has(req.user.role)) {
      approval = await prisma.claimApproval.findFirst({
        where: {
          claim: { id: claimId },
          approverRole: 'MANAGING_DIRECTOR',
          status: 'PENDING'
        }
      });
    }

    if (!approval) {
      return res.status(403).json({ success: false, message: 'You are not authorized to approve this request or it is not pending' });
    }

    const updatedClaim = await approvalService.processClaimApproval(claimId, userId, action, comments, {
      approvalId: approvalId || approval?.id,
      userRole: req.user.role,
    });

    // Send notification to employee (existing)
    if (updatedClaim && updatedClaim.employee) {
      await notificationService.notifyApprovalStatusChange(updatedClaim.employee.id, {
        type: 'EXPENSE_CLAIM',
        itemId: claimId,
        displayId: updatedClaim.displayId,
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        comment: comments
      });
    }

    // Send department/requester visibility update
    if (updatedClaim && updatedClaim.employeeId) {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: updatedClaim.employeeId },
        select: { id: true, userId: true, department: true }
      });
      await notifyDepartmentReviewUpdate({
        employee,
        type: 'Claim',
        displayId: updatedClaim.displayId || claimId,
        statusLabel: action === 'APPROVE'
          ? (updatedClaim.status === 'APPROVED' ? 'approved' : 'approved at current level and pending next review')
          : 'rejected',
        comment: comments,
        actorId: userId,
        relatedId: claimId
      });
    }

    res.json({
      success: true,
      data: {
        claim: updatedClaim,
        message: `Claim ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`
      }
    });
  } catch (error) {
    logger.error('Error processing claim approval:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process approval' });
  }
});

/**
 * GET /api/payroll/approver/leaves/:leaveId
 * Get detailed leave request with approval history
 */
router.get('/leaves/:leaveId', authenticate, async (req, res) => {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: req.params.leaveId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            department: true,
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        attachments: true,
        approvals: {
          include: {
            leaveRequest: false
          },
          orderBy: { approvalLevel: 'asc' }
        }
      }
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    res.json({ success: true, data: leave });
  } catch (error) {
    logger.error('Error fetching leave detail:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave details' });
  }
});

/**
 * GET /api/payroll/approver/claims/:claimId
 * Get detailed claim with approval history
 */
router.get('/claims/:claimId', authenticate, async (req, res) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.claimId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            department: true,
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        attachments: true,
        approvals: {
          include: {
            claim: false
          },
          orderBy: { approvalLevel: 'asc' }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    res.json({ success: true, data: claim });
  } catch (error) {
    logger.error('Error fetching claim detail:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch claim details' });
  }
});

/**
 * GET /api/payroll/approver/history
 * Get approval history for current user (what they've approved/rejected)
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { type = 'all', limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    const result = {};

    if (type === 'leaves' || type === 'all') {
      const [approvals, total] = await Promise.all([
        prisma.leaveApproval.findMany({
          where: {
            approvedBy: userId,
            status: { in: ['APPROVED', 'REJECTED'] }
          },
          include: {
            leaveRequest: {
              include: {
                employee: {
                  select: {
                    employeeId: true,
                    user: { select: { firstName: true, lastName: true } }
                  }
                }
              }
            }
          },
          orderBy: { approvedAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.leaveApproval.count({
          where: {
            approvedBy: userId,
            status: { in: ['APPROVED', 'REJECTED'] }
          }
        })
      ]);

      result.leaves = { approvals, total };
    }

    if (type === 'claims' || type === 'all') {
      const [approvals, total] = await Promise.all([
        prisma.claimApproval.findMany({
          where: {
            approvedBy: userId,
            status: { in: ['APPROVED', 'REJECTED'] }
          },
          include: {
            claim: {
              include: {
                employee: {
                  select: {
                    employeeId: true,
                    user: { select: { firstName: true, lastName: true } }
                  }
                }
              }
            }
          },
          orderBy: { approvedAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.claimApproval.count({
          where: {
            approvedBy: userId,
            status: { in: ['APPROVED', 'REJECTED'] }
          }
        })
      ]);

      result.claims = { approvals, total };
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error fetching approval history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

module.exports = router;
