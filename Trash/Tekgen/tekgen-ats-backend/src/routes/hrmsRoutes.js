const express = require('express');
const { authenticate } = require('../middleware/auth');
const hrmsController = require('../controllers/hrmsController');

const router = express.Router();

router.use(authenticate);

router.get('/kpis', hrmsController.getKpis);

module.exports = router;
