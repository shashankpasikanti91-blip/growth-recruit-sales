/**
 * Payroll Service - Eligibility Rules & Calculations
 * 
 * Handles complex business logic for:
 * - Leave eligibility based on staff type, visa, contract
 * - Overtime eligibility and limits
 * - Invoice generation for deployed staff
 * - Holiday swaps and public holidays
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE ELIGIBILITY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if employee can apply for a specific leave type
 */
const canApplyLeave = async (employeeId, leaveType) => {
  try {
    const employee = await prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      include: {
        staffTypeRules: true,
        paymentAgreements: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!employee) {
      return { allowed: false, reason: 'Employee not found' };
    }

    // Rule 1: Check if leave eligibility period has started
    if (employee.leaveEligibleFrom && new Date() < employee.leaveEligibleFrom) {
      const daysUntilEligible = Math.ceil(
        (employee.leaveEligibleFrom - new Date()) / (1000 * 60 * 60 * 24)
      );
      return {
        allowed: false,
        reason: `Leave eligible in ${daysUntilEligible} days`,
      };
    }

    // Rule 2: Check visa-based restrictions
    if (['STUDENT', 'DEPENDENT'].includes(employee.visaStatus)) {
      if (['ANNUAL', 'REPLACEMENT'].includes(leaveType)) {
        return {
          allowed: false,
          reason: `${employee.visaStatus} visa holders cannot apply for ${leaveType} leave`,
        };
      }
    }

    // Rule 3: Check deployment status and contract
    if (employee.staffType === 'DEPLOYED') {
      if (!employee.paymentAgreements || employee.paymentAgreements.length === 0) {
        return { allowed: false, reason: 'No active payment agreement' };
      }

      const agreement = employee.paymentAgreements[0];
      if (agreement.endDate && new Date() > agreement.endDate) {
        return { allowed: false, reason: 'Contract has ended' };
      }
    }

    // Rule 4: Check leave balance
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: employeeId,
          leaveType: leaveType,
          year: new Date().getFullYear(),
        },
      },
    });

    if (!balance || balance.remaining <= 0) {
      return { allowed: false, reason: 'No balance available' };
    }

    return { allowed: true, reason: 'Eligible', remainingDays: balance.remaining };
  } catch (error) {
    console.error('Error checking leave eligibility:', error);
    return { allowed: false, reason: 'System error' };
  }
};

/**
 * Get leave entitlements for employee based on staff type and visa
 */
const getLeaveEntitlements = async (employeeId) => {
  try {
    const employee = await prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      include: { staffTypeRules: true },
    });

    if (!employee || !employee.staffTypeRules) {
      return null;
    }

    const rules = employee.staffTypeRules;

    // Determine leave days based on visa status
    let annualLeaveDays = rules.annualLeaveCitizenDays;
    if (employee.visaStatus === 'PR') {
      annualLeaveDays = rules.annualLeavePRDays;
    } else if (['EP_PASS', 'WORK_PERMIT'].includes(employee.visaStatus)) {
      annualLeaveDays = rules.annualLeaveExpatDays;
    }

    return {
      annualLeaveDays,
      medicalLeaveDays: rules.medicalLeaveDays,
      hospitalizationDays: rules.hospitalizationDays,
      noPayLeaveDays: rules.noPayLeaveDays,
      replacementLeaveDays: rules.replacementLeaveDays,
      compassionateLeaveDays: rules.compassionateLeaveDays,
    };
  } catch (error) {
    console.error('Error getting leave entitlements:', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// OVERTIME ELIGIBILITY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if employee can apply for overtime
 */
const canApplyOvertime = async (employeeId) => {
  try {
    const employee = await prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      include: {
        staffTypeRules: true,
        paymentAgreements: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!employee) {
      return { allowed: false, reason: 'Employee not found' };
    }

    // Check staff type rules
    const canOTByStaffType = employee.staffTypeRules?.canApplyOvertime || false;

    // Check agreement
    const canOTByAgreement =
      employee.paymentAgreements &&
      employee.paymentAgreements.length > 0 &&
      employee.paymentAgreements[0].allowOvertime;

    if (!canOTByStaffType && !canOTByAgreement) {
      return {
        allowed: false,
        reason: `${employee.staffType} staff cannot apply for overtime`,
      };
    }

    // Check monthly limit
    if (employee.maxOvertimeHoursPerMonth && employee.maxOvertimeHoursPerMonth > 0) {
      const thisMonth = new Date();
      const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const monthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);

      const thisMonthOT = await prisma.overtimeClaim.aggregate({
        where: {
          employeeId: employeeId,
          status: 'APPROVED',
          claimDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { hoursWorked: true },
      });

      const otHours = thisMonthOT._sum.hoursWorked || 0;
      if (otHours >= employee.maxOvertimeHoursPerMonth) {
        return {
          allowed: false,
          reason: `Monthly OT limit (${employee.maxOvertimeHoursPerMonth} hours) reached`,
        };
      }
    }

    return { allowed: true, reason: 'Eligible for overtime' };
  } catch (error) {
    console.error('Error checking OT eligibility:', error);
    return { allowed: false, reason: 'System error' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DEPLOYED STAFF INVOICING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate invoice amount for deployed staff based on agreement type
 */
const calculateInvoiceAmount = async (employeeId, clientId, month, year) => {
  try {
    const agreement = await prisma.paymentAgreement.findFirst({
      where: {
        employeeId,
        clientId,
        status: 'ACTIVE',
      },
    });

    if (!agreement) {
      return null;
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    let amount = 0;
    let details = {};

    if (agreement.billingType === 'TIMESHEET') {
      // Get timesheets for the month
      const timesheets = await prisma.timesheet.findMany({
        where: {
          employeeId,
          clientId,
          weekStartDate: {
            gte: monthStart,
            lte: monthEnd,
          },
          status: 'APPROVED',
        },
      });

      let totalHours = 0;
      timesheets.forEach((ts) => {
        totalHours += ts.totalHours || 0;
      });

      // Get approved overtime
      const overtime = await prisma.overtimeClaim.aggregate({
        where: {
          employeeId,
          status: 'APPROVED',
          claimDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { hoursWorked: true },
      });

      const otHours = overtime._sum.hoursWorked || 0;
      const otAmount = otHours * agreement.billingRate * (agreement.otRateMultiplier - 1);

      amount = totalHours * agreement.billingRate + otAmount;
      details = { totalHours, otHours, billingRate: agreement.billingRate };
    } else if (agreement.billingType === 'DAILY_BILLABLE') {
      // Count working days from attendance
      const attendance = await prisma.attendance.findMany({
        where: {
          employeeId,
          date: { gte: monthStart, lte: monthEnd },
          status: { in: ['PRESENT', 'HALF_DAY'] },
        },
      });

      const workingDays = attendance.filter((a) => a.status === 'PRESENT').length;
      const halfDays = attendance.filter((a) => a.status === 'HALF_DAY').length;

      const billableDays = workingDays + halfDays * 0.5;
      amount = billableDays * agreement.billingRate;
      details = { billableDays, billingRate: agreement.billingRate };
    } else if (agreement.billingType === 'FIXED_RATE') {
      // Fixed monthly rate
      amount = agreement.billingRate;
      details = { fixedRate: agreement.billingRate };
    }

    return {
      amount,
      details,
      billingType: agreement.billingType,
      currency: agreement.currency,
    };
  } catch (error) {
    console.error('Error calculating invoice:', error);
    return null;
  }
};

/**
 * Generate invoice for deployed staff
 */
const generateDeployedStaffInvoice = async (employeeId, clientId, month, year) => {
  try {
    // Check if invoice already exists
    const existing = await prisma.deployedStaffInvoice.findUnique({
      where: {
        employeeId_clientId_month_year: {
          employeeId,
          clientId,
          month,
          year,
        },
      },
    });

    if (existing) {
      return { success: false, reason: 'Invoice already exists for this period' };
    }

    // Calculate amount
    const calculation = await calculateInvoiceAmount(employeeId, clientId, month, year);
    if (!calculation) {
      return { success: false, reason: 'Cannot calculate invoice amount' };
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Create invoice
    const invoice = await prisma.deployedStaffInvoice.create({
      data: {
        employeeId,
        clientId,
        month,
        year,
        periodStart: monthStart,
        periodEnd: monthEnd,
        billingType: calculation.billingType,
        ratePerUnit: calculation.details.billingRate || 0,
        subtotal: calculation.amount,
        total: calculation.amount,
        status: 'GENERATED',
        generatedAt: new Date(),
      },
    });

    return { success: true, invoice };
  } catch (error) {
    console.error('Error generating invoice:', error);
    return { success: false, reason: 'System error' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HOLIDAY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get public holidays for a year and optional state
 */
const getPublicHolidays = async (year, state = null) => {
  try {
    const where = { year };
    if (state) {
      where.OR = [{ state: state }, { isNational: true }];
    } else {
      where.isNational = true;
    }

    const holidays = await prisma.publicHoliday.findMany({
      where,
      orderBy: { holidayDate: 'asc' },
    });

    return holidays;
  } catch (error) {
    console.error('Error getting public holidays:', error);
    return [];
  }
};

/**
 * Check if a date is a public holiday for employee
 */
const isPublicHoliday = async (employeeId, date) => {
  try {
    const employee = await prisma.employeeProfile.findUnique({
      where: { id: employeeId },
    });

    if (!employee) return false;

    const holiday = await prisma.publicHoliday.findFirst({
      where: {
        holidayDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        OR: [{ state: employee.workState }, { isNational: true }],
      },
    });

    return !!holiday;
  } catch (error) {
    console.error('Error checking public holiday:', error);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Leave
  canApplyLeave,
  getLeaveEntitlements,

  // Overtime
  canApplyOvertime,

  // Invoicing
  calculateInvoiceAmount,
  generateDeployedStaffInvoice,

  // Holidays
  getPublicHolidays,
  isPublicHoliday,
};
