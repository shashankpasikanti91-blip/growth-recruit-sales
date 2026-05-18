const express = require('express');
const prisma = require('../../config/database');
const { requireComplianceWrite } = require('../../middleware/visaAccess');

const router = express.Router();

router.get('/rules', async (req, res) => {
  try {
    const rules = await prisma.visaComplianceRule.findMany({
      orderBy: [{ effectiveDate: 'desc' }, { country: 'asc' }],
    });
    res.json({ success: true, data: { rules } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/rules', requireComplianceWrite, async (req, res) => {
  try {
    const { country, workerCategory, year, ruleType, ruleValue, effectiveDate } = req.body;
    if (!ruleType || !effectiveDate) {
      return res.status(400).json({ success: false, message: 'ruleType and effectiveDate are required' });
    }
    const rule = await prisma.visaComplianceRule.create({
      data: {
        country: country || 'MY',
        workerCategory: workerCategory || null,
        year: year != null ? parseInt(year, 10) : null,
        ruleType,
        ruleValue: ruleValue ?? undefined,
        effectiveDate: new Date(effectiveDate),
        configuredById: req.user.id,
      },
    });
    res.status(201).json({ success: true, data: rule });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.patch('/rules/:id', requireComplianceWrite, async (req, res) => {
  try {
    const { country, workerCategory, year, ruleType, ruleValue, effectiveDate } = req.body;
    const rule = await prisma.visaComplianceRule.update({
      where: { id: req.params.id },
      data: {
        ...(country !== undefined && { country }),
        ...(workerCategory !== undefined && { workerCategory }),
        ...(year !== undefined && { year: year != null ? parseInt(year, 10) : null }),
        ...(ruleType !== undefined && { ruleType }),
        ...(ruleValue !== undefined && { ruleValue }),
        ...(effectiveDate !== undefined && { effectiveDate: new Date(effectiveDate) }),
        configuredById: req.user.id,
      },
    });
    res.json({ success: true, data: rule });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/rules/:id', requireComplianceWrite, async (req, res) => {
  try {
    await prisma.visaComplianceRule.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
