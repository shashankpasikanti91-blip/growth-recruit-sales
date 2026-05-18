const express = require('express');
const prisma = require('../../config/database');
const { requireVisaCaseWrite, requireVisaChecklistWrite } = require('../../middleware/visaAccess');

const router = express.Router();

router.patch('/documents/:documentId/verify', requireVisaCaseWrite, async (req, res) => {
  try {
    const { verifiedStatus, notes } = req.body;
    if (!verifiedStatus || !['PENDING', 'VERIFIED', 'REJECTED'].includes(verifiedStatus)) {
      return res.status(400).json({ success: false, message: 'verifiedStatus must be PENDING, VERIFIED, or REJECTED' });
    }
    const doc = await prisma.visaDocument.update({
      where: { id: req.params.documentId },
      data: {
        verifiedStatus,
        ...(notes !== undefined && { notes }),
      },
    });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.patch('/onboarding/:itemId', requireVisaChecklistWrite, async (req, res) => {
  try {
    const { status, dueDate, linkedDocumentId, completedAt } = req.body;
    const item = await prisma.visaOnboardingItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(linkedDocumentId !== undefined && { linkedDocumentId }),
        ...(completedAt !== undefined && {
          completedAt: completedAt ? new Date(completedAt) : null,
          completedById: completedAt ? req.user.id : null,
        }),
      },
    });
    res.json({ success: true, data: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/alerts/:alertId/ack', requireVisaChecklistWrite, async (req, res) => {
  try {
    const alert = await prisma.visaExpiryAlert.update({
      where: { id: req.params.alertId },
      data: {
        acknowledgedById: req.user.id,
        acknowledgedAt: new Date(),
      },
    });
    res.json({ success: true, data: alert });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.patch('/dependents/:dependentId', requireVisaCaseWrite, async (req, res) => {
  try {
    const { name, relationship, passportNo, passStatus, expiryDate, notes } = req.body;
    const dep = await prisma.visaDependent.update({
      where: { id: req.params.dependentId },
      data: {
        ...(name !== undefined && { name }),
        ...(relationship !== undefined && { relationship }),
        ...(passportNo !== undefined && { passportNo }),
        ...(passStatus !== undefined && { passStatus }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json({ success: true, data: dep });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/dependents/:dependentId', requireVisaCaseWrite, async (req, res) => {
  try {
    await prisma.visaDependent.delete({ where: { id: req.params.dependentId } });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
