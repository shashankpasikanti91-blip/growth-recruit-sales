const express = require('express');

const router = express.Router();

// Finance module routes
router.use('/dashboard', require('./dashboard'));
router.use('/agreements', require('./agreements'));
router.use('/invoices', require('./invoices'));
router.use('/payments', require('./payments'));
router.use('/collections', require('./collections'));

module.exports = router;
