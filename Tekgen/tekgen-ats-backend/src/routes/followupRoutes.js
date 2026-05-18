const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const followupController = require('../controllers/followupController');

const router = express.Router();
router.use(authenticate);

router.get('/', followupController.getFollowUps);

router.post('/', [
  body('note').trim().notEmpty().withMessage('Note is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
], followupController.createFollowUp);

router.patch('/:id', followupController.updateFollowUp);
router.delete('/:id', followupController.deleteFollowUp);

module.exports = router;
