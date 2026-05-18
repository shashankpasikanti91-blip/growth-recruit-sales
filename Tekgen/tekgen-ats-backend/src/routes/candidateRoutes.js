const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const candidateController = require('../controllers/candidateController');
const config = require('../config/environment');

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `resume-${req.user?.id || 'unknown'}-${timestamp}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Supported: PDF, DOC, DOCX, TXT, CSV, XLS, XLSX'));
    }
  },
});

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload resume
router.post('/upload-resume', upload.single('resume'), candidateController.uploadResume);

// Parse resume text
router.post('/parse-text', candidateController.parseResumeText);

// Preview resume file (extract fields without saving)
router.post('/preview-resume', upload.single('resume'), candidateController.previewResume);

// Preview resume text (extract fields without saving)
router.post('/preview-text', candidateController.previewText);

// Get all candidates
router.get('/', candidateController.getCandidates);

// Get candidate by ID
router.get('/:id', candidateController.getCandidateById);

// Update candidate
router.put('/:id', [
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('phone').optional(),
  body('location').optional(),
  body('linkedinUrl').optional(),
  body('icNumber').optional().trim(),
  body('passportNumber').optional().trim(),
  body('nationality').optional().trim(),
  body('dob').optional(),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER', '']),
  body('maritalStatus').optional().isIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', '']),
  // Submission / profiling fields
  body('relevantExperience').optional(),
  body('visaType').optional(),
  body('visaValidity').optional(),
  body('currentEmployer').optional().trim(),
  body('preferredLocation').optional(),
  body('currentSalary').optional(),
  body('expectedSalary').optional(),
  body('noticePeriod').optional(),
  body('interviewMode').optional(),
  body('offersInHand').optional(),
  body('recruiterNotes').optional(),
  body('callStatus').optional(),
  body('submissionDate').optional(),
], candidateController.updateCandidate);

// Update candidate status
router.patch('/:id/status', [
  body('status').isIn(['NEW', 'APPLIED', 'SCREENED', 'INTERVIEW', 'REJECTED', 'HIRED', 'ON_HOLD']),
], candidateController.updateCandidateStatus);

// WhatsApp (Cloud API from Integrations)
router.post('/:id/whatsapp-message', [
  body('message').isLength({ min: 1 }),
], candidateController.sendWhatsAppToCandidate);

// Delete candidate
router.delete('/:id', candidateController.deleteCandidate);

module.exports = router;
