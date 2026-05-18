const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const screeningController = require('../controllers/screeningController');
const config = require('../config/environment');

// Configure file upload for screening
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `screen-${timestamp}${path.extname(file.originalname)}`);
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

// Pipeline stats for dashboard
router.get('/stats/pipeline', screeningController.getPipelineStats);

// Screen single candidate (1 candidate + 1 job)
router.post('/single', [
  body('candidateId')
    .notEmpty().withMessage('candidateId is required')
    .isString().withMessage('candidateId must be a string'),
  body('jobId')
    .notEmpty().withMessage('jobId is required')
    .isString().withMessage('jobId must be a string'),
], screeningController.screenSingle);

// Bulk screen (1 job + N candidates OR N jobs + 1 candidate)
router.post('/bulk', [
  body('jobId').optional(),
  body('jobIds').optional().isArray(),
  body('candidateIds').isArray(),
], screeningController.screenBulk);

// Extract text from a JD file (PDF, DOCX, DOC, TXT) — returns { text }
router.post('/extract-jd', upload.single('jdFile'), screeningController.extractJdText);

// Screen with direct text input (resume text + job description text)
router.post('/direct-text', screeningController.screenDirectText);

// Screen with file upload (resume file + job selection or JD text)
router.post('/direct-file', upload.array('files', 50), screeningController.screenDirectFile);

// AI writing helper – improve/rewrite/translate text
router.post('/ai-write', screeningController.aiWrite);

// Phase 4: Screening Sessions — persistent history, load from DB without rerunning
router.get('/sessions', screeningController.getSessions);
router.get('/sessions/latest', screeningController.getLatestSession);
router.get('/sessions/:sessionId', screeningController.getSessionById);

// Get all screenings (history list for current user's jobs)
router.get('/', screeningController.getAllScreenings);

// Get screening results for a job
router.get('/results/:jobId', screeningController.getJobResults);

// Get screening analysis for candidate-job pair
router.get('/analysis/:candidateId/:jobId', screeningController.getAnalysis);

module.exports = router;
