const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const jobController = require('../controllers/jobController');
const multer = require('multer');
const prisma = require('../config/database');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const uploadBulkHiring = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 28 * 1024 * 1024 },
});

// All routes require authentication
router.use(authenticate);

// List all team members (recruiters + admins) — available to all authenticated users
router.get('/team-members', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: { firstName: 'asc' },
    });
    res.json({ success: true, data: { users } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load team members' });
  }
});

// Parse job description from file(s)
router.post('/parse-file', upload.single('file'), jobController.parseJobDescriptionFile);
router.post('/parse-files', upload.array('files', 12), jobController.parseJobDescriptionFiles);

// Parse job description from text
router.post('/parse-text', [
  body('text').trim().notEmpty(),
], jobController.parseJobDescriptionText);

// Bulk client "Hiring Request" Excel (e.g. CIMB): preview + commit with per-row recruiter assignment
router.post(
  '/bulk-hiring-request/preview',
  authorize('ADMIN', 'MANAGEMENT', 'RECRUITMENT_MANAGER', 'SALES_MANAGER', 'SALES_EXEC'),
  uploadBulkHiring.single('file'),
  jobController.previewBulkHiringRequest
);
router.post(
  '/bulk-hiring-request/commit',
  authorize('ADMIN', 'MANAGEMENT', 'RECRUITMENT_MANAGER', 'SALES_MANAGER', 'SALES_EXEC'),
  [
    body('clientId').trim().notEmpty(),
    body('clientName').optional({ nullable: true }).trim(),
    body('jobReceivedDate').notEmpty().isISO8601(),
    body('targetSubmissionDate').notEmpty().isISO8601(),
    body('batchLabel').optional({ nullable: true }).trim(),
    body('priority').optional({ nullable: true }).isIn(['HIGH', 'URGENT', 'MEDIUM', 'LOW']),
    body('rows').isArray({ min: 1 }),
  ],
  jobController.commitBulkHiringRequest
);
router.get('/bulk-import/batches', jobController.listBulkImportBatches);
router.get('/bulk-import/batches/:batchId', jobController.getBulkImportBatch);

// Create job (recruitment manager–owned client requirements)
router.post('/', authorize('ADMIN', 'RECRUITMENT_MANAGER', 'SALES_MANAGER', 'SALES_EXEC'), [
  body('title').trim().notEmpty(),
  body('description').trim().optional(),
  body('requiredSkills').isArray().optional(),
  body('minExperience').isInt({ min: 0 }).optional(),
  body('maxExperience').isInt({ min: 0 }).optional(),
  body('salaryMin').isInt({ min: 0 }).optional(),
  body('salaryMax').isInt({ min: 0 }).optional(),
  body('headcount').isInt({ min: 1 }).optional(),
  body('department').trim().optional(),
  body('location').trim().optional(),
  body('contractType').isIn(['PERMANENT','CONTRACT','FREELANCE','INTERNSHIP']).optional(),
  body('candidateType').isIn(['LOCAL','EXPAT','FOREIGNER_RELOCATE','ANY']).optional(),
  body('clientId').notEmpty().withMessage('Client is required').isString().trim(),
  body('clientName').optional({ nullable: true }).trim(),
  body('salaryCurrency').optional().trim(),
  body('salaryFrequency').optional().trim(),
  body('contractDuration').optional({ nullable: true }).trim(),
  body('targetCvSubmissions').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('shareJdWithClient').optional({ nullable: true }).isBoolean(),
  body('slaTargetDays').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('targetSubmissionDate')
    .notEmpty()
    .withMessage('Target submission date is required for client-linked requirements')
    .isISO8601(),
  body('jobReceivedDate')
    .notEmpty()
    .withMessage('JD received date is required for client-linked requirements')
    .isISO8601(),
  body('priority').optional({ nullable: true }).isIn(['HIGH', 'URGENT', 'MEDIUM', 'LOW']),
  body('assignedRecruiters').isArray().optional(),
  body('salesOwnerId').optional({ nullable: true, checkFalsy: true }).isString().trim(),
], jobController.createJob);

// Get all jobs
router.get('/', jobController.getJobs);

// Get job by ID
router.get('/:id', jobController.getJobById);

// Update job
router.put('/:id', authorize('ADMIN', 'RECRUITMENT_MANAGER', 'SALES_MANAGER', 'SALES_EXEC'), [
  body('title').trim().optional(),
  body('description').trim().optional(),
  body('requiredSkills').isArray().optional(),
  body('minExperience').isInt({ min: 0 }).optional(),
  body('maxExperience').isInt({ min: 0 }).optional(),
  body('salaryMin').isInt({ min: 0 }).optional(),
  body('salaryMax').isInt({ min: 0 }).optional(),
  body('headcount').isInt({ min: 1 }).optional(),
  body('contractType').isIn(['PERMANENT','CONTRACT','FREELANCE','INTERNSHIP']).optional(),
  body('candidateType').isIn(['LOCAL','EXPAT','FOREIGNER_RELOCATE','ANY']).optional(),
  body('clientId').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('clientName').optional({ nullable: true }).trim(),
  body('salaryCurrency').optional().trim(),
  body('salaryFrequency').optional().trim(),
  body('contractDuration').optional({ nullable: true }).trim(),
  body('targetCvSubmissions').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('shareJdWithClient').optional({ nullable: true }).isBoolean(),
  body('slaTargetDays').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('targetSubmissionDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('jobReceivedDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('priority').optional({ nullable: true }).isIn(['HIGH', 'URGENT', 'MEDIUM', 'LOW']),
  body('assignedRecruiters').isArray().optional(),
  body('salesOwnerId').optional({ nullable: true, checkFalsy: true }).isString().trim(),
], jobController.updateJob);

// Close job
router.patch('/:id/close', jobController.closeJob);

// Get Boolean search string for a job
router.get('/:id/boolean', jobController.getJobBoolean);

// Delete job
router.delete('/:id', jobController.deleteJob);

module.exports = router;
