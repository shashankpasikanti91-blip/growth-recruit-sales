const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');

const router = express.Router();

// GET all salary structures (Payroll Admin only)
router.get('/', authenticate, authorize('PAYROLL_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const structures = await prisma.salaryStructure.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            userId: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: structures });
  } catch (error) {
    console.error('Error fetching salary structures:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single salary structure
router.get('/:id', authenticate, authorize('PAYROLL_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id },
      include: {
        employee: {
          select: {
            employeeId: true,
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        }
      }
    });

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    res.json({ success: true, data: structure });
  } catch (error) {
    console.error('Error fetching salary structure:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE salary structure (Payroll Admin only)
router.post('/', authenticate, authorize('PAYROLL_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      employeeId,
      basicSalary,
      payFrequency,
      allowances,
      deductions,
      overtimeRate,
      effectiveFrom,
      effectiveUntil,
    } = req.body;
    const normalizedFreq = payFrequency === 'DAILY' ? 'DAILY' : 'MONTHLY';

    // Validate employee exists
    const employee = await prisma.employeeProfile.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Mark previous structure as superseded if it exists and is effective
    await prisma.salaryStructure.updateMany({
      where: {
        employeeId,
        status: 'APPROVED',
        effectiveUntil: null
      },
      data: {
        status: 'SUPERSEDED',
        effectiveUntil: new Date(effectiveFrom)
      }
    });

    const structure = await prisma.salaryStructure.create({
      data: {
        employeeId,
        basicSalary,
        payFrequency: normalizedFreq,
        allowances: allowances || {},
        deductions: deductions || {},
        overtimeRate: overtimeRate || 0,
        effectiveFrom: new Date(effectiveFrom),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        status: 'DRAFT',
        createdBy: req.user.id
      },
      include: {
        employee: {
          select: {
            employeeId: true,
            user: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    // Audit log
    await prisma.payrollAuditLog.create({
      data: {
        entityType: 'SALARY_STRUCTURE',
        entityId: structure.id,
        action: 'CREATE',
        newValue: structure,
        reason: 'New salary structure created',
        changedBy: req.user.id
      }
    });

    res.status(201).json({ success: true, message: 'Salary structure created', data: structure });
  } catch (error) {
    console.error('Error creating salary structure:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE salary structure (Payroll Admin only)
router.put('/:id', authenticate, authorize('PAYROLL_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { basicSalary, payFrequency, allowances, deductions, overtimeRate, effectiveUntil, status } = req.body;

    const oldStructure = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id }
    });

    if (!oldStructure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    // Only DRAFT structures can be updated
    if (oldStructure.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only DRAFT structures can be updated' });
    }

    const updated = await prisma.salaryStructure.update({
      where: { id: req.params.id },
      data: {
        basicSalary: basicSalary ?? oldStructure.basicSalary,
        payFrequency:
          payFrequency === 'DAILY' || payFrequency === 'MONTHLY'
            ? payFrequency
            : (oldStructure.payFrequency || 'MONTHLY'),
        allowances: allowances ?? oldStructure.allowances,
        deductions: deductions ?? oldStructure.deductions,
        overtimeRate: overtimeRate ?? oldStructure.overtimeRate,
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : oldStructure.effectiveUntil,
        status: status ?? oldStructure.status
      },
      include: {
        employee: { select: { employeeId: true, user: { select: { firstName: true, lastName: true } } } }
      }
    });

    // Audit log
    await prisma.payrollAuditLog.create({
      data: {
        entityType: 'SALARY_STRUCTURE',
        entityId: req.params.id,
        action: 'UPDATE',
        oldValue: oldStructure,
        newValue: updated,
        reason: 'Salary structure updated',
        changedBy: req.user.id
      }
    });

    res.json({ success: true, message: 'Salary structure updated', data: updated });
  } catch (error) {
    console.error('Error updating salary structure:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// APPROVE salary structure (Payroll Admin)
router.put('/:id/approve', authenticate, authorize('PAYROLL_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id }
    });

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    const approved = await prisma.salaryStructure.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        employee: { select: { employeeId: true, user: { select: { firstName: true, lastName: true } } } }
      }
    });

    // Audit log
    await prisma.payrollAuditLog.create({
      data: {
        entityType: 'SALARY_STRUCTURE',
        entityId: req.params.id,
        action: 'UPDATE',
        oldValue: { status: structure.status },
        newValue: { status: approved.status },
        reason: 'Salary structure approved',
        changedBy: req.user.id
      }
    });

    res.json({ success: true, message: 'Salary structure approved', data: approved });
  } catch (error) {
    console.error('Error approving salary structure:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE salary structure (only DRAFT - Payroll Admin)
router.delete('/:id', authenticate, authorize('PAYROLL_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id }
    });

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    if (structure.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only DRAFT structures can be deleted' });
    }

    await prisma.salaryStructure.delete({
      where: { id: req.params.id }
    });

    // Audit log
    await prisma.payrollAuditLog.create({
      data: {
        entityType: 'SALARY_STRUCTURE',
        entityId: req.params.id,
        action: 'DELETE',
        oldValue: structure,
        reason: 'Salary structure deleted',
        changedBy: req.user.id
      }
    });

    res.json({ success: true, message: 'Salary structure deleted' });
  } catch (error) {
    console.error('Error deleting salary structure:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
