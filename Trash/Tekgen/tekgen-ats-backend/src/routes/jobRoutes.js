const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const jobController = require('../controllers/jobController');
const multer = require('multer');
const prisma = require('../config/database');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// Parse job description from file
router.post('/parse-file', upload.single('file'), jobController.parseJobDescriptionFile);

// Parse job description from text
router.post('/parse-text', [
  body('text').trim().notEmpty(),
], jobController.parseJobDescriptionText);

// Create job
router.post('/', [
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
  body('assignedRecruiters').isArray().optional(),
], jobController.createJob);

// Get all jobs
router.get('/', jobController.getJobs);

// Get job by ID
router.get('/:id', jobController.getJobById);

// Update job
router.put('/:id', [
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
  body('assignedRecruiters').isArray().optional(),
], jobController.updateJob);

// Close job
router.patch('/:id/close', jobController.closeJob);

// Get Boolean search string for a job
router.get('/:id/boolean', jobController.getJobBoolean);

// Delete job
router.delete('/:id', jobController.deleteJob);

module.exports = router;
