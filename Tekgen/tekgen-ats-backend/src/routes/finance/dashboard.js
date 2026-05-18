const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');

const router = express.Router();

const OUTSTANDING_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'];

/**
 * GET Finance Dashboard with KPIs
 */
router.get('/', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const totalInvoices = await prisma.invoice.count();
    const paidInvoices = await prisma.invoice.count({
      where: { status: 'PAID' },
    });

    const now = new Date();
    const overdueInvoices = await prisma.invoice.count({
      where: {
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'APPROVED', 'SUBMITTED'] },
        dueDate: { lt: now },
        balanceDue: { gt: 0 },
      },
    });

    const revenueData = await prisma.invoice.aggregate({
      where: { status: 'PAID' },
      _sum: { grandTotal: true },
    });
    const totalRevenue = revenueData._sum.grandTotal || 0;

    const pendingData = await prisma.invoice.aggregate({
      where: {
        status: { in: OUTSTANDING_STATUSES },
        balanceDue: { gt: 0 },
      },
      _sum: { balanceDue: true },
    });
    const pendingAmount = pendingData._sum.balanceDue || 0;

    const recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, clientName: true } },
        agreement: { select: { id: true, displayId: true } },
      },
    });

    const pendingApprovals = await prisma.invoice.count({
      where: { status: 'SUBMITTED' },
    });

    const paymentsSummary = await prisma.payment.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true },
    });

    const collectionsFollowUps = await prisma.collectionFollowUp.count({
      where: { status: 'PENDING' },
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalInvoices,
          paidInvoices,
          overdueInvoices,
          pendingApprovals,
          collectionsFollowUps,
          totalRevenue,
          pendingAmount,
        },
        recentInvoices,
        paymentsSummary,
      },
    });
  } catch (error) {
    console.error('Finance Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch finance dashboard',
      error: error.message,
    });
  }
});

module.exports = router;
