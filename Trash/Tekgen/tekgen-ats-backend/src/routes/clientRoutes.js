const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const clientController = require('../controllers/clientController');

const router = express.Router();
router.use(authenticate);

// Dropdown options for forms
router.get('/options', clientController.getClientOptions);

// CRUD
router.post('/', [
  body('clientName').trim().notEmpty().withMessage('Client name is required'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'PROSPECT']),
], clientController.createClient);

router.get('/', clientController.getClients);
router.get('/:id', clientController.getClientById);

router.put('/:id', [
  body('clientName').trim().optional(),
  body('website').optional().isURL().optional({ nullable: true }),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'PROSPECT']),
], clientController.updateClient);

router.delete('/:id', clientController.deleteClient);

module.exports = router;
