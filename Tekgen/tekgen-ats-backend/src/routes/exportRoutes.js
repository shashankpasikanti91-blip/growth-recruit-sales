/**
 * Export Routes
 * Routes for exporting candidates, jobs, and analytics
 */

const express = require('express');
const router = express.Router();
const { query, param, body } = require('express-validator');
const auth = require('../middleware/auth');
const exportController = require('../controllers/exportController');

/**
 * GET /api/export/candidates/csv
 * Export candidates to CSV
 * Query params: status, search
 */
router.get(
  '/candidates/csv',
  auth.authenticate,
  query('status').optional().isString(),
  query('search').optional().isString(),
  exportController.exportCandidatesCSV
);

/**
 * GET /api/export/jobs/csv
 * Export jobs to CSV
 * Query params: status
 */
router.get(
  '/jobs/csv',
  auth.authenticate,
  query('status').optional().isString(),
  exportController.exportJobsCSV
);

/**
 * GET /api/export/screenings/csv
 * Export screenings to CSV
 */
router.get(
  '/screenings/csv',
  auth.authenticate,
  exportController.exportScreeningsCSV
);

/**
 * POST /api/export/analytics/pdf
 * Generate analytics report PDF
 * Body: { analytics: {...} }
 */
router.post(
  '/analytics/pdf',
  auth.authenticate,
  body('analytics').optional().isObject(),
  exportController.generateAnalyticsReportPDF
);

/**
 * GET /api/export/candidates/:candidateId/pdf
 * Generate candidate profile PDF
 */
router.get(
  '/candidates/:candidateId/pdf',
  auth.authenticate,
  param('candidateId').isString(),
  exportController.generateCandidateProfilePDF
);

/**
 * POST /api/export/cleanup
 * Clean up old export files (Admin only)
 */
router.post(
  '/cleanup',
  auth.authenticate,
  auth.authorize('ADMIN'),
  exportController.cleanupOldExports
);

module.exports = router;
