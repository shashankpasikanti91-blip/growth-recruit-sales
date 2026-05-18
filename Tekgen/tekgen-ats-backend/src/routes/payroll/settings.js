const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireRecentBackup } = require('../../middleware/backupGuard');
const prisma = require('../../config/database');

const router = express.Router();

router.get('/', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const { workerCategory, residencyStatus, taxYear, asOf } = req.query;
    const where = { country: 'MY' };
    if (workerCategory) where.workerCategory = workerCategory;
    if (residencyStatus) where.residencyStatus = residencyStatus;
    if (taxYear) where.taxYear = parseInt(taxYear, 10);
    if (asOf) where.effectiveDate = { lte: new Date(asOf) };

    const settings = await prisma.payrollSettings.findMany({
      where,
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
      take: 200
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching payroll settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, authorize('PAYROLL_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const {
      workerCategory,
      effectiveDate,
      taxYear,
      residencyStatus = 'CITIZEN',
      epfEmployeeRate = 8.0,
      epfEmployerRate = 12.0,
      socsoEmployeeRate = 0.5,
      socsoEmployerRate = 1.75,
      eisEmployeeRate = 0.4,
      eisEmployerRate = 0.8,
      hrdfRate = 0.5,
      pcbTaxTable = null,
      taxableIncome = null,
      paymentCycle = 'MONTHLY'
    } = req.body || {};

    if (!workerCategory || !effectiveDate) {
      return res.status(400).json({ success: false, message: 'workerCategory and effectiveDate are required' });
    }

    const created = await prisma.payrollSettings.create({
      data: {
        country: 'MY',
        workerCategory,
        effectiveDate: new Date(effectiveDate),
        taxYear: taxYear ? parseInt(taxYear, 10) : null,
        residencyStatus,
        epfEmployeeRate: Number(epfEmployeeRate),
        epfEmployerRate: Number(epfEmployerRate),
        socsoEmployeeRate: Number(socsoEmployeeRate),
        socsoEmployerRate: Number(socsoEmployerRate),
        eisEmployeeRate: Number(eisEmployeeRate),
        eisEmployerRate: Number(eisEmployerRate),
        hrdfRate: hrdfRate === null ? null : Number(hrdfRate),
        pcbTaxTable,
        taxableIncome: taxableIncome === null ? null : Number(taxableIncome),
        paymentCycle,
        createdBy: req.user.id,
        approvedBy: req.user.id
      }
    });

    res.status(201).json({ success: true, message: 'Payroll settings version created', data: created });
  } catch (error) {
    console.error('Error creating payroll settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

