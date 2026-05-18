/**
 * Sales Routes — Phase 2
 * /api/sales endpoints
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const salesController = require('../controllers/salesController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', salesController.getDashboard);

// Open JDs / recruitment requirements tracker
router.get('/requisitions', salesController.getRequisitions);

// Clients
router.get('/clients', salesController.getClients);
router.get('/clients/:id', salesController.getClientProfile);

module.exports = router;
