const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(requireAdmin);

// User management
router.get('/users', adminController.listUsers);
router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').isLength({ min: 2 }),
  body('lastName').isLength({ min: 2 }),
], adminController.createUser);
router.post('/users/force-password-change', [
  body('userIds').isArray({ min: 1 }),
], adminController.forcePasswordChange);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// System stats
router.get('/stats', adminController.getSystemStats);

// Monitoring & RBAC control
router.get('/monitoring', adminController.getMonitoringOverview);
router.get('/jobs', adminController.getAllJDs);
router.patch('/jobs/:jobId/assign', adminController.reassignJob);

// Team submissions (who uploaded what)
router.get('/submissions', adminController.getTeamSubmissions);

module.exports = router;
