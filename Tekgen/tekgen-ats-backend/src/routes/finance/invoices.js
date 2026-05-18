const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const prisma = require('../../config/database');
const notificationService = require('../../services/notificationService');

const router = express.Router();

function makeDisplayId(prefix) {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${t.slice(-4)}${r}`;
}

function normalizeLineItems(lineItems) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return [];
  return lineItems.map((line) => {
    const quantity = parseFloat(line.quantity);
    const rate = parseFloat(line.rate ?? line.unitPrice ?? 0);
    const unit = line.unit || 'ITEMS';
    const discount = parseFloat(line.discount || 0);
    const taxPercent = parseFloat(line.taxPercent || 0);
    const base = quantity * rate - discount;
    const lineTotal = base + (base * taxPercent) / 100;
    return {
      description: line.description || 'Line item',
      workerName: line.workerName || null,
      workerId: line.workerId || null,
      quantity,
      unit,
      rate,
      taxPercent,
      discount,
      lineTotal,
      timesheetId: line.timesheetId || null,
      assignmentId: line.assignmentId || null,
    };
  });
}

/**
 * GET all invoices (with filtering and pagination)
 */
router.get('/', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { status, clientId, agreementId, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (agreementId) where.agreementId = agreementId;

    const invoices = await prisma.invoice.findMany({
      where,
      skip: parseInt(skip, 10),
      take: parseInt(limit, 10),
      include: {
        client: { select: { id: true, clientName: true } },
        agreement: { select: { id: true, displayId: true } },
        lines: true,
        documents: { select: { id: true, documentName: true, uploadedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.invoice.count({ where });

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message,
    });
  }
});

/**
 * GET single invoice
 */
router.get('/:id', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            primaryContactEmail: true,
            primaryContactPhone: true,
            address: true,
          },
        },
        agreement: { select: { id: true, displayId: true } },
        lines: true,
        payments: true,
        documents: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Get Invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message,
    });
  }
});

/**
 * CREATE new invoice
 * Body: clientId, agreementId?, displayId?, invoiceDate | issueDate, dueDate, invoicePeriod?,
 *       taxAmount?, taxType?, discount?, adjustments?, lineItems: [{ description, quantity, rate, unit? }]
 */
router.post('/', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const {
      clientId,
      agreementId,
      displayId,
      invoiceNumber,
      invoiceDate,
      issueDate,
      dueDate,
      invoicePeriod,
      billingContact,
      billingEmail,
      taxAmount: taxAmountRaw,
      taxType,
      discount: invDiscountRaw,
      adjustments: invAdjRaw,
      lineItems,
    } = req.body;

    const invDate = invoiceDate || issueDate;
    if (!clientId || !invDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientId, invoiceDate (or issueDate), dueDate',
      });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    const lines = normalizeLineItems(lineItems);
    if (!lines.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one line item is required',
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate - l.discount, 0);
    const taxAmount = parseFloat(taxAmountRaw ?? 0);
    const discount = parseFloat(invDiscountRaw ?? 0);
    const adjustments = parseFloat(invAdjRaw ?? 0);
    const grandTotal = subtotal + taxAmount + adjustments - discount;
    const disp = displayId || invoiceNumber || makeDisplayId('TKG-INV');

    const invoice = await prisma.invoice.create({
      data: {
        displayId: disp,
        clientId,
        agreementId: agreementId || null,
        invoiceDate: new Date(invDate),
        dueDate: new Date(dueDate),
        invoicePeriod: invoicePeriod || null,
        billingContact: billingContact || null,
        billingEmail: billingEmail || null,
        subtotal,
        taxAmount,
        taxType: taxType || 'NONE',
        discount,
        adjustments,
        grandTotal,
        amountPaid: 0,
        balanceDue: grandTotal,
        status: 'DRAFT',
        createdBy: req.user?.id || null,
        lines: { create: lines },
      },
      include: {
        client: { select: { id: true, clientName: true } },
        lines: true,
      },
    });

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    console.error('Create Invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message,
    });
  }
});

/**
 * UPDATE invoice (draft / editable fields)
 */
router.put('/:id', authenticate, authorize('FINANCE', 'FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const {
      displayId,
      invoiceNumber,
      invoiceDate,
      issueDate,
      dueDate,
      invoicePeriod,
      billingContact,
      billingEmail,
      taxAmount,
      taxType,
      discount,
      adjustments,
      status,
      lineItems,
    } = req.body;

    const existing = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    let data = {
      ...(displayId || invoiceNumber ? { displayId: displayId || invoiceNumber } : {}),
      ...(invoiceDate || issueDate ? { invoiceDate: new Date(invoiceDate || issueDate) } : {}),
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      ...(invoicePeriod !== undefined ? { invoicePeriod } : {}),
      ...(billingContact !== undefined ? { billingContact } : {}),
      ...(billingEmail !== undefined ? { billingEmail } : {}),
      ...(taxAmount !== undefined ? { taxAmount: parseFloat(taxAmount) } : {}),
      ...(taxType !== undefined ? { taxType } : {}),
      ...(discount !== undefined ? { discount: parseFloat(discount) } : {}),
      ...(adjustments !== undefined ? { adjustments: parseFloat(adjustments) } : {}),
      ...(status ? { status } : {}),
    };

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      const lines = normalizeLineItems(lineItems);
      const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate - l.discount, 0);
      const taxVal = taxAmount !== undefined ? parseFloat(taxAmount) : existing.taxAmount;
      const discVal = discount !== undefined ? parseFloat(discount) : existing.discount;
      const adjVal = adjustments !== undefined ? parseFloat(adjustments) : existing.adjustments;
      const grandTotal = subtotal + taxVal + adjVal - discVal;
      const paid = existing.amountPaid;
      data = {
        ...data,
        subtotal,
        grandTotal,
        balanceDue: Math.max(0, grandTotal - paid),
        lines: {
          deleteMany: {},
          create: lines,
        },
      };
    }

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data,
      include: {
        client: { select: { id: true, clientName: true } },
        lines: true,
      },
    });

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice updated successfully',
    });
  } catch (error) {
    console.error('Update Invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: error.message,
    });
  }
});

/**
 * APPROVE invoice (Finance Head or Admin)
 */
router.put('/:id/approve', authenticate, authorize('FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedBy: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        client: { select: { id: true, clientName: true } },
      },
    });

    if (existing.createdBy) {
      await notificationService.createNotification({
        userId: existing.createdBy,
        type: 'FINANCE_INVOICE_STATUS_UPDATED',
        title: `Invoice approved (${invoice.displayId})`,
        message: `Invoice ${invoice.displayId} has been approved by finance leadership.`,
        relatedId: invoice.id,
        severity: 'NORMAL'
      }).catch(() => {});
    }

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice approved successfully',
    });
  } catch (error) {
    console.error('Approve Invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve invoice',
      error: error.message,
    });
  }
});

/**
 * REJECT / cancel invoice
 */
router.put('/:id/reject', authenticate, authorize('FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { reason } = req.body;
    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        client: { select: { id: true, clientName: true } },
      },
    });

    if (existing.createdBy) {
      await notificationService.createNotification({
        userId: existing.createdBy,
        type: 'FINANCE_INVOICE_STATUS_UPDATED',
        title: `Invoice rejected (${invoice.displayId})`,
        message: `Invoice ${invoice.displayId} was rejected${reason ? `: ${reason}` : '.'}`,
        relatedId: invoice.id,
        severity: 'HIGH'
      }).catch(() => {});
    }

    res.json({
      success: true,
      data: invoice,
      message: reason ? `Invoice cancelled: ${reason}` : 'Invoice cancelled',
    });
  } catch (error) {
    console.error('Reject Invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel invoice',
      error: error.message,
    });
  }
});

/**
 * DELETE invoice (only if DRAFT status)
 */
router.delete('/:id', authenticate, authorize('FINANCE_HEAD', 'ADMIN'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoices that are not in DRAFT status',
      });
    }

    await prisma.invoiceLine.deleteMany({
      where: { invoiceId: req.params.id },
    });

    await prisma.invoiceDocument.deleteMany({
      where: { invoiceId: req.params.id },
    });

    await prisma.invoice.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('Delete Invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
      error: error.message,
    });
  }
});

module.exports = router;
