const express = require('express');
const { getDashboardKpis } = require('../../services/visaService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await getDashboardKpis();
    res.json({ success: true, data });
  } catch (e) {
    console.error('Visa dashboard', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
