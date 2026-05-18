const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireRecentBackup } = require('../../middleware/backupGuard');
const prisma = require('../../config/database');
const config = require('../../config/environment');

const router = express.Router();

function safeServerError(error) {
  return config.NODE_ENV === 'development' ? error.message : 'Internal server error';
}

/** Working weekdays in a calendar month (Mon–Fri count) — used to convert DAILY basic salary to period gross (MYR). */
function workingWeekdaysInMonth(month, year) {
  const last = new Date(year, month, 0).getDate();
  let n = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n || 22;
}

function resolveResidencyStatus(employee) {
  if (!employee) return 'CITIZEN';
  const nationality = (employee.nationality || '').toLowerCase();
  if (nationality.includes('malaysia')) return 'CITIZEN';
  return 'NON_RESIDENT';
}

function pickSettingForEmployee(settings, run, employee) {
  const workerCategory = employee.employmentType === 'DEPLOYED' ? 'DEPLOYED_STAFF' : 'INTERNAL_STAFF';
  const residencyStatus = resolveResidencyStatus(employee);

  const match = settings.find((s) => s.workerCategory === workerCategory && (s.residencyStatus || 'CITIZEN') === residencyStatus);
  if (match) return match;

  const fallbackCategory = settings.find((s) => s.workerCategory === workerCategory);
  if (fallbackCategory) return fallbackCategory;

  return {
    epfEmployeeRate: 8.0,
    epfEmployerRate: 12.0,
    socsoEmployeeRate: 0.5,
    socsoEmployerRate: 1.75,
    eisEmployeeRate: 0.4,
    eisEmployerRate: 0.8,
    hrdfRate: 0.5,
    taxableIncome: 0
  };
}

async function getEffectiveSettingsForRun(run) {
  const cutoff = new Date(run.year, run.month - 1, 24, 23, 59, 59, 999);
  return prisma.payrollSettings.findMany({
    where: { country: 'MY', effectiveDate: { lte: cutoff } },
    orderBy: { effectiveDate: 'desc' }
  });
}

function computePayslipForEmployee(run, employee, structure, setting) {
  const allowanceSum = Object.values(structure.allowances || {}).reduce((a, b) => a + Number(b || 0), 0);
  const freq = structure.payFrequency === 'DAILY' ? 'DAILY' : 'MONTHLY';
  const baseComponent = freq === 'DAILY'
    ? Number(structure.basicSalary) * workingWeekdaysInMonth(run.month, run.year)
    : Number(structure.basicSalary);
  const grossSalary = baseComponent + allowanceSum;

  const localEmployee = resolveResidencyStatus(employee) === 'CITIZEN';
  const epfEmployee = grossSalary * (Number(setting.epfEmployeeRate || 0) / 100);
  const socsoEmployee = grossSalary * (Number(setting.socsoEmployeeRate || 0) / 100);
  const eisEmployee = grossSalary * (Number(setting.eisEmployeeRate || 0) / 100);
  const incomeTax = localEmployee
    ? Math.max(0, grossSalary - Number(setting.taxableIncome || 0)) * 0.02
    : grossSalary * 0.10;
  const totalDeductions = epfEmployee + socsoEmployee + eisEmployee + incomeTax;

  const epfEmployer = grossSalary * (Number(setting.epfEmployerRate || 0) / 100);
  const socsoEmployer = grossSalary * (Number(setting.socsoEmployerRate || 0) / 100);
  const eisEmployer = grossSalary * (Number(setting.eisEmployerRate || 0) / 100);
  const hrdf = grossSalary * (Number(setting.hrdfRate || 0) / 100);
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  return {
    basicSalary: Number(structure.basicSalary),
    allowances: structure.allowances || {},
    overtimePay: 0,
    bonus: 0,
    approvedLeaves: 0,
    approvedClaims: 0,
    grossSalary: Math.round(grossSalary * 100) / 100,
    epfEmployee: Math.round(epfEmployee * 100) / 100,
    socsoEmployee: Math.round(socsoEmployee * 100) / 100,
    eisEmployee: Math.round(eisEmployee * 100) / 100,
    incomeTax: Math.round(incomeTax * 100) / 100,
    otherDeductions: 0,
    unpaidLeaveDeduction: 0,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    epfEmployer: Math.round(epfEmployer * 100) / 100,
    socsoEmployer: Math.round(socsoEmployer * 100) / 100,
    eisEmployer: Math.round(eisEmployer * 100) / 100,
    hrdf: Math.round(hrdf * 100) / 100,
    netSalary: Math.round(netSalary * 100) / 100
  };
}

// GET all payroll runs
router.get('/', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const { month, year, status, workerCategory, limit = 20, offset = 0 } = req.query;

    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (workerCategory) where.workerCategory = workerCategory;

    const runs = await prisma.payrollRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.payrollRun.count({ where });

    // Map to frontend-expected shape
    const mapped = runs.map(r => ({
      ...r,
      status: r.status === 'REVIEW' ? 'UNDER_REVIEW' : r.status,
      employeeCount: r.totalEmployees,
    }));

    res.json({ success: true, data: mapped, total });
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single payroll run
router.get('/:id', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const run = await prisma.payrollRun.findUnique({
      where: { id: req.params.id },
      include: {
        payslips: {
          include: { employee: { select: { employeeId: true, user: { select: { firstName: true, lastName: true } } } } }
        },
        approvals: true,
        auditLogs: true
      }
    });

    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    res.json({ success: true, data: { ...run, status: run.status === 'REVIEW' ? 'UNDER_REVIEW' : run.status } });
  } catch (error) {
    console.error('Error fetching payroll run:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE payroll run (Payroll Admin only)
router.post('/', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const { month, year, runType = 'MONTHLY', workerCategory = 'BOTH' } = req.body;
    const workerCategoryMap = {
      INTERNAL: 'INTERNAL_STAFF',
      DEPLOYED: 'DEPLOYED_STAFF',
      INTERNAL_STAFF: 'INTERNAL_STAFF',
      DEPLOYED_STAFF: 'DEPLOYED_STAFF',
      BOTH: 'BOTH',
    };
    const normalizedWorkerCategory = workerCategoryMap[workerCategory] || 'BOTH';

    // Validate month/year
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Invalid month (1-12)' });
    }

    // Check if payroll run already exists for this period
    const existing = await prisma.payrollRun.findFirst({
      where: { month, year, runType, workerCategory: normalizedWorkerCategory }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Payroll run already exists for ${month}/${year}` });
    }

    // Create payroll run
    const run = await prisma.payrollRun.create({
      data: {
        month,
        year,
        runType,
        workerCategory: normalizedWorkerCategory,
        status: 'DRAFT',
        createdBy: req.user.id,
        displayId: `TKG-PR-${Date.now()}`
      }
    });

    // Initialize approval steps
    const approvalSteps = [
      { step: 1, stepName: 'Payroll Admin Review', requiredRole: 'PAYROLL_ADMIN' },
      { step: 2, stepName: 'Assistant MD / MD Approval', requiredRole: 'MANAGEMENT' }
    ];

    for (const step of approvalSteps) {
      await prisma.payrollApproval.create({
        data: {
          payrollRunId: run.id,
          ...step,
          status: 'PENDING'
        }
      });
    }

    // Audit log
    await prisma.payrollAuditLog.create({
      data: {
        payrollRunId: run.id,
        entityType: 'PAYROLL_RUN',
        entityId: run.id,
        action: 'CREATE',
        newValue: run,
        reason: 'Payroll run created',
        changedBy: req.user.id
      }
    });

    res.status(201).json({ success: true, message: 'Payroll run created', data: run });
  } catch (error) {
    console.error('Error creating payroll run:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// VALIDATE payroll run (System validates data - called before review)
router.post('/:id/validate', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const run = await prisma.payrollRun.findUnique({
      where: { id: req.params.id }
    });

    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (run.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only DRAFT payroll runs can be validated' });
    }

    const employeeWhere = { status: 'ACTIVE' };
    if (run.workerCategory === 'INTERNAL_STAFF') {
      employeeWhere.employmentType = 'INTERNAL';
    } else if (run.workerCategory === 'DEPLOYED_STAFF') {
      employeeWhere.employmentType = 'DEPLOYED';
    } else if (run.workerCategory === 'BOTH') {
      employeeWhere.employmentType = { in: ['INTERNAL', 'DEPLOYED'] };
    }

    // Get all active employees for selected worker category
    const employees = await prisma.employeeProfile.findMany({
      where: employeeWhere,
      include: {
        salaryStructures: { where: { status: 'APPROVED' }, orderBy: { effectiveFrom: 'desc' }, take: 1 },
        user: true
      }
    });

    const validationCutoff = new Date(run.year, run.month - 1, 24, 23, 59, 59, 999);
    const payrollSettings = await prisma.payrollSettings.findMany({
      where: {
        country: 'MY',
        effectiveDate: { lte: validationCutoff }
      },
      orderBy: { effectiveDate: 'desc' }
    });

    // Validate and collect exceptions
    const exceptions = [];
    let totalEmployees = 0;
    let grossPayroll = 0;
    let totalDeductions = 0;
    let employerContributions = 0;

    for (const employee of employees) {
      totalEmployees++;

      // Check if salary structure exists
      if (!employee.salaryStructures || employee.salaryStructures.length === 0) {
        exceptions.push({
          employeeId: employee.employeeId,
          employeeName: `${employee.user?.firstName} ${employee.user?.lastName}`,
          type: 'MISSING_SALARY_STRUCTURE',
          message: 'No approved salary structure found'
        });
        continue;
      }

      // Check if bank account is set
      if (!employee.bankAccountNo || !employee.bankName) {
        exceptions.push({
          employeeId: employee.employeeId,
          employeeName: `${employee.user?.firstName} ${employee.user?.lastName}`,
          type: 'MISSING_BANK_DETAILS',
          message: 'Bank account details missing'
        });
      }

      // Check statutory numbers
      if (!employee.epfNumber && !employee.socsoNumber) {
        exceptions.push({
          employeeId: employee.employeeId,
          employeeName: `${employee.user?.firstName} ${employee.user?.lastName}`,
          type: 'MISSING_STATUTORY_NUMBER',
          message: 'EPF/SOCSO numbers missing'
        });
      }

      // Calculate gross from salary structure (MYR). MONTHLY = full basic + allowances; DAILY = rate × working days + allowances.
      const structure = employee.salaryStructures[0];
      const allowanceSum = Object.values(structure.allowances || {}).reduce((a, b) => a + Number(b || 0), 0);
      const freq = structure.payFrequency === 'DAILY' ? 'DAILY' : 'MONTHLY';
      const baseComponent =
        freq === 'DAILY'
          ? Number(structure.basicSalary) * workingWeekdaysInMonth(run.month, run.year)
          : Number(structure.basicSalary);
      const monthlyGross = baseComponent + allowanceSum;
      grossPayroll += monthlyGross;

      const setting = pickSettingForEmployee(payrollSettings, run, employee);
      const localEmployee = resolveResidencyStatus(employee) === 'CITIZEN';

      // Estimate deductions using effective payroll settings (versioned, non-hardcoded)
      const epfEmp = monthlyGross * (Number(setting.epfEmployeeRate || 0) / 100);
      const socsoEmp = monthlyGross * (Number(setting.socsoEmployeeRate || 0) / 100);
      const eisEmp = monthlyGross * (Number(setting.eisEmployeeRate || 0) / 100);
      const pcbEmp = localEmployee ? Math.max(0, monthlyGross - Number(setting.taxableIncome || 0)) * 0.02 : monthlyGross * 0.10;
      totalDeductions += epfEmp + socsoEmp + eisEmp;
      totalDeductions += pcbEmp;

      // Employer contributions
      const epfEmp_r = monthlyGross * (Number(setting.epfEmployerRate || 0) / 100);
      const socsoEmp_r = monthlyGross * (Number(setting.socsoEmployerRate || 0) / 100);
      const eisEmp_r = monthlyGross * (Number(setting.eisEmployerRate || 0) / 100);
      const hrdf = monthlyGross * (Number(setting.hrdfRate || 0) / 100);
      employerContributions += epfEmp_r + socsoEmp_r + eisEmp_r + hrdf;
    }

    const newStatus = exceptions.length > 0 ? 'EXCEPTIONS' : 'READY';

    // Update payroll run
    const updatedRun = await prisma.payrollRun.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        totalEmployees,
        grossPayroll: Math.round(grossPayroll * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        employerContributions: Math.round(employerContributions * 100) / 100,
        exceptions
      }
    });

    // Audit log
    await prisma.payrollAuditLog.create({
      data: {
        payrollRunId: req.params.id,
        entityType: 'PAYROLL_RUN',
        entityId: req.params.id,
        action: 'UPDATE',
        oldValue: { status: run.status },
        newValue: { status: newStatus },
        reason: 'Payroll run validated',
        changedBy: req.user.id
      }
    });

    res.json({ success: true, message: 'Payroll run validated', data: updatedRun });
  } catch (error) {
    console.error('Error validating payroll run:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// REVIEW payroll run (Payroll Admin reviews salary items)
router.put('/:id/review', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const { corrections } = req.body; // corrections = [{ payslipId, field, oldValue, newValue, reason }]

    const run = await prisma.payrollRun.findUnique({
      where: { id: req.params.id }
    });

    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (!['EXCEPTIONS', 'READY'].includes(run.status)) {
      return res.status(400).json({ success: false, message: 'Payroll run cannot be reviewed in current status' });
    }

    // Apply corrections if any
    if (corrections && corrections.length > 0) {
      for (const correction of corrections) {
        const payslip = await prisma.payslip.findUnique({
          where: { id: correction.payslipId }
        });

        if (payslip) {
          const updateData = {};
          updateData[correction.field] = correction.newValue;

          await prisma.payslip.update({
            where: { id: correction.payslipId },
            data: updateData
          });

          // Recalculate net salary
          const updated = await prisma.payslip.findUnique({
            where: { id: correction.payslipId }
          });

          const newNetSalary = (updated.grossSalary || 0) - (updated.totalDeductions || 0);
          await prisma.payslip.update({
            where: { id: correction.payslipId },
            data: { netSalary: Math.max(0, newNetSalary) }
          });

          // Audit correction
          await prisma.payrollAuditLog.create({
            data: {
              payrollRunId: req.params.id,
              entityType: 'PAYSLIP',
              entityId: correction.payslipId,
              action: 'UPDATE',
              oldValue: { [correction.field]: correction.oldValue },
              newValue: { [correction.field]: correction.newValue },
              reason: correction.reason || 'Correction during review',
              changedBy: req.user.id
            }
          });
        }
      }
    }

    const updated = await prisma.payrollRun.update({
      where: { id: req.params.id },
      data: {
        status: 'UNDER_REVIEW',
        reviewedBy: req.user.id
      }
    });

    res.json({ success: true, message: 'Payroll run under review', data: updated });
  } catch (error) {
    console.error('Error reviewing payroll run:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GENERATE payslips from approved payroll run
router.post('/:id/generate-payslips', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }
    if (!['APPROVED', 'GENERATED', 'PUBLISHED'].includes(run.status)) {
      return res.status(400).json({ success: false, message: 'Payslips can only be generated after run is approved' });
    }

    const employeeWhere = { status: 'ACTIVE' };
    if (run.workerCategory === 'INTERNAL_STAFF') employeeWhere.employmentType = 'INTERNAL';
    else if (run.workerCategory === 'DEPLOYED_STAFF') employeeWhere.employmentType = 'DEPLOYED';
    else employeeWhere.employmentType = { in: ['INTERNAL', 'DEPLOYED'] };

    const employees = await prisma.employeeProfile.findMany({
      where: employeeWhere,
      include: {
        salaryStructures: { where: { status: 'APPROVED' }, orderBy: { effectiveFrom: 'desc' }, take: 1 }
      }
    });
    const settings = await getEffectiveSettingsForRun(run);

    let generatedCount = 0;
    let failedEmployees = 0;
    const generationErrors = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalEmployer = 0;

    for (const employee of employees) {
      try {
        const structure = employee.salaryStructures?.[0];
        if (!structure) continue;
        const setting = pickSettingForEmployee(settings, run, employee);
        const calc = computePayslipForEmployee(run, employee, structure, setting);
        // displayId is globally unique; include run id so repeated runs in the same period do not collide.
        const displayId = `TKG-PS-${run.year}${String(run.month).padStart(2, '0')}-${employee.employeeId}-${run.id.slice(-8)}`;

        await prisma.payslip.upsert({
          where: { payrollRunId_employeeId: { payrollRunId: run.id, employeeId: employee.id } },
          update: {
            ...calc,
            status: run.status === 'PUBLISHED' ? 'PUBLISHED' : 'GENERATED',
            generatedAt: new Date()
          },
          create: {
            displayId,
            payrollRunId: run.id,
            employeeId: employee.id,
            month: run.month,
            year: run.year,
            ...calc,
            status: run.status === 'PUBLISHED' ? 'PUBLISHED' : 'GENERATED',
            generatedAt: new Date(),
            createdBy: req.user.id
          }
        });
        generatedCount++;
        totalGross += calc.grossSalary;
        totalDeductions += calc.totalDeductions;
        totalNet += calc.netSalary;
        totalEmployer += calc.epfEmployer + calc.socsoEmployer + calc.eisEmployer + calc.hrdf;
      } catch (employeeError) {
        failedEmployees += 1;
        generationErrors.push({
          employeeId: employee.employeeId || employee.id,
          message: employeeError.message
        });
      }
    }

    if (generatedCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'Payslip generation failed for all employees',
        data: { failedEmployees, generationErrors }
      });
    }

    const updatedRun = await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: run.status === 'PUBLISHED' ? 'PUBLISHED' : 'GENERATED',
        totalEmployees: generatedCount,
        grossPayroll: Math.round(totalGross * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPayout: Math.round(totalNet * 100) / 100,
        employerContributions: Math.round(totalEmployer * 100) / 100
      }
    });

    await prisma.payrollAuditLog.create({
      data: {
        payrollRunId: run.id,
        entityType: 'PAYROLL_RUN',
        entityId: run.id,
        action: 'UPDATE',
        oldValue: { status: run.status },
        newValue: { status: updatedRun.status, generatedCount },
        reason: 'Payslips generated',
        changedBy: req.user.id
      }
    });

    res.json({
      success: true,
      message: failedEmployees > 0 ? 'Payslips generated with partial failures' : 'Payslips generated',
      data: {
        run: updatedRun,
        generatedCount,
        failedEmployees,
        generationErrors
      }
    });
  } catch (error) {
    console.error('Error generating payslips:', error);
    res.status(500).json({ success: false, message: safeServerError(error) });
  }
});

// PUBLISH payslips to employee workspace
router.post('/:id/publish', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });
    if (!['GENERATED', 'PUBLISHED'].includes(run.status)) {
      return res.status(400).json({ success: false, message: 'Run must be GENERATED before publishing' });
    }

    const now = new Date();
    await prisma.payslip.updateMany({
      where: { payrollRunId: run.id },
      data: { status: 'PUBLISHED', publishedAt: now }
    });

    const updatedRun = await prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: 'PUBLISHED', publishedAt: now }
    });

    await prisma.payrollAuditLog.create({
      data: {
        payrollRunId: run.id,
        entityType: 'PAYROLL_RUN',
        entityId: run.id,
        action: 'PUBLISH',
        oldValue: { status: run.status },
        newValue: { status: 'PUBLISHED' },
        reason: 'Payslips published to employee workspace',
        changedBy: req.user.id
      }
    });

    res.json({ success: true, message: 'Payslips published', data: updatedRun });
  } catch (error) {
    console.error('Error publishing payslips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// BANK transfer file preview/export (CSV)
router.get('/:id/bank-file', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN'), async (req, res) => {
  try {
    const template = String(req.query.template || 'STANDARD').toUpperCase();
    const run = await prisma.payrollRun.findUnique({
      where: { id: req.params.id },
      include: {
        payslips: {
          where: { status: { in: ['GENERATED', 'PUBLISHED', 'PAID'] } },
          include: {
            employee: {
              select: {
                employeeId: true,
                bankName: true,
                bankAccountNo: true,
                user: { select: { firstName: true, lastName: true } }
              }
            }
          }
        }
      }
    });
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    const rows = run.payslips.map((ps) => ({
      employeeId: ps.employee?.employeeId || '',
      employeeName: `${ps.employee?.user?.firstName || ''} ${ps.employee?.user?.lastName || ''}`.trim(),
      bankName: ps.employee?.bankName || '',
      bankAccountNo: ps.employee?.bankAccountNo || '',
      amount: Number(ps.netSalary || 0).toFixed(2),
      currency: 'MYR',
      reference: run.displayId || run.id
    }));

    const csvTemplates = {
      STANDARD: {
        header: 'employeeId,employeeName,bankName,bankAccountNo,amount,currency,reference',
        map: (r) => `${r.employeeId},"${r.employeeName.replace(/"/g, '""')}","${r.bankName.replace(/"/g, '""')}",${r.bankAccountNo},${r.amount},${r.currency},${r.reference}`
      },
      MAYBANK: {
        header: 'beneficiary_name,beneficiary_account,bank_name,transfer_amount,reference_1,reference_2',
        map: (r) => `"${r.employeeName.replace(/"/g, '""')}",${r.bankAccountNo},"${r.bankName.replace(/"/g, '""')}",${r.amount},${r.employeeId},${r.reference}`
      },
      CIMB: {
        header: 'account_no,account_name,amount,recipient_reference,payment_details',
        map: (r) => `${r.bankAccountNo},"${r.employeeName.replace(/"/g, '""')}",${r.amount},${r.employeeId},"${r.reference}"`
      }
    };
    const selectedTemplate = csvTemplates[template] || csvTemplates.STANDARD;
    const csv = [selectedTemplate.header, ...rows.map((r) => selectedTemplate.map(r))].join('\n');

    if (String(req.query.download || '').toLowerCase() === 'true') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="bank-file-${template.toLowerCase()}-${run.displayId || run.id}.csv"`);
      return res.send(csv);
    }

    return res.json({
      success: true,
      data: {
        runId: run.id,
        displayId: run.displayId,
        template: selectedTemplate === csvTemplates.STANDARD ? 'STANDARD' : template,
        recordCount: rows.length,
        rows
      }
    });
  } catch (error) {
    console.error('Error generating bank file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
