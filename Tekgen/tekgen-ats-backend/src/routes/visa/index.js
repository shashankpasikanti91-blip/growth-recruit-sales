const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireVisaRead } = require('../../middleware/visaAccess');
const dashboardRoute = require('./dashboardRoute');
const casesRoute = require('./casesRoute');
const complianceRoute = require('./complianceRoute');
const miscRoute = require('./miscRoute');

const router = express.Router();

router.use(authenticate);
router.use(requireVisaRead);

router.use('/dashboard', dashboardRoute);
router.use('/cases', casesRoute);
router.use('/compliance', complianceRoute);
router.use('/', miscRoute);

module.exports = router;
