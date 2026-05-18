const express = require('express');

const router = express.Router();

// Payroll module routes
router.use('/dashboard', require('./dashboard'));
router.use('/settings', require('./settings'));
router.use('/statutory-forms', require('./statutory-forms'));
router.use('/admin', require('./admin'));
router.use('/admin/claims', require('./admin-claims'));
router.use('/admin/leaves', require('./admin-leaves'));
router.use('/salary-structures', require('./salaryStructures'));
router.use('/runs', require('./payrollRuns'));
router.use('/attendance', require('./attendance'));
router.use('/approvals', require('./approvals'));
router.use('/approver', require('./approver'));
router.use('/claims', require('./claims'));
router.use('/leaves', require('./leaves'));
router.use('/mapping', require('./payroll-mapping'));
router.use('/my-payslips', require('./employee-payslips'));

module.exports = router;
