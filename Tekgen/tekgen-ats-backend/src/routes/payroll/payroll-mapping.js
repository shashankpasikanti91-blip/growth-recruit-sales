/**
 * Payroll Mapping Routes
 * Routes for mapping approved leaves, claims, and overtime to payslips
 */

const express = require('express');
const router = express.Router();
const payrollMappingService = require('../../services/payrollMappingService');
const { authenticate, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');
const prisma = require('../../config/database');

/**
 * GET /api/payroll/mapping/unmapped/:employeeId
 * Get count of unmapped items for an employee
 */
router.get('/unmapped/:employeeId', authenticate, async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Verify employee has permission to view
    const profile = await prisma.employeeProfile.findUnique({
      where: { id: employeeId }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const unmapped = await payrollMappingService.getUnmappedItemsCount(employeeId);

    return res.json({
      success: true,
      data: unmapped
    });
  } catch (error) {
    logger.error('Error getting unmapped items:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/payroll/mapping/payslip/:payslipId/audit
 * Get payslip mapping audit trail
 */
router.get('/payslip/:payslipId/audit', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { payslipId } = req.params;

    const audit = await payrollMappingService.getPayslipMappingAudit(payslipId);

    return res.json({
      success: true,
      data: audit
    });
  } catch (error) {
    logger.error('Error getting payslip audit:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/payroll/mapping/payslip/:payslipId/map
 * Map approved items to a payslip
 * Body: { month: number, year: number }
 */
router.post('/payslip/:payslipId/map', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { payslipId } = req.params;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId }
    });

    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    const updatedPayslip = await payrollMappingService.mapApprovedItemsToPayslip(
      payslipId,
      payslip.employeeId,
      month,
      year
    );

    return res.json({
      success: true,
      message: 'Payslip mapped successfully',
      data: updatedPayslip
    });
  } catch (error) {
    logger.error('Error mapping payslip:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/payroll/mapping/batch/:payrollRunId
 * Batch map all payslips in a payroll run
 */
router.post('/batch/:payrollRunId', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { payrollRunId } = req.params;

    const results = await payrollMappingService.batchMapPayslips(payrollRunId);

    return res.json({
      success: true,
      message: `Batch mapping completed: ${results.updated}/${results.processed} payslips updated`,
      data: results
    });
  } catch (error) {
    logger.error('Error in batch mapping:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/payroll/mapping/approved-items/:employeeId
 * Get all approved items for an employee in a specific month
 * Query: ?month=5&year=2026
 */
router.get('/approved-items/:employeeId', authenticate, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'month and year query parameters are required' });
    }

    const items = await payrollMappingService.getApprovedItemsForPayroll(
      employeeId,
      parseInt(month),
      parseInt(year)
    );

    return res.json({
      success: true,
      data: items
    });
  } catch (error) {
    logger.error('Error getting approved items:', error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
