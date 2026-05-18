const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');

const router = express.Router();

function makeAgreementDisplayId() {
  return `TKG-AGR-${Date.now().toString(36).toUpperCase().slice(-8)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

/**
 * GET all agreements (with filtering and pagination)
 */
router.get('/', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { status, clientId, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    const agreements = await prisma.agreement.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        client: { select: { id: true, clientName: true, email: true } },
        billingRules: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.agreement.count({ where });

    res.json({
      success: true,
      data: {
        agreements,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Agreements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agreements',
      error: error.message,
    });
  }
});

/**
 * GET single agreement
 */
router.get('/:id', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const agreement = await prisma.agreement.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, clientName: true, email: true, phone: true } },
        billingRules: true,
        invoices: {
          select: {
            id: true,
            displayId: true,
            grandTotal: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Agreement not found',
      });
    }

    res.json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    console.error('Get Agreement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agreement',
      error: error.message,
    });
  }
});

/**
 * CREATE new agreement (Finance Head or Admin)
 */
router.post('/', authenticate, authorize('FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const {
      clientId,
      agreementNumber,
      displayId,
      startDate,
      endDate,
      rateType,
      agreementType,
      title,
      description,
      terms,
      paymentTerms,
      billRate,
      currency,
      status,
    } = req.body;

    if (!clientId || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientId, startDate',
      });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    const agreement = await prisma.agreement.create({
      data: {
        clientId,
        displayId: displayId || agreementNumber || makeAgreementDisplayId(),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        rateType: rateType || 'MONTHLY',
        agreementType: agreementType || 'MSA',
        title: title || null,
        description: description || terms || null,
        paymentTerms: paymentTerms || terms || null,
        billRate: billRate != null ? parseFloat(billRate) : null,
        currency: currency || 'MYR',
        status: status || 'ACTIVE',
      },
      include: { client: { select: { id: true, clientName: true } } },
    });

    res.status(201).json({
      success: true,
      data: agreement,
      message: 'Agreement created successfully',
    });
  } catch (error) {
    console.error('Create Agreement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agreement',
      error: error.message,
    });
  }
});

/**
 * UPDATE agreement
 */
router.put('/:id', authenticate, authorize('FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const {
      agreementNumber,
      displayId,
      startDate,
      endDate,
      rateType,
      agreementType,
      title,
      description,
      terms,
      paymentTerms,
      billRate,
      currency,
      status,
    } = req.body;

    const agreement = await prisma.agreement.update({
      where: { id: req.params.id },
      data: {
        ...((displayId || agreementNumber) && { displayId: displayId || agreementNumber }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(rateType && { rateType }),
        ...(agreementType && { agreementType }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || terms }),
        ...(paymentTerms !== undefined && { paymentTerms: paymentTerms || terms }),
        ...(billRate !== undefined && { billRate: billRate != null ? parseFloat(billRate) : null }),
        ...(currency && { currency }),
        ...(status && { status }),
      },
      include: { client: { select: { id: true, clientName: true } } },
    });

    res.json({
      success: true,
      data: agreement,
      message: 'Agreement updated successfully',
    });
  } catch (error) {
    console.error('Update Agreement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agreement',
      error: error.message,
    });
  }
});

/**
 * DELETE agreement (only if no invoices)
 */
router.delete('/:id', authenticate, authorize('FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    // Check if agreement has invoices
    const invoiceCount = await prisma.invoice.count({
      where: { agreementId: req.params.id },
    });

    if (invoiceCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete agreement with active invoices',
      });
    }

    await prisma.agreement.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Agreement deleted successfully',
    });
  } catch (error) {
    console.error('Delete Agreement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agreement',
      error: error.message,
    });
  }
});

module.exports = router;
