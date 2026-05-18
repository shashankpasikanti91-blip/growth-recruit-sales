/**
 * Payroll Mapping Service
 * Maps approved leaves, claims, and overtime to payslips
 * Calculates deductions and additions for salary
 */

const prisma = require('../config/database');
const logger = require('../utils/logger');

class PayrollMappingService {
  /**
   * Get approved items for an employee within a payroll month
   * @param {String} employeeId - Employee ID
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @returns {Object} { leaves, claims, overtime }
   */
  async getApprovedItemsForPayroll(employeeId, month, year) {
    try {
      // Get the month range
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      // Get approved leaves for this period
      const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
          payrollMapped: false,
          startDate: { gte: monthStart },
          endDate: { lte: monthEnd }
        },
        select: {
          id: true,
          displayId: true,
          leaveType: true,
          daysCount: true,
          isPaid: true,
          startDate: true,
          endDate: true
        }
      });

      // Get approved claims for this period
      const approvedClaims = await prisma.claim.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
          payrollMapped: false,
          claimDate: { gte: monthStart, lte: monthEnd }
        },
        select: {
          id: true,
          displayId: true,
          claimType: true,
          amount: true,
          currency: true,
          claimDate: true
        }
      });

      // Get approved overtime for this period
      const approvedOvertimes = await prisma.overtimeClaim.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
          payrollMapped: false,
          claimDate: { gte: monthStart, lte: monthEnd }
        },
        select: {
          id: true,
          displayId: true,
          hoursWorked: true,
          overtimeType: true,
          rateMultiplier: true,
          calculatedAmount: true
        }
      });

      return {
        leaves: approvedLeaves,
        claims: approvedClaims,
        overtime: approvedOvertimes,
        period: { month, year }
      };
    } catch (error) {
      logger.error('Error in getApprovedItemsForPayroll:', error);
      throw error;
    }
  }

  /**
   * Calculate leave earnings/deductions for payslip
   * @param {Object} employee - Employee profile with salary structure
   * @param {Array} leaves - Approved leaves for the month
   * @returns {Object} { approvedLeaves, unpaidLeaveDeduction, totalLeaveAmount }
   */
  async calculateLeavePayroll(employee, leaves) {
    try {
      let paidLeaveAmount = 0;
      let unpaidLeaveDeduction = 0;
      const approvedLeaveIds = [];

      // Get daily rate from salary structure
      const salaryStructure = await prisma.salaryStructure.findFirst({
        where: { employeeId: employee.id },
        select: { basicSalary: true, currency: true }
      });

      const dailyRate = salaryStructure ? salaryStructure.basicSalary / 22 : 0; // Assuming 22 working days/month

      for (const leave of leaves) {
        approvedLeaveIds.push(leave.id);

        if (leave.isPaid) {
          // Paid leave - add to earnings
          paidLeaveAmount += leave.daysCount * dailyRate;
        } else {
          // Unpaid leave - deduct from salary
          unpaidLeaveDeduction += leave.daysCount * dailyRate;
        }
      }

      return {
        approvedLeaves: paidLeaveAmount,
        unpaidLeaveDeduction,
        approvedLeaveIds,
        totalLeaveAmount: paidLeaveAmount - unpaidLeaveDeduction
      };
    } catch (error) {
      logger.error('Error in calculateLeavePayroll:', error);
      throw error;
    }
  }

  /**
   * Calculate claim reimbursements for payslip
   * @param {Array} claims - Approved claims for the month
   * @returns {Object} { approvedClaims, approvedClaimIds }
   */
  async calculateClaimPayroll(claims) {
    try {
      let totalClaims = 0;
      const approvedClaimIds = [];

      for (const claim of claims) {
        approvedClaimIds.push(claim.id);
        totalClaims += claim.amount;
      }

      return {
        approvedClaims: totalClaims,
        approvedClaimIds
      };
    } catch (error) {
      logger.error('Error in calculateClaimPayroll:', error);
      throw error;
    }
  }

  /**
   * Calculate overtime pay for payslip
   * @param {Array} overtimes - Approved overtime claims for the month
   * @returns {Object} { overtimePay, approvedOvertimeIds }
   */
  async calculateOvertimePayroll(overtimes) {
    try {
      let overtimePay = 0;
      const approvedOvertimeIds = [];

      for (const overtime of overtimes) {
        approvedOvertimeIds.push(overtime.id);
        // Use calculated amount if available, otherwise calculate
        if (overtime.calculatedAmount) {
          overtimePay += overtime.calculatedAmount;
        } else {
          // Fallback: use rate multiplier (would need hourly rate from salary structure)
          overtimePay += overtime.hoursWorked * overtime.rateMultiplier;
        }
      }

      return {
        overtimePay,
        approvedOvertimeIds
      };
    } catch (error) {
      logger.error('Error in calculateOvertimePayroll:', error);
      throw error;
    }
  }

  /**
   * Map approved items to a payslip
   * @param {String} payslipId - Payslip ID
   * @param {String} employeeId - Employee ID
   * @param {Number} month - Month
   * @param {Number} year - Year
   * @returns {Object} Updated payslip with mapped amounts
   */
  async mapApprovedItemsToPayslip(payslipId, employeeId, month, year) {
    try {
      // Get the payslip
      const payslip = await prisma.payslip.findUnique({
        where: { id: payslipId },
        include: { payrollRun: true }
      });

      if (!payslip) {
        throw new Error('Payslip not found');
      }

      // Get employee profile
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Get approved items
      const approvedItems = await this.getApprovedItemsForPayroll(employeeId, month, year);

      // Calculate all amounts
      const [leaveCalc, claimCalc, overtimeCalc] = await Promise.all([
        this.calculateLeavePayroll(employee, approvedItems.leaves),
        this.calculateClaimPayroll(approvedItems.claims),
        this.calculateOvertimePayroll(approvedItems.overtime)
      ]);

      // Update payslip with calculated amounts
      const updatedPayslip = await prisma.payslip.update({
        where: { id: payslipId },
        data: {
          approvedLeaves: leaveCalc.approvedLeaves,
          unpaidLeaveDeduction: leaveCalc.unpaidLeaveDeduction,
          approvedClaims: claimCalc.approvedClaims,
          overtimePay: overtimeCalc.overtimePay,
          approvedLeaveIds: leaveCalc.approvedLeaveIds,
          approvedClaimIds: claimCalc.approvedClaimIds,
          approvedOvertimeIds: overtimeCalc.approvedOvertimeIds,
          // Recalculate gross salary
          grossSalary: (payslip.basicSalary || 0) +
                       (payslip.allowances ? Object.values(payslip.allowances).reduce((a, b) => a + b, 0) : 0) +
                       (payslip.bonus || 0) +
                       leaveCalc.approvedLeaves +
                       claimCalc.approvedClaims +
                       overtimeCalc.overtimePay -
                       leaveCalc.unpaidLeaveDeduction
        }
      });

      // Mark all items as payrollMapped
      await Promise.all([
        prisma.leaveRequest.updateMany({
          where: { id: { in: leaveCalc.approvedLeaveIds } },
          data: { payrollMapped: true, payslipId }
        }),
        prisma.claim.updateMany({
          where: { id: { in: claimCalc.approvedClaimIds } },
          data: { payrollMapped: true, payslipId }
        }),
        prisma.overtimeClaim.updateMany({
          where: { id: { in: overtimeCalc.approvedOvertimeIds } },
          data: { payrollMapped: true, payslipId }
        })
      ]);

      logger.info(`Payslip ${payslipId} mapped with ${leaveCalc.approvedLeaveIds.length} leaves, ${claimCalc.approvedClaimIds.length} claims, ${overtimeCalc.approvedOvertimeIds.length} OT records`);

      return updatedPayslip;
    } catch (error) {
      logger.error('Error in mapApprovedItemsToPayslip:', error);
      throw error;
    }
  }

  /**
   * Batch map approved items for all employees in a payroll run
   * @param {String} payrollRunId - Payroll run ID
   * @returns {Object} { processed, updated, errors }
   */
  async batchMapPayslips(payrollRunId) {
    try {
      const payrollRun = await prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        select: { month: true, year: true }
      });

      if (!payrollRun) {
        throw new Error('Payroll run not found');
      }

      // Get all payslips for this run
      const payslips = await prisma.payslip.findMany({
        where: { payrollRunId },
        select: { id: true, employeeId: true }
      });

      const results = {
        processed: payslips.length,
        updated: 0,
        errors: []
      };

      // Map each payslip
      for (const payslip of payslips) {
        try {
          await this.mapApprovedItemsToPayslip(
            payslip.id,
            payslip.employeeId,
            payrollRun.month,
            payrollRun.year
          );
          results.updated++;
        } catch (error) {
          logger.error(`Error mapping payslip ${payslip.id}:`, error);
          results.errors.push({
            payslipId: payslip.id,
            employeeId: payslip.employeeId,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in batchMapPayslips:', error);
      throw error;
    }
  }

  /**
   * Get unmapped items summary for an employee
   * @param {String} employeeId - Employee ID
   * @returns {Object} Count of unmapped leaves, claims, overtime
   */
  async getUnmappedItemsCount(employeeId) {
    try {
      const [unmappedLeaves, unmappedClaims, unmappedOvertimes] = await Promise.all([
        prisma.leaveRequest.count({
          where: { employeeId, status: 'APPROVED', payrollMapped: false }
        }),
        prisma.claim.count({
          where: { employeeId, status: 'APPROVED', payrollMapped: false }
        }),
        prisma.overtimeClaim.count({
          where: { employeeId, status: 'APPROVED', payrollMapped: false }
        })
      ]);

      return {
        leaves: unmappedLeaves,
        claims: unmappedClaims,
        overtime: unmappedOvertimes,
        total: unmappedLeaves + unmappedClaims + unmappedOvertimes
      };
    } catch (error) {
      logger.error('Error in getUnmappedItemsCount:', error);
      throw error;
    }
  }

  /**
   * Get payslip audit trail showing what was mapped
   * @param {String} payslipId - Payslip ID
   * @returns {Object} Details of mapped items
   */
  async getPayslipMappingAudit(payslipId) {
    try {
      const payslip = await prisma.payslip.findUnique({
        where: { id: payslipId }
      });

      if (!payslip) {
        throw new Error('Payslip not found');
      }

      // Get the mapped items
      const [leaves, claims, overtimes] = await Promise.all([
        prisma.leaveRequest.findMany({
          where: { id: { in: payslip.approvedLeaveIds || [] } },
          select: {
            displayId: true,
            leaveType: true,
            daysCount: true,
            isPaid: true,
            approvedAt: true
          }
        }),
        prisma.claim.findMany({
          where: { id: { in: payslip.approvedClaimIds || [] } },
          select: {
            displayId: true,
            claimType: true,
            amount: true,
            approvedAt: true
          }
        }),
        prisma.overtimeClaim.findMany({
          where: { id: { in: payslip.approvedOvertimeIds || [] } },
          select: {
            displayId: true,
            hoursWorked: true,
            calculatedAmount: true,
            approvedAt: true
          }
        })
      ]);

      return {
        payslipId: payslip.displayId,
        period: { month: payslip.month, year: payslip.year },
        mappedItems: {
          leaves: {
            count: leaves.length,
            items: leaves,
            totalAmount: payslip.approvedLeaves
          },
          claims: {
            count: claims.length,
            items: claims,
            totalAmount: payslip.approvedClaims
          },
          overtime: {
            count: overtimes.length,
            items: overtimes,
            totalAmount: payslip.overtimePay
          }
        },
        totalMappedAmount: (payslip.approvedLeaves || 0) + (payslip.approvedClaims || 0) + (payslip.overtimePay || 0) - (payslip.unpaidLeaveDeduction || 0)
      };
    } catch (error) {
      logger.error('Error in getPayslipMappingAudit:', error);
      throw error;
    }
  }
}

module.exports = new PayrollMappingService();
