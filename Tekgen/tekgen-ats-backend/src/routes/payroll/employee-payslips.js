/**
 * Employee Payslips Routes
 * Allows employees to view their own payslips with filtering and download capabilities
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const config = require('../../config/environment');

const router = express.Router();
const SIGNED_URL_TTL_SECONDS = parseInt(process.env.PAYSLIP_SIGNED_URL_TTL_SECONDS || '900', 10);
const SIGNED_URL_SECRET = process.env.PAYSLIP_SIGNED_URL_SECRET || process.env.JWT_SECRET || 'tekgen-payslip-secret';

function createSignedPayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SIGNED_URL_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifySignedPayload(token) {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) return null;
  const expected = crypto
    .createHmac('sha256', SIGNED_URL_SECRET)
    .update(encoded)
    .digest('base64url');
  if (expected !== signature) return null;
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload?.exp || Date.now() > Number(payload.exp) * 1000) return null;
  return payload;
}

/**
 * GET /api/payroll/my-payslips
 * Get employee's own payslips with optional filtering by month/year
 * Query params: month (1-12), year (YYYY), limit (default 20), offset (default 0)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year, limit = 20, offset = 0 } = req.query;

    // Get employee profile for the logged-in user
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true, employeeId: true, user: { select: { firstName: true, lastName: true } } }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Build where clause for filtering
    const where = { employeeId: employee.id };
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    // Get payslips with pagination
    const [payslips, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        include: {
          payrollRun: { select: { displayId: true, status: true } },
          employee: { select: { employeeId: true, user: { select: { firstName: true, lastName: true } } } }
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.payslip.count({ where })
    ]);

    // Format response with month names
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const formatted = payslips.map(ps => ({
      ...ps,
      monthName: monthNames[ps.month],
      displayPeriod: `${monthNames[ps.month]} ${ps.year}`,
      netSalary: ps.grossSalary - ps.totalDeductions
    }));

    res.json({
      success: true,
      data: {
        payslips: formatted,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payslips', error: error.message });
  }
});

/**
 * GET /api/payroll/my-payslips/:payslipId
 * Get detailed payslip information including approved leaves and claims
 */
router.get('/:payslipId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { payslipId } = req.params;

    // Get employee profile
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Get payslip - verify ownership
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        payrollRun: { select: { displayId: true, status: true, createdAt: true } },
        employee: { 
          select: { 
            employeeId: true,
            department: true,
            designation: true,
            bankAccountNo: true,
            bankName: true,
            user: { select: { firstName: true, lastName: true, email: true } } 
          } 
        },
        approvedLeaves: true,
        approvedClaims: true
      }
    });

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    // Verify employee owns this payslip
    if (payslip.employeeId !== employee.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    res.json({
      success: true,
      data: {
        payslip: {
          ...payslip,
          monthName: monthNames[payslip.month],
          displayPeriod: `${monthNames[payslip.month]} ${payslip.year}`,
          netSalary: payslip.grossSalary - payslip.totalDeductions,
          totalAllowances: Object.values(payslip.allowances || {}).reduce((a, b) => a + b, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payslip:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payslip', error: error.message });
  }
});

/**
 * GET /api/payroll/my-payslips/download/:payslipId
 * Download payslip as PDF (if pdfUrl exists) or generate on-the-fly
 */
router.get('/download/:payslipId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { payslipId } = req.params;

    // Get employee
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Get payslip
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { employee: true, payrollRun: true }
    });

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    if (payslip.employeeId !== employee.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
    const token = createSignedPayload({
      payslipId: payslip.id,
      employeeId: employee.id,
      userId,
      exp: expiresAt
    });
    const signedUrl = `/api/payroll/my-payslips/signed/${token}`;

    // If PDF already generated, return signed URL only
    if (payslip.pdfUrl) {
      return res.json({
        success: true,
        data: {
          displayId: payslip.displayId,
          signedUrl,
          expiresAt: new Date(expiresAt * 1000).toISOString()
        }
      });
    }

    // Generate PDF filename
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const filename = `Payslip_${payslip.displayId}_${monthNames[payslip.month]}_${payslip.year}.pdf`;

    res.json({
      success: true,
      data: { 
        message: 'PDF download ready',
        displayId: payslip.displayId,
        filename,
        month: monthNames[payslip.month],
        year: payslip.year,
        signedUrl,
        expiresAt: new Date(expiresAt * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error downloading payslip:', error);
    res.status(500).json({ success: false, message: 'Failed to download payslip', error: error.message });
  }
});

/**
 * GET /api/payroll/my-payslips/signed/:token
 * Secure one-time-like signed retrieval for payslip PDFs.
 */
router.get('/signed/:token', async (req, res) => {
  try {
    const payload = verifySignedPayload(req.params.token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Invalid or expired signed URL' });
    }

    const payslip = await prisma.payslip.findUnique({
      where: { id: payload.payslipId },
      include: { employee: { select: { id: true } } }
    });
    if (!payslip || payslip.employeeId !== payload.employeeId) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    if (!payslip.pdfUrl) {
      return res.status(404).json({ success: false, message: 'Payslip PDF not generated yet' });
    }

    const pdfFile = path.basename(payslip.pdfUrl);
    const filePath = path.join(config.UPLOAD_DIR, pdfFile);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Payslip file missing' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${payslip.displayId || 'payslip'}.pdf"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error validating signed payslip URL:', error);
    return res.status(500).json({ success: false, message: config.NODE_ENV === 'development' ? error.message : 'Failed to validate signed URL' });
  }
});

module.exports = router;
