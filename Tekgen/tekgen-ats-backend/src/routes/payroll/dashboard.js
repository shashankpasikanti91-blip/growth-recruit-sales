const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');
const config = require('../../config/environment');

const router = express.Router();

function safeServerError(error) {
  return config.NODE_ENV === 'development' ? error.message : 'Internal server error';
}

/**
 * GET Payroll Dashboard with KPIs
 * - Monthly stats, pending setups, exceptions, recent runs
 */
router.get('/', authenticate, authorize('PAYROLL_ADMIN', 'FINANCE', 'FINANCE_HEAD', 'HR_ADMIN', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
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
    });

    // Total active employees
    const totalEmployees = await prisma.employeeProfile.count({
      where: { status: 'ACTIVE' },
    });

    // Employees without approved salary structure
    const employeesWithoutStructure = await prisma.employeeProfile.count({
      where: {
        status: 'ACTIVE',
        salaryStructures: {
          none: {
            status: 'APPROVED',
          },
        },
      },
    });

    // Pending payroll approvals
    const pendingApprovalsCount = await prisma.payrollApproval.count({
      where: {
        status: 'PENDING',
        payrollRun: {
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    // Payslips generated this month
    const payslipsGenerated = await prisma.payslip.count({
      where: {
        month: currentMonth,
        year: currentYear,
      },
    });

    // Get last 6 months of payroll runs
    const recentRuns = await prisma.payrollRun.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        approvals: {
          select: {
            id: true,
            stepName: true,
            status: true,
          },
        },
      },
    });

    // Get pending approvals details
    const pendingApprovals = await prisma.payrollApproval.findMany({
      where: {
        status: 'PENDING',
      },
      take: 5,
      orderBy: { createdAt: 'asc' },
      include: {
        payrollRun: {
          select: {
            displayId: true,
            month: true,
            year: true,
          },
        },
      },
    });

    // Get payment statistics
    const paymentStats = await prisma.payslip.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { netSalary: true },
      where: {
        month: currentMonth,
        year: currentYear,
      },
    });

    // Aggregate payroll data
    const aggregatedData = await prisma.payslip.aggregate({
      where: {
        month: currentMonth,
        year: currentYear,
      },
      _sum: {
        grossSalary: true,
        totalDeductions: true,
        netSalary: true,
      },
      _count: { id: true },
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalEmployees,
          pendingSalarySetup: employeesWithoutStructure,
          pendingApprovalsCount,
          payslipsGenerated,
          currentMonth,
          currentYear,
        },
        currentRun: currentPayrollRun,
        aggregatedData: {
          payslipsCount: aggregatedData._count.id,
          totalGross: aggregatedData._sum.grossSalary || 0,
          totalDeductions: aggregatedData._sum.totalDeductions || 0,
          totalNetPayout: aggregatedData._sum.netSalary || 0,
        },
        paymentStats,
        recentRuns,
        pendingApprovals,
      },
    });
  } catch (error) {
    console.error('Payroll Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll dashboard',
      error: error.message,
    });
  }
});

/**
 * GET payroll summary for a specific period
 */
router.get('/summary/:month/:year', authenticate, authorize('PAYROLL_ADMIN', 'FINANCE', 'FINANCE_HEAD', 'HR_ADMIN', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const { month, year } = req.params;

    const payrollRun = await prisma.payrollRun.findFirst({
      where: {
        month: parseInt(month),
        year: parseInt(year),
      },
      include: {
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        },
        approvals: true,
        auditLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        message: `No payroll run for ${month}/${year}`,
      });
    }

    res.json({
      success: true,
      data: payrollRun,
    });
  } catch (error) {
    console.error('Get Payroll Summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll summary',
      error: error.message,
    });
  }
});

/**
 * Statutory summary (EPF/SOCSO/EIS/PCB/HRDF) by month/year
 */
router.get('/statutory/summary/:month/:year', authenticate, authorize('PAYROLL_ADMIN', 'FINANCE', 'FINANCE_HEAD', 'HR_ADMIN', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const month = parseInt(req.params.month, 10);
    const year = parseInt(req.params.year, 10);

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Invalid month/year' });
    }

    const totals = await prisma.payslip.aggregate({
      where: { month, year },
      _sum: {
        epfEmployee: true,
        epfEmployer: true,
        socsoEmployee: true,
        socsoEmployer: true,
        eisEmployee: true,
        eisEmployer: true,
        incomeTax: true,
        hrdf: true
      },
      _count: { id: true }
    });

    res.json({
      success: true,
      data: {
        month,
        year,
        payslipCount: totals._count.id || 0,
        totals: {
          epfEmployee: totals._sum.epfEmployee || 0,
          epfEmployer: totals._sum.epfEmployer || 0,
          socsoEmployee: totals._sum.socsoEmployee || 0,
          socsoEmployer: totals._sum.socsoEmployer || 0,
          eisEmployee: totals._sum.eisEmployee || 0,
          eisEmployer: totals._sum.eisEmployer || 0,
          pcb: totals._sum.incomeTax || 0,
          hrdf: totals._sum.hrdf || 0
        }
      }
    });
  } catch (error) {
    console.error('Statutory summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statutory summary', error: error.message });
  }
});

/**
 * Payroll audit logs list
 */
router.get('/audit/logs', authenticate, authorize('PAYROLL_ADMIN', 'FINANCE', 'FINANCE_HEAD', 'HR_ADMIN', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await prisma.payrollAuditLog.findMany({
      take: Math.min(parseInt(limit, 10) || 100, 500),
      orderBy: { createdAt: 'desc' },
      include: {
        payrollRun: {
          select: { id: true, displayId: true, month: true, year: true, status: true }
        }
      }
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Payroll audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll audit logs', error: error.message });
  }
});

/**
 * Leadership monitoring view
 * - Pending approvals grouped by module and department
 * - Designed for MD/Director/Head level dashboards
 */
router.get('/monitoring/approvals-summary', authenticate, authorize('MANAGEMENT', 'ADMIN', 'SUPER_ADMIN', 'FINANCE_HEAD', 'HR_ADMIN', 'PAYROLL_ADMIN'), async (req, res) => {
  try {
    const [leaveResult, claimResult, payrollResult] = await Promise.allSettled([
      prisma.leaveApproval.findMany({
        where: { status: 'PENDING' },
        include: {
          leaveRequest: {
            select: {
              employee: {
                select: { department: true }
              }
            }
          }
        }
      }),
      prisma.claimApproval.findMany({
        where: { status: 'PENDING' },
        include: {
          claim: {
            select: {
              employee: {
                select: { department: true }
              }
            }
          }
        }
      }),
      prisma.payrollApproval.findMany({
        where: { status: 'PENDING' },
        select: { requiredRole: true, stepName: true }
      })
    ]);

    const pendingLeaveApprovals = leaveResult.status === 'fulfilled' ? leaveResult.value : [];
    const pendingClaimApprovals = claimResult.status === 'fulfilled' ? claimResult.value : [];
    const pendingPayrollApprovals = payrollResult.status === 'fulfilled' ? payrollResult.value : [];

    const departmentMap = new Map();
    const bump = (department, field) => {
      const key = department || 'UNASSIGNED';
      const row = departmentMap.get(key) || { department: key, leavePending: 0, claimPending: 0, totalPending: 0 };
      row[field] += 1;
      row.totalPending += 1;
      departmentMap.set(key, row);
    };

    pendingLeaveApprovals.forEach((item) => bump(item.leaveRequest?.employee?.department, 'leavePending'));
    pendingClaimApprovals.forEach((item) => bump(item.claim?.employee?.department, 'claimPending'));

    const payrollByRole = pendingPayrollApprovals.reduce((acc, item) => {
      const role = item.requiredRole || 'UNKNOWN';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totals: {
          leavePending: pendingLeaveApprovals.length,
          claimPending: pendingClaimApprovals.length,
          payrollPending: pendingPayrollApprovals.length,
          grandTotalPending: pendingLeaveApprovals.length + pendingClaimApprovals.length + pendingPayrollApprovals.length
        },
        byDepartment: Array.from(departmentMap.values()).sort((a, b) => b.totalPending - a.totalPending),
        payrollPendingByRequiredRole: payrollByRole,
        partialData: {
          leaveApprovalsUnavailable: leaveResult.status !== 'fulfilled',
          claimApprovalsUnavailable: claimResult.status !== 'fulfilled',
          payrollApprovalsUnavailable: payrollResult.status !== 'fulfilled'
        }
      }
    });
  } catch (error) {
    console.error('Leadership approval monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval monitoring summary',
      error: safeServerError(error)
    });
  }
});

module.exports = router;
