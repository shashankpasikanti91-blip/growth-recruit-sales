const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireRecentBackup } = require('../../middleware/backupGuard');
const prisma = require('../../config/database');
const notificationService = require('../../services/notificationService');

const router = express.Router();
const EXEC_APPROVER_ROLES = ['MANAGEMENT', 'ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD', 'MD', 'MANAGING_DIRECTOR', 'DEPT_HEAD', 'DEPARTMENT_HEAD', 'COMPANY_HEAD'];
const AUTHORIZED_PAYROLL_APPROVER_ROLES = ['PAYROLL_ADMIN', 'MANAGEMENT', 'ADMIN', 'FINANCE', 'FINANCE_HEAD', 'HR_ADMIN', ...EXEC_APPROVER_ROLES];

async function notifyPayrollDecision({ approval, actorId, action, comment }) {
  try {
    const run = await prisma.payrollRun.findUnique({
      where: { id: approval.payrollRunId },
      select: { id: true, displayId: true, month: true, year: true, createdBy: true }
    });
    if (!run?.createdBy) return;

    const requester = await prisma.user.findUnique({
      where: { id: run.createdBy },
      select: { id: true, firstName: true, department: true }
    });
    if (!requester) return;

    const actionLabel = action === 'APPROVED' ? 'approved' : 'rejected';
    const title = `Payroll ${actionLabel.toUpperCase()}: ${run.displayId || run.id}`;
    const message = `${run.displayId || run.id} (${run.month}/${run.year}) has been ${actionLabel}${comment ? ` - ${comment}` : ''}`;

    // Notify requester (owning department initiator)
    await notificationService.createNotification({
      userId: requester.id,
      type: 'PAYROLL_APPROVAL_STATUS_CHANGED',
      title,
      message,
      relatedId: run.id,
      severity: action === 'REJECTED' ? 'HIGH' : 'NORMAL'
    });

    // Notify managers/executives in same department for visibility
    const departmentManagers = await prisma.user.findMany({
      where: {
        department: requester.department || undefined,
        role: {
          in: ['RECRUITMENT_MANAGER', 'SALES_MANAGER', 'HR_ADMIN', 'PAYROLL_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN']
        },
        id: { notIn: [actorId, requester.id] }
      },
      select: { id: true }
    });

    for (const manager of departmentManagers) {
      await notificationService.createNotification({
        userId: manager.id,
        type: 'PAYROLL_APPROVAL_STATUS_CHANGED',
        title,
        message: `Department update: ${message}`,
        relatedId: run.id,
        severity: action === 'REJECTED' ? 'HIGH' : 'NORMAL'
      });
    }
  } catch (error) {
    // Notification must never break payroll approval flow
    console.error('Payroll decision notification error:', error.message);
  }
}

async function notifyNextStepApprovers(payrollRunId, step) {
  try {
    const nextStep = await prisma.payrollApproval.findFirst({
      where: { payrollRunId, step: step + 1, status: 'PENDING' },
      select: { requiredRole: true, payrollRunId: true }
    });
    if (!nextStep) return;

    const run = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      select: { id: true, displayId: true, month: true, year: true }
    });
    if (!run) return;

    const approvers = await prisma.user.findMany({
      where: {
        role: nextStep.requiredRole === 'MANAGEMENT'
          ? { in: EXEC_APPROVER_ROLES }
          : nextStep.requiredRole
      },
      select: { id: true }
    });

    for (const approver of approvers) {
      await notificationService.createNotification({
        userId: approver.id,
        type: 'PAYROLL_APPROVAL_REQUIRED',
        title: `Payroll Approval Required: ${run.displayId || run.id}`,
        message: `Please review payroll run ${run.displayId || run.id} (${run.month}/${run.year})`,
        relatedId: run.id,
        severity: 'HIGH'
      });
    }
  } catch (error) {
    console.error('Next-step approver notification error:', error.message);
  }
}

// GET pending approvals for current user
router.get('/', authenticate, authorize(...AUTHORIZED_PAYROLL_APPROVER_ROLES), async (req, res) => {
  try {
    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Map role to required_role for payroll approvals
    const roleMap = {
      'PAYROLL_ADMIN': 'PAYROLL_ADMIN',
      'MANAGEMENT': 'MANAGEMENT',
      'FINANCE_HEAD': 'MANAGEMENT',
      'FINANCE': 'FINANCE',
      'ADMIN': 'MANAGEMENT',
      'HR_ADMIN': 'MANAGEMENT',
      'SUPER_ADMIN': 'MANAGEMENT',
      'DIRECTOR': 'MANAGEMENT',
      'HEAD': 'MANAGEMENT',
      'MD': 'MANAGEMENT',
      'MANAGING_DIRECTOR': 'MANAGEMENT',
      'DEPT_HEAD': 'MANAGEMENT',
      'DEPARTMENT_HEAD': 'MANAGEMENT',
      'COMPANY_HEAD': 'MANAGEMENT'
    };

    const requiredRole = roleMap[user.role];

    if (!requiredRole) {
      return res.status(403).json({ success: false, message: 'User role not authorized for payroll approvals' });
    }

    // Get pending approvals for this user's role
    const approvals = await prisma.payrollApproval.findMany({
      where: {
        status: 'PENDING',
        requiredRole
      },
      include: {
        payrollRun: {
          select: {
            id: true,
            displayId: true,
            month: true,
            year: true,
            status: true,
            totalEmployees: true,
            grossPayroll: true,
            netPayout: true,
            exceptions: true,
            createdBy: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: approvals });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET approval details
router.get('/:id', authenticate, authorize(...AUTHORIZED_PAYROLL_APPROVER_ROLES), async (req, res) => {
  try {
    const approval = await prisma.payrollApproval.findUnique({
      where: { id: req.params.id },
      include: {
        payrollRun: {
          include: {
            payslips: {
              include: {
                employee: {
                  select: {
                    employeeId: true,
                    user: { select: { firstName: true, lastName: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found' });
    }

    res.json({ success: true, data: approval });
  } catch (error) {
    console.error('Error fetching approval:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// APPROVE payroll step
router.post('/:id/approve', authenticate, authorize(...AUTHORIZED_PAYROLL_APPROVER_ROLES), requireRecentBackup(24), async (req, res) => {
  try {
    const { notes } = req.body;

    const approval = await prisma.payrollApproval.findUnique({
      where: { id: req.params.id },
      include: { payrollRun: true }
    });

    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found' });
    }

    if (approval.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Approval is not pending' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
    const canApprove = (
      (approval.requiredRole === 'PAYROLL_ADMIN' && user?.role === 'PAYROLL_ADMIN') ||
      (approval.requiredRole === 'MANAGEMENT' && EXEC_APPROVER_ROLES.includes(user?.role))
    );
    if (!canApprove) {
      return res.status(403).json({ success: false, message: 'You are not authorized for this approval step' });
    }

    // Update approval
    const updated = await prisma.payrollApproval.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        notes
      },
      include: { payrollRun: true }
    });

    // Check if all steps are approved, then move to next status
    const allApprovals = await prisma.payrollApproval.findMany({
      where: { payrollRunId: approval.payrollRunId }
    });

    const allApproved = allApprovals.every(a => a.status === 'APPROVED' || a.status === 'SKIPPED');

    if (allApproved && ['REVIEW', 'UNDER_REVIEW'].includes(approval.payrollRun.status)) {
      if (approval.step < 2) {
        await prisma.payrollRun.update({
          where: { id: approval.payrollRunId },
          data: { status: 'FINANCE_REVIEW' }
        });
      } else {
        // All approvals complete
        await prisma.payrollRun.update({
          where: { id: approval.payrollRunId },
          data: { status: 'APPROVED' }
        });
      }
    } else if (updated.status === 'APPROVED') {
      await notifyNextStepApprovers(approval.payrollRunId, approval.step);
    }

    // Audit log
    await prisma.payrollAuditLog.create({
      data: {
        payrollRunId: approval.payrollRunId,
        entityType: 'PAYROLL_RUN',
        entityId: approval.payrollRunId,
        action: 'UPDATE',
        oldValue: { status: approval.payrollRun.status },
        newValue: { status: allApproved ? 'APPROVED' : 'UNDER_REVIEW' },
        reason: `Approved by ${approval.stepName}`,
        changedBy: req.user.id
      }
    });

    await notifyPayrollDecision({
      approval,
      actorId: req.user.id,
      action: 'APPROVED',
      comment: notes
    });

    res.json({ success: true, message: 'Approval submitted and department notified', data: updated });
  } catch (error) {
    console.error('Error approving payroll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// REJECT payroll step
router.post('/:id/reject', authenticate, authorize(...AUTHORIZED_PAYROLL_APPROVER_ROLES), requireRecentBackup(24), async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const approval = await prisma.payrollApproval.findUnique({
      where: { id: req.params.id },
      include: { payrollRun: true }
    });

    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found' });
    }

    if (approval.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Approval is not pending' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
    const canReject = (
      (approval.requiredRole === 'PAYROLL_ADMIN' && user?.role === 'PAYROLL_ADMIN') ||
      (approval.requiredRole === 'MANAGEMENT' && EXEC_APPROVER_ROLES.includes(user?.role))
    );
    if (!canReject) {
      return res.status(403).json({ success: false, message: 'You are not authorized for this approval step' });
    }

    // Update approval
    const updated = await prisma.payrollApproval.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        rejectionReason
      },
      include: { payrollRun: true }
    });

    // Move payroll run back to previous status for corrections
    const previousStatus = 'UNDER_REVIEW';

    await prisma.payrollRun.update({
      where: { id: approval.payrollRunId },
      data: { status: previousStatus }
    });

    // Audit log
    await prisma.payrollAuditLog.create({
      data: {
        payrollRunId: approval.payrollRunId,
        entityType: 'PAYROLL_RUN',
        entityId: approval.payrollRunId,
        action: 'UPDATE',
        oldValue: { status: approval.payrollRun.status },
        newValue: { status: previousStatus },
        reason: `Rejected by ${approval.stepName}: ${rejectionReason}`,
        changedBy: req.user.id
      }
    });

    await notifyPayrollDecision({
      approval,
      actorId: req.user.id,
      action: 'REJECTED',
      comment: rejectionReason
    });

    res.json({ success: true, message: 'Approval rejected, payroll returned for corrections, and department notified', data: updated });
  } catch (error) {
    console.error('Error rejecting payroll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
