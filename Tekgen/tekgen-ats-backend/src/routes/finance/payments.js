const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');

const router = express.Router();

const invoiceSelect = {
  id: true,
  displayId: true,
  grandTotal: true,
  amountPaid: true,
  balanceDue: true,
  status: true,
  client: { select: { clientName: true } },
};

/**
 * GET all payments (with filtering and pagination)
 */
router.get('/', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { invoiceId, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (invoiceId) where.invoiceId = invoiceId;
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      skip: parseInt(skip, 10),
      take: parseInt(limit, 10),
      include: {
        invoice: { select: invoiceSelect },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const total = await prisma.payment.count({ where });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
});

/**
 * GET single payment
 */
router.get('/:id', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        invoice: {
          select: {
            ...invoiceSelect,
            client: {
              select: { id: true, clientName: true, primaryContactEmail: true },
            },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Get Payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: error.message,
    });
  }
});

/**
 * RECORD new payment
 */
router.post('/', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod, referenceNo, transactionId, notes } = req.body;
    const ref = referenceNo || transactionId;

    if (!invoiceId || amount == null || !paymentDate || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: invoiceId, amount, paymentDate, paymentMethod',
      });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const amt = parseFloat(amount);
    const totalPaid = paidAmount + amt;

    if (totalPaid > invoice.grandTotal + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds invoice total. Invoice: ${invoice.grandTotal}, Already paid: ${paidAmount}, New payment: ${amt}`,
      });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: amt,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        referenceNo: ref || null,
        status: 'RECORDED',
        notes: notes || null,
        recordedBy: req.user?.id || null,
      },
      include: {
        invoice: { select: { id: true, displayId: true, grandTotal: true } },
      },
    });

    const newPaid = invoice.amountPaid + amt;
    const balanceDue = Math.max(0, invoice.grandTotal - newPaid);
    let invoiceStatus = invoice.status;
    if (balanceDue <= 0.01) {
      invoiceStatus = 'PAID';
    } else if (newPaid > 0) {
      invoiceStatus = 'PARTIALLY_PAID';
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newPaid,
        balanceDue,
        status: invoiceStatus,
      },
    });

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Record Payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message,
    });
  }
});

/**
 * UPDATE payment
 */
router.put('/:id', authenticate, authorize('FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { amount, paymentDate, paymentMethod, referenceNo, transactionId, notes } = req.body;
    const ref = referenceNo !== undefined ? referenceNo : transactionId;

    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        ...(amount != null && { amount: parseFloat(amount) }),
        ...(paymentDate && { paymentDate: new Date(paymentDate) }),
        ...(paymentMethod && { paymentMethod }),
        ...(ref !== undefined && { referenceNo: ref || null }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        invoice: { select: { id: true, displayId: true } },
      },
    });

    res.json({
      success: true,
      data: payment,
      message: 'Payment updated successfully',
    });
  } catch (error) {
    console.error('Update Payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment',
      error: error.message,
    });
  }
});

/**
 * DELETE payment (only if still RECORDED — not verified/cleared)
 */
router.delete('/:id', authenticate, authorize('FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'RECORDED') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete payments in RECORDED status',
      });
    }

    const invoiceId = payment.invoiceId;

    await prisma.payment.delete({
      where: { id: req.params.id },
    });

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (invoice) {
      const agg = await prisma.payment.aggregate({
        where: { invoiceId },
        _sum: { amount: true },
      });
      const newPaid = agg._sum.amount || 0;
      const balanceDue = Math.max(0, invoice.grandTotal - newPaid);
      let status = invoice.status;
      if (balanceDue <= 0.01) status = 'PAID';
      else if (newPaid > 0.01) status = 'PARTIALLY_PAID';
      else if (['PAID', 'PARTIALLY_PAID'].includes(invoice.status)) status = 'SENT';

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newPaid,
          balanceDue,
          status,
        },
      });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    console.error('Delete Payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment',
      error: error.message,
    });
  }
});

module.exports = router;
