const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const emailController = require('../controllers/emailController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Send application received email
router.post('/send/application-received', [
  body('candidateEmail').isEmail(),
  body('candidateName').notEmpty(),
  body('jobTitle').notEmpty(),
], emailController.sendApplicationReceivedEmail);

// Send shortlisted email
router.post('/send/shortlisted', [
  body('candidateEmail').isEmail(),
  body('candidateName').notEmpty(),
  body('jobTitle').notEmpty(),
], emailController.sendShortlistedEmail);

// Send rejection email
router.post('/send/rejection', [
  body('candidateEmail').isEmail(),
  body('candidateName').notEmpty(),
  body('jobTitle').notEmpty(),
], emailController.sendRejectionEmail);

// Send interview scheduled email
router.post('/send/interview-scheduled', [
  body('candidateEmail').isEmail(),
  body('candidateName').notEmpty(),
  body('jobTitle').notEmpty(),
  body('interviewDate').notEmpty(),
  body('interviewTime').notEmpty(),
], emailController.sendInterviewScheduledEmail);

// Send follow-up email
router.post('/send/follow-up', [
  body('candidateEmail').isEmail(),
  body('candidateName').notEmpty(),
  body('jobTitle').notEmpty(),
], emailController.sendFollowUpEmail);

// Get email logs
router.get('/logs', emailController.getEmailLogs);

module.exports = router;
