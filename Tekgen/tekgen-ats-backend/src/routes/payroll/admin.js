const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');

const router = express.Router();

/**
 * GET Payroll Admin Dashboard Stats
 * Returns only stats relevant to PAYROLL_ADMIN role
 */
router.get('/stats', authenticate, authorize('PAYROLL_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get current month's payroll run
    const currentPayrollRun = await prisma.payrollRun.findFirst({
      where: {
        month: currentMonth,
        year: currentYear,
      },
      select: {
        id: true,
        month: true,
        year: true,
        status: true,
        grossPayroll: true,
        totalDeductions: true,
        netPayout: true,
        totalEmployees: true,
        workerCategory: true,
        createdAt: true,
      },
    });

    // Get latest run for gross/net totals (any month)
    const latestRun = currentPayrollRun;

    // Total active employees
    const totalStaff = await prisma.employeeProfile.count({
      where: { status: 'ACTIVE' },
    });

    // Employees without approved salary structure
    const pendingSetups = await prisma.employeeProfile.count({
      where: {
        status: 'ACTIVE',
        salaryStructures: {
          none: {
            status: 'APPROVED',
          },
        },
      },
    });

    // Count active employees
    const activeEmployees = totalStaff - pendingSetups;

    // Pending claims count
    const pendingClaims = await prisma.claim.count({
      where: {
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
    });

    // Pending approvals: payroll runs waiting for review
    const pendingApprovals = await prisma.payrollApproval.count({
      where: { status: 'PENDING' },
    }).catch(() => 0);

    return res.json({
      success: true,
      data: {
        totalStaff,
        activeEmployees,
        pendingSetups,
        pendingClaims,
        exceptions: 0,
        pendingApprovals,
        grossPayroll: latestRun?.grossPayroll || 0,
        netPayout: latestRun?.netPayout || 0,
        currentPayrollRun: currentPayrollRun
          ? { ...currentPayrollRun, employeeCount: currentPayrollRun.totalEmployees }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching payroll admin stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message,
    });
  }
});

/**
 * GET Staff under Payroll Admin
 */
router.get('/staff', authenticate, authorize('PAYROLL_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const staff = await prisma.employeeProfile.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        staffType: true,
        visaStatus: true,
        paymentAgreements: {
          select: {
            id: true,
            salaryAmount: true,
            billingType: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch staff list',
    });
  }
});

/**
 * GET Internal Staff (users) for payroll - returns all active users
 * Used by payroll/staff page to show internal team
 */
router.get('/internal-staff', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const profiles = await prisma.employeeProfile.findMany({
      where: { status: 'ACTIVE', employmentType: 'INTERNAL' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        salaryStructures: {
          where: { status: 'APPROVED' },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
          select: { basicSalary: true, allowances: true, status: true },
        },
      },
      orderBy: { employeeId: 'asc' },
    });

    const data = profiles.map(p => ({
      profileId:     p.id,
      employeeId:    p.employeeId,
      userId:        p.userId,
      firstName:     p.user?.firstName || '',
      lastName:      p.user?.lastName  || '',
      email:         p.user?.email     || '',
      role:          p.user?.role      || '',
      designation:   p.designation     || '',
      department:    p.department      || '',
      nationality:   p.nationality     || '',
      joinDate:      p.joinDate,
      status:        p.status,
      employmentType:p.employmentType,
      salary:        p.salaryStructures?.[0] || null,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching internal staff:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch internal staff' });
  }
});

/**
 * GET Payroll period info - returns current payroll period based on 25th-24th cycle
 */
router.get('/period', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth(); // 0-indexed
    const year = now.getFullYear();

    let periodStart, periodEnd, payMonth, payYear;

    if (day >= 25) {
      // From 25th of this month to 24th of next month
      periodStart = new Date(year, month, 25);
      const nextMonthDate = new Date(year, month + 1, 1);
      payMonth = nextMonthDate.getMonth() + 1;
      payYear = nextMonthDate.getFullYear();
      periodEnd = new Date(payYear, payMonth - 1, 24);
    } else {
      // From 25th of last month to 24th of this month
      const lastMonth = new Date(year, month - 1, 25);
      periodStart = lastMonth;
      payMonth = month + 1;
      payYear = year;
      periodEnd = new Date(year, month, 24);
    }

    return res.json({
      success: true,
      data: {
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        payMonth,
        payYear,
        payrollDate: `${payYear}-${String(payMonth).padStart(2,'0')}-25`,
        daysRemaining: Math.max(0, Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))),
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to compute period' });
  }
});

module.exports = router;
