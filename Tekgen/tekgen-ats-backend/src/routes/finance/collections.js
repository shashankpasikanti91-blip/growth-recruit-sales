const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');

const router = express.Router();

const invoiceSelect = {
  id: true,
  displayId: true,
  grandTotal: true,
  balanceDue: true,
  status: true,
  dueDate: true,
  client: {
    select: {
      id: true,
      clientName: true,
      primaryContactEmail: true,
      primaryContactPhone: true,
    },
  },
};

/**
 * GET all collection follow-ups (with filtering and pagination)
 */
router.get('/', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { invoiceId, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (invoiceId) where.invoiceId = invoiceId;
    if (status) where.status = status;

    const followUps = await prisma.collectionFollowUp.findMany({
      where,
      skip: parseInt(skip, 10),
      take: parseInt(limit, 10),
      include: {
        invoice: { select: invoiceSelect },
      },
      orderBy: { nextActionDate: 'asc' },
    });

    const total = await prisma.collectionFollowUp.count({ where });

    res.json({
      success: true,
      data: {
        followUps,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Collection Follow-ups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection follow-ups',
      error: error.message,
    });
  }
});

/**
 * GET single collection follow-up
 */
router.get('/:id', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const followUp = await prisma.collectionFollowUp.findUnique({
      where: { id: req.params.id },
      include: {
        invoice: {
          select: {
            ...invoiceSelect,
            client: {
              select: {
                id: true,
                clientName: true,
                primaryContactEmail: true,
                primaryContactPhone: true,
                address: true,
              },
            },
            payments: { select: { amount: true, paymentDate: true } },
          },
        },
      },
    });

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Collection follow-up not found',
      });
    }

    res.json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    console.error('Get Collection Follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection follow-up',
      error: error.message,
    });
  }
});

/**
 * CREATE collection follow-up
 * Body: invoiceId, contactMethod | followUpMethod, remarks | notes, followUpDate?, nextActionDate | nextFollowUpDate?, owner?
 */
router.post('/', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const {
      invoiceId,
      followUpMethod,
      contactMethod,
      notes,
      remarks,
      followUpDate,
      nextFollowUpDate,
      nextActionDate,
      owner,
    } = req.body;

    const method = contactMethod || followUpMethod;

    if (!invoiceId || !method) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: invoiceId, contactMethod (or followUpMethod)',
      });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (invoice.status === 'PAID' || (invoice.balanceDue != null && invoice.balanceDue <= 0.01)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create follow-up for fully paid invoices',
      });
    }

    const nextAct = nextActionDate || nextFollowUpDate;
    const followUp = await prisma.collectionFollowUp.create({
      data: {
        invoiceId,
        followUpDate: followUpDate ? new Date(followUpDate) : new Date(),
        contactMethod: method,
        remarks: remarks || notes || '',
        status: 'PENDING',
        nextActionDate: nextAct ? new Date(nextAct) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        owner: owner || req.user?.id || null,
      },
      include: {
        invoice: {
          select: {
            id: true,
            displayId: true,
            grandTotal: true,
            client: { select: { clientName: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: followUp,
      message: 'Collection follow-up created successfully',
    });
  } catch (error) {
    console.error('Create Collection Follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create collection follow-up',
      error: error.message,
    });
  }
});

/**
 * UPDATE collection follow-up
 */
router.put('/:id', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { status, nextFollowUpDate, nextActionDate, remarks, notes, owner } = req.body;
    const nextAct = nextActionDate || nextFollowUpDate;
    const mergedRemarks = remarks !== undefined ? remarks : notes;

    const followUp = await prisma.collectionFollowUp.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(nextAct && { nextActionDate: new Date(nextAct) }),
        ...(mergedRemarks !== undefined && { remarks: mergedRemarks }),
        ...(owner !== undefined && { owner }),
      },
      include: {
        invoice: {
          select: {
            id: true,
            displayId: true,
            grandTotal: true,
            client: { select: { clientName: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: followUp,
      message: 'Collection follow-up updated successfully',
    });
  } catch (error) {
    console.error('Update Collection Follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update collection follow-up',
      error: error.message,
    });
  }
});

/**
 * RECORD outcome on collection follow-up
 */
router.post('/:id/attempt', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { outcome, notes } = req.body;

    const existing = await prisma.collectionFollowUp.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Collection follow-up not found',
      });
    }

    const remarkAppend = notes
      ? `${existing.remarks || ''}\n\n[Update] ${notes}`.trim()
      : existing.remarks;

    const updatedFollowUp = await prisma.collectionFollowUp.update({
      where: { id: req.params.id },
      data: {
        status: outcome === 'RESOLVED' ? 'COMPLETED' : 'PENDING',
        remarks: remarkAppend,
        nextActionDate:
          outcome === 'RESOLVED'
            ? null
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        invoice: {
          select: {
            id: true,
            displayId: true,
            client: { select: { clientName: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedFollowUp,
      message: 'Collection follow-up updated',
    });
  } catch (error) {
    console.error('Record Collection Attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record collection update',
      error: error.message,
    });
  }
});

/**
 * DELETE collection follow-up
 */
router.delete('/:id', authenticate, authorize('FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    await prisma.collectionFollowUp.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Collection follow-up deleted successfully',
    });
  } catch (error) {
    console.error('Delete Collection Follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete collection follow-up',
      error: error.message,
    });
  }
});

module.exports = router;
