const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const submissionController = require('../controllers/submissionController');
const submissionService = require('../services/submissionService');

const router = express.Router();
router.use(authenticate);

const stages = submissionService.SUBMISSION_STAGES;

router.get('/', submissionController.listForJob);

router.patch(
  '/:id/stage',
  [
    body('stage').isIn(stages).withMessage('Invalid pipeline stage'),
    body('clientFeedback').optional({ nullable: true }).isString(),
    body('rejectionReason').optional({ nullable: true }).isString(),
    body('offerStatus').optional({ nullable: true }).isString(),
    body('interviewDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ],
  submissionController.patchStage
);

module.exports = router;
