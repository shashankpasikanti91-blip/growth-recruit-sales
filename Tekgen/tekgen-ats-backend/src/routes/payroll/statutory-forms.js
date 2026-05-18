const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireRecentBackup } = require('../../middleware/backupGuard');
const prisma = require('../../config/database');

const router = express.Router();

const MONTHLY_FORM_TYPES = ['EPF_A', 'SOCSO_A', 'EIS_A', 'PCB_A', 'HRDF_A'];

router.get('/', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const { financialYear, formType, status, employeeId } = req.query;
    const where = {};
    if (financialYear) where.financialYear = parseInt(financialYear, 10);
    if (formType) where.formType = formType;
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const forms = await prisma.statutoryForm.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        }
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 500
    });

    res.json({ success: true, data: forms });
  } catch (error) {
    console.error('Error fetching statutory forms:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/generate-ea/:year', authenticate, authorize('PAYROLL_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    if (!year) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }

    const activeEmployees = await prisma.employeeProfile.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, employeeId: true }
    });

    let createdCount = 0;
    for (const employee of activeEmployees) {
      const exists = await prisma.statutoryForm.findFirst({
        where: {
          employeeId: employee.id,
          financialYear: year,
          formType: 'EA'
        },
        select: { id: true }
      });
      if (exists) continue;

      await prisma.statutoryForm.create({
        data: {
          displayId: `TKG-FORM-${Date.now()}-${employee.employeeId}`,
          employeeId: employee.id,
          formType: 'EA',
          formName: `EA Form ${year}`,
          financialYear: year,
          dueDate: new Date(`${year + 1}-03-31T00:00:00.000Z`),
          status: 'DRAFT',
          notes: 'Auto-generated annual EA form batch.'
        }
      });
      createdCount++;
    }

    res.json({ success: true, message: 'EA forms batch generated', data: { year, createdCount, employeeCount: activeEmployees.length } });
  } catch (error) {
    console.error('Error generating EA forms:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/generate-monthly/:month/:year', authenticate, authorize('PAYROLL_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const month = parseInt(req.params.month, 10);
    const year = parseInt(req.params.year, 10);
    if (!month || month < 1 || month > 12 || !year) {
      return res.status(400).json({ success: false, message: 'Invalid month/year' });
    }

    const dueDate = new Date(Date.UTC(year, month, 15, 0, 0, 0)); // 15th following month
    let createdCount = 0;
    const createdIds = [];
    for (const formType of MONTHLY_FORM_TYPES) {
      const exists = await prisma.statutoryForm.findFirst({
        where: {
          financialYear: year,
          formType,
          notes: { contains: `MONTH=${month};YEAR=${year}` }
        },
        select: { id: true }
      });
      if (exists) continue;

      const created = await prisma.statutoryForm.create({
        data: {
          displayId: `TKG-FORM-${Date.now()}-${formType}-${month}`,
          formType,
          formName: `${formType} Monthly Filing ${month}/${year}`,
          financialYear: year,
          dueDate,
          status: 'DRAFT',
          notes: `AUTO_MONTHLY;MONTH=${month};YEAR=${year}`
        }
      });
      createdIds.push(created.id);
      createdCount++;
    }

    return res.json({
      success: true,
      message: 'Monthly statutory filing batch generated',
      data: { month, year, createdCount, formTypes: MONTHLY_FORM_TYPES, createdIds }
    });
  } catch (error) {
    console.error('Error generating monthly statutory forms:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/year-close/:year', authenticate, authorize('PAYROLL_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    if (!year) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }

    const monthlyCount = await prisma.statutoryForm.count({
      where: {
        financialYear: year,
        formType: { in: MONTHLY_FORM_TYPES }
      }
    });
    const eaCount = await prisma.statutoryForm.count({
      where: {
        financialYear: year,
        formType: 'EA'
      }
    });

    const status = monthlyCount >= MONTHLY_FORM_TYPES.length * 12 && eaCount > 0 ? 'READY_FOR_FILING' : 'INCOMPLETE';
    return res.json({
      success: true,
      data: {
        year,
        monthlyForms: monthlyCount,
        eaForms: eaCount,
        status
      }
    });
  } catch (error) {
    console.error('Error preparing statutory year close:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/status', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const { status, notes } = req.body || {};
    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    const data = { status, notes: notes || undefined };
    if (['SUBMITTED', 'FILED', 'COMPLETED'].includes(status)) {
      data.submittedAt = new Date();
      data.submittedBy = req.user.id;
    }
    if (['APPROVED', 'FILED'].includes(status)) {
      data.approvedAt = new Date();
      data.approvedBy = req.user.id;
    }

    const updated = await prisma.statutoryForm.update({
      where: { id: req.params.id },
      data
    });

    res.json({ success: true, message: 'Statutory form status updated', data: updated });
  } catch (error) {
    console.error('Error updating statutory form status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

